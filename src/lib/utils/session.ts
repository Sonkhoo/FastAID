import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'sb-session';

export const storeSession = async (session: Session) => {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error storing session:', error);
  }
};

export const getSession = async (): Promise<Session | null> => {
  try {
    const sessionString = await SecureStore.getItemAsync(SESSION_KEY);
    return sessionString ? JSON.parse(sessionString) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

export const removeSession = async () => {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (error) {
    console.error('Error removing session:', error);
  }
};
