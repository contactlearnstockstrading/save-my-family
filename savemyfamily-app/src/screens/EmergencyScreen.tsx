import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { VolumeX, PhoneCall, CheckCircle } from 'lucide-react-native';
import { locationService, Coordinates } from '../services/locationService';
import { soundService } from '../services/soundService';
import { socketService, LocationPayload } from '../services/socketService';

const COLORS = {
  background: '#0F172A',
  card: '#1E293B',
  primary: '#EF4444',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  accent: '#10B981',
  border: '#334155'
};

export default function EmergencyScreen({ route, navigation }: any) {
  const { sessionId, initialCoords } = route.params;

  const [victimCoords, setVictimCoords] = useState<Coordinates>(initialCoords);
  const [responders, setResponders] = useState<{ [id: string]: { name: string; coords: Coordinates } }>({});
  const [sirenPlaying, setSirenPlaying] = useState(true);
  const [sendingAlert, setSendingAlert] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const mockUserId = 'user_dummy_india_victim_001';
  const mockUserName = 'Priya Sharma';

  useEffect(() => {
    // 1. Instantly trigger the loud hardware siren sound
    soundService.playSiren();

    // 2. Connect to WebSocket session for real-time peer communications
    socketService.connect(sessionId, handleIncomingWebsocket);

    // 3. Keep updating live location coordinates
    startLocationWatch();

    // Simulate sending network alert completion
    const timer = setTimeout(() => {
      setSendingAlert(false);
    }, 2000);

    return () => {
      // Cleanup: Turn off sirens, coordinates watches, and sockets when screen unmounts
      soundService.stopSiren();
      socketService.disconnect();
      if (watchIdRef.current !== null) {
        locationService.clearWatch(watchIdRef.current);
      }
      clearTimeout(timer);
    };
  }, []);

  const startLocationWatch = () => {
    const watchId = locationService.watchLocation(
      async (newCoords) => {
        setVictimCoords(newCoords);

        // Update REST API coordinates
        try {
          await fetch(`http://localhost:8081/api/sos/${sessionId}/location?longitude=${newCoords.longitude}&latitude=${newCoords.latitude}`, {
            method: 'PUT'
          });
        } catch (e) {
          console.log('Failed to update live coordinates on REST server:', e);
        }

        // Stream coordinate changes over socket to active volunteers
        socketService.sendLocation({
          type: 'LOCATION_UPDATE',
          sessionId,
          senderId: mockUserId,
          senderName: mockUserName,
          latitude: newCoords.latitude,
          longitude: newCoords.longitude,
          role: 'VICTIM'
        });
      },
      (err) => {
        console.warn('Coordinates watch failed:', err);
      }
    );
    watchIdRef.current = watchId;
  };

  const handleIncomingWebsocket = (payload: LocationPayload) => {
    // Check if the message is from a volunteer accepted or volunteer coordinate update
    if (payload.role === 'VOLUNTEER') {
      if (payload.type === 'LOCATION_UPDATE') {
        setResponders((prev) => ({
          ...prev,
          [payload.senderId]: {
            name: payload.senderName,
            coords: { latitude: payload.latitude, longitude: payload.longitude }
          }
        }));
      }
    }
  };

  const toggleSiren = () => {
    if (sirenPlaying) {
      soundService.stopSiren();
    } else {
      soundService.playSiren();
    }
    setSirenPlaying(!sirenPlaying);
  };

  const deactivateSOS = () => {
    Alert.alert(
      'Deactivate Emergency Alert',
      'Are you safe? This will stop all sirens and inform mapped responders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I am Safe',
          onPress: async () => {
            try {
              // Inform responders via websocket
              socketService.sendLocation({
                type: 'ALERT_CANCELLED',
                sessionId,
                senderId: mockUserId,
                senderName: mockUserName,
                latitude: victimCoords.latitude,
                longitude: victimCoords.longitude,
                role: 'VICTIM'
              });

              // Terminate active session
              await fetch(`http://localhost:8081/api/sos/${sessionId}/end`, {
                method: 'POST'
              });
            } catch (err) {
              console.log('Could not cleanly terminate session on server:', err);
            }
            navigation.popToTop();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Upper Status Panel */}
      <View style={styles.threatHeader}>
        <View style={styles.pulseContainer}>
          <View style={styles.pulseDot} />
          <Text style={styles.threatTitle}>EMERGENCY ALARM ACTIVE</Text>
        </View>
        <Text style={styles.threatSubtitle}>
          {sendingAlert 
            ? 'Sending SOS alerts to network...' 
            : 'SMS alerts sent to Family. 10 nearest Responders notified.'}
        </Text>
      </View>

      {/* Live tracking Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: victimCoords.latitude,
            longitude: victimCoords.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008
          }}
        >
          {/* Victim marker */}
          <Marker
            coordinate={victimCoords}
            title="You (Distress Signal)"
            pinColor={COLORS.primary}
          />

          {/* Volunteer responders markers */}
          {Object.keys(responders).map((key) => (
            <Marker
              key={key}
              coordinate={responders[key].coords}
              title={`${responders[key].name} (Voluntary Helper)`}
              pinColor={COLORS.accent}
            />
          ))}
        </MapView>

        {sendingAlert && (
          <View style={styles.mapOverlayLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Connecting emergency GPS streams...</Text>
          </View>
        )}
      </View>

      {/* Active Responders List */}
      <View style={styles.respondersPanel}>
        <Text style={styles.panelTitle}>Active Volunteers Coming to Help</Text>
        {Object.keys(responders).length === 0 ? (
          <View style={styles.emptyResponders}>
            <ActivityIndicator color={COLORS.textMuted} size="small" style={{ marginRight: 10 }} />
            <Text style={styles.emptyRespondersText}>Waiting for nearby volunteers to accept...</Text>
          </View>
        ) : (
          Object.keys(responders).map((key) => (
            <View key={key} style={styles.responderRow}>
              <CheckCircle color={COLORS.accent} size={18} />
              <Text style={styles.responderName}>{responders[key].name} is on the way</Text>
              <TouchableOpacity style={styles.callButton}>
                <PhoneCall color={COLORS.text} size={14} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* SOS Control Actions Footer */}
      <View style={styles.actionFooter}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.sirenBtn]} 
          onPress={toggleSiren}
        >
          <VolumeX color={COLORS.text} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.actionBtnText}>{sirenPlaying ? 'Mute Siren' : 'Play Siren'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.safeBtn]} 
          onPress={deactivateSOS}
        >
          <Text style={styles.actionBtnText}>I am Safe (Deactivate)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  threatHeader: {
    padding: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderBottomWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)'
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginRight: 10
  },
  threatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Inter-Bold',
    letterSpacing: 1
  },
  threatSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16
  },
  mapContainer: {
    flex: 1,
    position: 'relative'
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  mapOverlayLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 10
  },
  respondersPanel: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: 18
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12
  },
  emptyResponders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10
  },
  emptyRespondersText: {
    color: COLORS.textMuted,
    fontSize: 13
  },
  responderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  responderName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    marginLeft: 10,
    fontWeight: '500'
  },
  callButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionFooter: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between'
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },
  sirenBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  safeBtn: {
    backgroundColor: COLORS.accent
  },
  actionBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold'
  }
});
