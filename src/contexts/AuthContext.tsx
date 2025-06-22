import { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';
import { checkIfUserIsDriver, getCurrentUserProfile } from '../lib/api/user';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  latitude?: number;
  longitude?: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isDriver: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkUserInDatabase = async () => {
    try {
      console.log('Checking user in database...');
      const userData = await getCurrentUserProfile();
      console.log('User data from database:', userData);
      setUser(userData);
      
      // Check if user is a driver
      if (userData?.phoneNumber) {
        const driverStatus = await checkIfUserIsDriver(userData.phoneNumber);
        setIsDriver(driverStatus);
        console.log('User is driver:', driverStatus);
      } else {
        setIsDriver(false);
      }
    } catch (error) {
      console.error('Error checking user in database:', error);
      setUser(null);
      setIsDriver(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (session) {
      console.log('Refreshing user data...');
      await checkUserInDatabase();
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Initializing...');
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session:', session ? 'exists' : 'none');
      setSession(session);
      if (session) {
        checkUserInDatabase();
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state change:', event, session ? 'session exists' : 'no session');
      setSession(session);
      if (session) {
        await checkUserInDatabase();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    session,
    user,
    isDriver,
    loading,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};