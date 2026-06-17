import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Linking,
  Platform,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Navigation, ShieldAlert, Check } from 'lucide-react-native';
import { locationService, Coordinates } from '../services/locationService';
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

export default function VolunteerScreen({ route, navigation }: any) {
  const { sessionId } = route.params;

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [victimName, setVictimName] = useState('Distress Alert');
  const [victimPhone, setVictimPhone] = useState('');
  const [victimCoords, setVictimCoords] = useState<Coordinates | null>(null);
  const [volunteerCoords, setVolunteerCoords] = useState<Coordinates | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Mock volunteer user details
  const mockVolunteerId = 'user_dummy_india_volunteer_002';
  const mockVolunteerName = 'Rohan Kumar';

  useEffect(() => {
    fetchSessionDetails();

    return () => {
      socketService.disconnect();
      if (watchIdRef.current !== null) {
        locationService.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const fetchSessionDetails = async () => {
    try {
      const response = await fetch(`http://localhost:8081/api/sos/${sessionId}`);
      if (response.ok) {
        const session = await response.json();
        setVictimName(session.victimName);
        setVictimPhone(session.victimPhone);
        setVictimCoords({
          latitude: session.currentLocation.coordinates[1],
          longitude: session.currentLocation.coordinates[0]
        });
        
        // Grab volunteer's initial location
        const initialVolCoords = await locationService.getCurrentLocation();
        setVolunteerCoords(initialVolCoords);
      } else {
        Alert.alert('Alert Expired', 'This safety alarm is no longer active.');
        navigation.goBack();
      }
    } catch (e) {
      console.log('Error pulling active alarm specs:', e);
    } finally {
      setLoading(false);
    }
  };

  const acceptEmergency = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/api/sos/${sessionId}/accept?volunteerId=${mockVolunteerId}`, {
        method: 'POST'
      });

      if (response.ok) {
        setAccepted(true);
        
        // Connect to real-time WebSocket sync channel
        socketService.connect(sessionId, handleIncomingWebsocket);

        // Start location tracking watch on the volunteer
        startVolunteerLocationWatch();
      } else {
        Alert.alert('Error', 'Unable to accept safety request.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Spring Boot backend is not responding.');
    } finally {
      setLoading(false);
    }
  };

  const startVolunteerLocationWatch = () => {
    const watchId = locationService.watchLocation(
      (newCoords) => {
        setVolunteerCoords(newCoords);

        // Update REST API coordinates
        fetch(`http://localhost:8081/api/users/${mockVolunteerId}/location?longitude=${newCoords.longitude}&latitude=${newCoords.latitude}`, {
          method: 'PUT'
        });

        // Broadcast volunteer position updates via websocket so the victim sees progress
        socketService.sendLocation({
          type: 'LOCATION_UPDATE',
          sessionId,
          senderId: mockVolunteerId,
          senderName: mockVolunteerName,
          latitude: newCoords.latitude,
          longitude: newCoords.longitude,
          role: 'VOLUNTEER'
        });
      },
      (err) => {
        console.warn('Volunteer tracking failed:', err);
      }
    );
    watchIdRef.current = watchId;
  };

  const handleIncomingWebsocket = (payload: LocationPayload) => {
    if (payload.role === 'VICTIM') {
      if (payload.type === 'LOCATION_UPDATE') {
        // Victim moved, update their marker
        setVictimCoords({ latitude: payload.latitude, longitude: payload.longitude });
      } else if (payload.type === 'ALERT_CANCELLED') {
        Alert.alert(
          'Victim is Safe',
          'The victim has resolved the threat and is safe. Thank you for answering the alert!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  };

  const openExternalNavigation = () => {
    if (!victimCoords) return;
    const url = Platform.select({
      ios: `maps://app?saddr=${volunteerCoords?.latitude},${volunteerCoords?.longitude}&daddr=${victimCoords.latitude},${victimCoords.longitude}`,
      android: `google.navigation:q=${victimCoords.latitude},${victimCoords.longitude}&mode=d`
    });

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Navigation Error', 'Unable to launch maps routing app.');
        }
      });
    }
  };

  if (loading && !accepted) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading alert details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Detail header */}
      <View style={styles.banner}>
        <ShieldAlert color={COLORS.primary} size={28} />
        <View style={styles.bannerInfo}>
          <Text style={styles.victimName}>{victimName} is in danger!</Text>
          <Text style={styles.distanceText}>
            {accepted ? 'Connected to live coordinates feed' : 'Volunteers requested in your area'}
          </Text>
        </View>
      </View>

      {/* Map view (conditional rendering) */}
      <View style={styles.mapContainer}>
        {victimCoords && volunteerCoords ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: (victimCoords.latitude + volunteerCoords.latitude) / 2,
              longitude: (victimCoords.longitude + volunteerCoords.longitude) / 2,
              latitudeDelta: Math.abs(victimCoords.latitude - volunteerCoords.latitude) * 1.5 || 0.01,
              longitudeDelta: Math.abs(victimCoords.longitude - volunteerCoords.longitude) * 1.5 || 0.01
            }}
          >
            {/* Victim marker */}
            <Marker
              coordinate={victimCoords}
              title={`${victimName} (Distress)`}
              pinColor={COLORS.primary}
            />

            {/* Volunteer marker */}
            <Marker
              coordinate={volunteerCoords}
              title="You (Responder)"
              pinColor={COLORS.accent}
            />

            {/* Line connecting victim and volunteer */}
            <Polyline
              coordinates={[volunteerCoords, victimCoords]}
              strokeColor={COLORS.primary}
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          </MapView>
        ) : (
          <View style={styles.mapFallback}>
            <ActivityIndicator color={COLORS.textMuted} />
            <Text style={styles.fallbackText}>Acquiring GPS tracking streams...</Text>
          </View>
        )}
      </View>

      {/* Accept / Control Footer Panel */}
      <View style={styles.footer}>
        {!accepted ? (
          <View style={styles.promptPanel}>
            <Text style={styles.promptTitle}>Can you reach this location quickly?</Text>
            <Text style={styles.promptSubtitle}>
              By accepting, your active location will be shared with the sender as you head over to support them.
            </Text>
            
            <View style={styles.btnRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.btnText}>Decline</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={acceptEmergency}
              >
                <Text style={styles.btnText}>Accept & Rescue</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.activePanel}>
            <View style={styles.statusRow}>
              <Check color={COLORS.accent} size={20} />
              <Text style={styles.activeStatusText}>Alert Accepted. Heading to location...</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.navRouterBtn}
              onPress={openExternalNavigation}
            >
              <Navigation color={COLORS.text} size={20} style={{ marginRight: 8 }} />
              <Text style={styles.navRouterText}>Open Maps Navigation</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.callContactBtn}
              onPress={() => Linking.openURL(`tel:${victimPhone}`)}
            >
              <Text style={styles.callContactText}>Call Victim ({victimPhone})</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 10
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border
  },
  bannerInfo: {
    marginLeft: 15,
    flex: 1
  },
  victimName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  mapContainer: {
    flex: 1
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  mapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  fallbackText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 10
  },
  footer: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: 18
  },
  promptPanel: {
    alignItems: 'center'
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 5
  },
  promptSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },
  declineBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  acceptBtn: {
    backgroundColor: COLORS.primary
  },
  btnText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14
  },
  activePanel: {
    alignItems: 'stretch'
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15
  },
  activeStatusText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8
  },
  navRouterBtn: {
    backgroundColor: COLORS.accent,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  navRouterText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14
  },
  callContactBtn: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  callContactText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600'
  }
});
