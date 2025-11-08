// IMPORTANT: Import URL polyfill first before anything else
import 'react-native-url-polyfill/auto';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// ⚠️ SECURITY NOTE: Credentials are now loaded from .env file
// Never commit .env to Git! Share .env.example instead
// Get credentials from: https://app.supabase.com/project/_/settings/api

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing environment variables!');
  console.error('[Supabase] Make sure .env file exists with SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Create Supabase client with React Native specific configuration
let supabaseInstance: SupabaseClient | null = null;

try {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'atmark-attendance-app',
      },
    },
  });
  console.log('[Supabase] Client initialized successfully');
} catch (error) {
  console.error('[Supabase] Failed to initialize client:', error);
}

export const supabase = supabaseInstance as SupabaseClient;

// Database schema types (match your Supabase tables)
export interface DbClass {
  id: string;
  user_id: string; // UUID from auth.users
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DbStudent {
  id: string;
  class_id: string;
  user_id: string; // UUID from auth.users
  name: string;
  roll_number: string;
  created_at: string;
  updated_at: string;
}

export interface DbAttendance {
  id: string;
  class_id: string;
  student_id: string;
  user_id: string; // UUID from auth.users
  date: string; // ISO date string
  is_present: boolean;
  created_at: string;
  updated_at: string;
}

// Helper to get current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('[Supabase] Error getting user:', error);
    return null;
  }
};

// Test connection to Supabase
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    if (!supabase) {
      console.error('[Supabase] Client not initialized');
      return false;
    }
    
    const { error } = await supabase.from('classes').select('id').limit(1);
    if (error) {
      console.error('[Supabase] Connection test failed:', error.message);
      return false;
    }
    console.log('[Supabase] Connection test successful');
    return true;
  } catch (error: any) {
    console.error('[Supabase] Connection test error:', error?.message || error);
    return false;
  }
};

// Check if Supabase is properly initialized
export const isSupabaseInitialized = (): boolean => {
  return supabase !== null && supabase !== undefined;
};
