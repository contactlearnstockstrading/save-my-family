import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Shield, Users, Settings, AlertTriangle } from 'lucide-react-native';
import { locationService } from '../services/locationService';
import { useUser } from '../context/UserContext';

// Theme constants
const COLORS = {
  background: '#0F172A', // Slate 900
  card: '#1E293B',       // Slate 800
  primary: '#EF4444',    // Ruby Red
  primaryGlow: 'rgba(239, 68, 68, 0.25)',
  text: '#F8FAFC',       // Slate 50
  textMuted: '#94A3B8',  // Slate 400
  accent: '#10B981',     // Emerald Green
  border: '#334155'      // Slate 700
};

export default function HomeScreen({ navigation }: any) {
  const { user } = useUser();
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationPermissions, setLocationPermissions] = useState(false);
  const [contactsCount, setContactsCount] = useState(0);

  useEffect(() => {
    bootstrapPermissions();
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const bootstrapPermissions = async () => {
    const granted = await locationService.requestLocationPermissions();
    setLocationPermissions(granted);
    if (!granted) {
      Alert.alert(
        'Permissions Required',
        'Fine and background location permissions are required to scan for helpers and alert volunteers.'
      );
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const response = await fetch(`http://localhost:8081/api/users/${user.id}`);
      if (response.ok) {
        const dbUser = await response.json();
        setIsVolunteer(dbUser.role === 'VOLUNTEER' || dbUser.role === 'BOTH');
        setContactsCount(dbUser.trustedContacts?.length || 0);
      }
    } catch (e) {
      console.log('Unable to connect to backend user API. Operating in local mode.', e);
    }
  };

  const toggleVolunteer = async (value: boolean) => {
    if (!user) return;
    setIsVolunteer(value);
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/api/users/${user.id}/volunteer-status?isAvailable=${value}&role=${value ? 'BOTH' : 'USER'}`, {
        method: 'PUT'
      });
      if (!response.ok) {
        setIsVolunteer(!value); // Rollback
        Alert.alert('Status Sync Failed', 'Check server connection.');
      }
    } catch (err) {
      setIsVolunteer(!value); // Rollback
      Alert.alert('Network Error', 'Backend server is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleSOSTrigger = async () => {
    if (!user) return;
    if (!locationPermissions) {
      const granted = await locationService.requestLocationPermissions();
      if (!granted) return;
    }

    setLoading(true);
    try {
      const coords = await locationService.getCurrentLocation();
      const response = await fetch(`http://localhost:8081/api/sos/trigger?victimId=${user.id}&longitude=${coords.longitude}&latitude=${coords.latitude}`, {
        method: 'POST'
      });

      if (response.ok) {
        const session = await response.json();
        navigation.navigate('Emergency', { sessionId: session.id, initialCoords: coords });
      } else {
        Alert.alert('SOS Error', 'Could not activate safety alert. Check backend.');
      }
    } catch (err) {
      Alert.alert('Network Timeout', 'Make sure Spring Boot backend is active.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.username}>{user?.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Setup')}
        >
          <Settings color={COLORS.text} size={22} />
        </TouchableOpacity>
      </View>

      {/* Main SOS Trigger Circle */}
      <View style={styles.centerPanel}>
        <TouchableOpacity
          style={styles.sosOuterGlow}
          activeOpacity={0.8}
          onLongPress={handleSOSTrigger}
          delayLongPress={1500} // Require holding for 1.5s to prevent false alerts
        >
          <View style={styles.sosButton}>
            <Shield color={COLORS.text} size={64} style={styles.shieldIcon} />
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosPrompt}>HOLD FOR 1.5s</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.alarmStatus}>
          {loading ? 'Activating Emergency services...' : 'System status: Armed & Secure'}
        </Text>
      </View>

      {/* Control Cards */}
      <View style={styles.bottomCardContainer}>
        {/* Contacts Checklist Panel */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('Setup')}
        >
          <Users color={contactsCount > 0 ? COLORS.accent : COLORS.primary} size={24} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Trusted Family Members</Text>
            <Text style={styles.cardSubtitle}>
              {contactsCount > 0 
                ? `${contactsCount} Contacts mapped. Ready to receive alert SMS.`
                : '⚠️ No family contacts added yet! Click to configure.'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Volunteer Toggle Panel */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            {loading ? (
              <ActivityIndicator color={COLORS.accent} />
            ) : (
              <Shield color={isVolunteer ? COLORS.accent : COLORS.textMuted} size={24} />
            )}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Voluntary Responder Network</Text>
            <Text style={styles.cardSubtitle}>
              Receive alarms from nearby girls & women in distress to offer local assistance.
            </Text>
          </View>
          <Switch
            value={isVolunteer}
            onValueChange={toggleVolunteer}
            trackColor={{ false: COLORS.border, true: COLORS.accent }}
            thumbColor={COLORS.text}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontFamily: 'Inter-Medium'
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'Inter-Bold'
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  centerPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sosOuterGlow: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10
  },
  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  shieldIcon: {
    marginBottom: 10
  },
  sosText: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
    fontFamily: 'Inter-ExtraBold'
  },
  sosPrompt: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginTop: 5,
    letterSpacing: 1
  },
  alarmStatus: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 30,
    fontFamily: 'Inter-Medium'
  },
  bottomCardContainer: {
    marginBottom: 30
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardInfo: {
    flex: 1,
    marginLeft: 15,
    marginRight: 10
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 3
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16
  }
});
