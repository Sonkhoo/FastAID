import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from './../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';

interface AuthContextType {
  session: Session | null;
  phone: string;
  isLoading: boolean;
  loginWithOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) router.replace('/(user)');
      else router.replace('/(auth)/SignUp');
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const loginWithOtp = async (phone: string) => {
    console.log('login with otp', phone);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
    setPhone(phone);
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, phone, loginWithOtp, verifyOtp, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};