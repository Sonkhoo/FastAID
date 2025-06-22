import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'
import { AppState } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gfqlmgtpfwakwzysomuc.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY

// Debug logging to help identify configuration issues
console.log('Supabase Configuration:');
console.log('- URL:', supabaseUrl);
console.log('- API Key:', supabaseAnonKey ? 'Set' : 'Missing');

if (!supabaseAnonKey) {
  console.error('Missing Supabase API key. Please set EXPO_PUBLIC_SUPABASE_API_KEY in your environment variables.');
  console.error('You can get your API key from: https://app.supabase.com/project/_/settings/api');
  throw new Error('Missing Supabase API key environment variable. Please check the console for setup instructions.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
})

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})