import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar
} from 'react-native';
import { Shield, ShieldAlert, Heart, ArrowRight, Check } from 'lucide-react-native';
import { useUser } from '../context/UserContext';

const COLORS = {
  background: '#0F172A',
  card: '#1E293B',
  primary: '#EF4444',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  accent: '#10B981',
  border: '#334155'
};

export default function RegisterScreen() {
  const { registerAndLogin } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<'USER' | 'VOLUNTEER' | 'BOTH'>('BOTH');

  // Step 2 Form States (At least 1 emergency contact)
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleNextStep = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number.');
      return;
    }

    if (selectedRole === 'VOLUNTEER') {
      // If registering only as helper, skip family contact setup and complete
      submitRegistration(null);
    } else {
      setStep(2);
    }
  };

  const handleCompleteRegistration = () => {
    if (!contactName.trim()) {
      Alert.alert('Validation Error', 'Please enter your family contact\'s name.');
      return;
    }
    if (!contactPhone.trim() || contactPhone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid mobile number for your contact.');
      return;
    }

    submitRegistration({ name: contactName, phoneNumber: contactPhone });
  };

  const submitRegistration = async (initialContact: { name: string; phoneNumber: string } | null) => {
    setLoading(true);
    const generatedUserId = 'user_' + Math.random().toString(36).substring(2, 11);

    try {
      // 1. Post registration details to backend
      const regResponse = await fetch('http://localhost:8081/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generatedUserId,
          name,
          phoneNumber: phone,
          role: selectedRole,
          isAvailable: true
        })
      });

      if (!regResponse.ok) {
        throw new Error('Failed to register user details with backend.');
      }

      // 2. Post emergency contact if present
      if (initialContact) {
        const contactResponse = await fetch(`http://localhost:8081/api/users/${generatedUserId}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialContact)
        });

        if (!contactResponse.ok) {
          console.warn('Failed to append initial emergency contact. Retrying later.');
        }
      }

      // 3. Login user locally (triggering navigation update)
      registerAndLogin({
        id: generatedUserId,
        name,
        phoneNumber: phone,
        role: selectedRole
      });

    } catch (err) {
      Alert.alert('Network Error', 'Spring Boot API is not reachable. Check backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Shield color={COLORS.primary} size={40} />
          <Text style={styles.appTitle}>SaveMyFamily</Text>
          <Text style={styles.appSubtitle}>Rapid Neighborhood Emergency Help Network</Text>
        </View>

        {/* Form Container */}
        {step === 1 ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Create Your Safety Account</Text>

            <TextInput
              placeholder="Your Full Name"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              placeholder="Your Phone Number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Select Your Preference</Text>
            
            {/* Roles Selection Cards */}
            <TouchableOpacity 
              style={[
                styles.roleCard, 
                selectedRole === 'BOTH' && styles.roleCardActive
              ]}
              onPress={() => setSelectedRole('BOTH')}
            >
              <View style={styles.roleHeader}>
                <Text style={styles.roleTitle}>Protect & Assist (Recommended)</Text>
                {selectedRole === 'BOTH' && <Check color={COLORS.accent} size={18} />}
              </View>
              <Text style={styles.roleDesc}>
                I want to raise alarms during danger, and I also want to voluntarily help girls/women in distress near me.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.roleCard, 
                selectedRole === 'USER' && styles.roleCardActive
              ]}
              onPress={() => setSelectedRole('USER')}
            >
              <View style={styles.roleHeader}>
                <Text style={styles.roleTitle}>Get Protected</Text>
                {selectedRole === 'USER' && <Check color={COLORS.accent} size={18} />}
              </View>
              <Text style={styles.roleDesc}>
                I only want to be able to raise alarms, alert family, and notify nearby volunteers in emergencies.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.roleCard, 
                selectedRole === 'VOLUNTEER' && styles.roleCardActive
              ]}
              onPress={() => setSelectedRole('VOLUNTEER')}
            >
              <View style={styles.roleHeader}>
                <Text style={styles.roleTitle}>Help Others (Volunteer Only)</Text>
                {selectedRole === 'VOLUNTEER' && <Check color={COLORS.accent} size={18} />}
              </View>
              <Text style={styles.roleDesc}>
                I just want to sign up as a voluntary local responder. I will not need to raise distress alarms myself.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={handleNextStep}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {selectedRole === 'VOLUNTEER' ? 'Complete Sign Up' : 'Next: Mapped Contacts'}
              </Text>
              <ArrowRight color={COLORS.text} size={18} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.alertBanner}>
              <ShieldAlert color={COLORS.primary} size={22} />
              <Text style={styles.alertBannerText}>
                At least one trusted family contact is required to enable distress alerts.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Add Trusted Family Member</Text>
            <Text style={styles.sectionSubtitle}>
              This contact will instantly receive a custom SMS containing your live coordinates when an alarm is raised.
            </Text>

            <TextInput
              placeholder="Family Member Name (e.g. Father, Brother)"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={contactName}
              onChangeText={setContactName}
            />

            <TextInput
              placeholder="Family Member Mobile Number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
            />

            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={handleCompleteRegistration}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <>
                  <Heart color={COLORS.text} size={18} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Activate SaveMyFamily</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryBtn}
              onPress={() => setStep(1)}
              disabled={loading}
            >
              <Text style={styles.secondaryBtnText}>Back to Step 1</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContainer: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'Inter-Bold',
    marginTop: 10
  },
  appSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 5,
    textAlign: 'center',
    fontFamily: 'Inter-Medium'
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center'
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 15
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 5
  },
  roleCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12
  },
  roleCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.04)'
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text
  },
  roleDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15
  },
  primaryBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold'
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 20
  },
  alertBannerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
    lineHeight: 16
  },
  secondaryBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10
  },
  secondaryBtnText: {
    color: COLORS.textMuted,
    fontSize: 14
  }
});
