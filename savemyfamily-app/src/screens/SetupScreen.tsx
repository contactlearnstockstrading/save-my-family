import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { ArrowLeft, UserPlus, Trash2, ShieldAlert } from 'lucide-react-native';
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

interface Contact {
  name: string;
  phoneNumber: string;
}

export default function SetupScreen({ navigation }: any) {
  const { user } = useUser();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/api/users/${user.id}`);
      if (response.ok) {
        const dbUser = await response.json();
        setContacts(dbUser.trustedContacts || []);
      }
    } catch (e) {
      console.log('Unable to pull family contacts from REST backend:', e);
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    if (!user) return;
    if (!name || !phone) {
      Alert.alert('Validation Error', 'Please enter both a name and mobile number.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/api/users/${user.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phoneNumber: phone })
      });

      if (response.ok) {
        const dbUser = await response.json();
        setContacts(dbUser.trustedContacts || []);
        setName('');
        setPhone('');
        Alert.alert('Contact Added', `${name} is successfully mapped as an emergency responder.`);
      } else {
        Alert.alert('Error', 'Failed to save contact.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Backend server is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  const removeContact = async (phoneNumber: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/api/users/${user.id}/contacts?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const dbUser = await response.json();
        setContacts(dbUser.trustedContacts || []);
      } else {
        Alert.alert('Error', 'Failed to remove contact.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Backend server is not reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Row */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Trusted Contacts</Text>
      </View>

      {/* Warning Alert Banner */}
      <View style={styles.banner}>
        <ShieldAlert color={COLORS.primary} size={20} />
        <Text style={styles.bannerText}>
          Ensure numbers are reachable. These contacts will receive an SMS containing your live-tracking link instantly when you trigger an alarm.
        </Text>
      </View>

      {/* Inputs Form */}
      <View style={styles.cardForm}>
        <Text style={styles.sectionHeader}>Add Trusted Family Contact</Text>
        <TextInput
          placeholder="Contact Name (e.g. Mother, Brother)"
          placeholderTextColor={COLORS.textMuted}
          style={styles.inputField}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          placeholder="Mobile Number (e.g. +91 99887 76655)"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
          style={styles.inputField}
          value={phone}
          onChangeText={setPhone}
        />
        
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={addContact}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <>
              <UserPlus color={COLORS.text} size={20} style={{ marginRight: 8 }} />
              <Text style={styles.addBtnText}>Map Contact</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Saved List */}
      <Text style={styles.sectionTitle}>Mapped Emergency Contacts ({contacts.length})</Text>

      {loading && contacts.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.phoneNumber}
          renderItem={({ item }) => (
            <View style={styles.contactCard}>
              <View>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={() => removeContact(item.phoneNumber)}
              >
                <Trash2 color={COLORS.primary} size={18} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text style={styles.emptyText}>No emergency contacts mapped yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 15,
    fontFamily: 'Inter-Bold'
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)'
  },
  bannerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
    lineHeight: 16
  },
  cardForm: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 25
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    fontFamily: 'Inter-SemiBold'
  },
  inputField: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 12
  },
  addBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5
  },
  addBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    fontFamily: 'Inter-SemiBold'
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  contactName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text
  },
  contactPhone: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyView: {
    alignItems: 'center',
    marginTop: 40
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14
  }
});
