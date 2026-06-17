import React, { createContext, useState, useContext, useEffect } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  phoneNumber: string;
  role: 'USER' | 'VOLUNTEER' | 'BOTH';
}

interface UserContextType {
  user: UserProfile | null;
  registerAndLogin: (profile: UserProfile) => void;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated check of local storage (e.g. AsyncStorage)
    // For testing/sandbox, we start with null to force the registration UI
    setUser(null);
    setLoading(false);
  }, []);

  const registerAndLogin = (profile: UserProfile) => {
    setUser(profile);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, registerAndLogin, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
