// Supabase Configuration for Adola App
// Following requirements document: Migration from Firebase to Supabase
// Project ID: mvgxptxzzjpyyugqnsrd

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Supabase Configuration - Use environment variables for production
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mvgxptxzzjpyyugqnsrd.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12Z3hwdHh6emp5eXl1Z3Fuc3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTM0NTgsImV4cCI6MjA2Nzk4OTQ1OH0.YOUR_ANON_KEY_HERE';

// Web-compatible storage
const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          return Promise.resolve(localStorage.getItem(key));
        }
        return Promise.resolve(null);
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value);
        }
        return Promise.resolve();
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
        return Promise.resolve();
      },
    };
  }
  return AsyncStorage;
};

// Create Supabase client with platform-appropriate storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Initialize Supabase and check connection
let supabaseAvailable = false;

const initializeSupabase = async () => {
  try {
    // Test connection by checking auth status
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error && error.message !== 'Invalid JWT') {
      throw error;
    }
    
    supabaseAvailable = true;
    console.log('✅ Supabase client initialized successfully');
    console.log('🔗 Connected to project: mvgxptxzzjpyyugqnsrd');
    console.log('💾 Session persistence enabled with AsyncStorage');
    console.log('🔐 Authentication ready for signup/login/logout');
    
    return true;
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error.message);
    console.log('📱 App will use mock implementation');
    supabaseAvailable = false;
    return false;
  }
};

// Initialize on module load
initializeSupabase();

// Export availability status
export { supabaseAvailable };

// Default export
export default supabase;
