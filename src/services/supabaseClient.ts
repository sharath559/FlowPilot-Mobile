import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type ExpoExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabasePublishableKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as ExpoExtra;

export const supabaseUrl =
  extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const supabasePublishableKey =
  extra.supabasePublishableKey ||
  extra.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';
export const supabaseAnonKey = supabasePublishableKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl.startsWith('https://') &&
    supabasePublishableKey &&
    supabasePublishableKey !== 'your-publishable-key' &&
    supabasePublishableKey !== 'your-anon-public-key',
);

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const serverStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => undefined,
  removeItem: async (_key: string) => undefined,
};

const isServerRendering = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabasePublishableKey : 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: !isServerRendering,
      detectSessionInUrl: Platform.OS === 'web' && !isServerRendering,
      persistSession: !isServerRendering,
      storage: isServerRendering ? serverStorage : Platform.OS === 'web' ? AsyncStorage : secureStorage,
    },
  },
);
