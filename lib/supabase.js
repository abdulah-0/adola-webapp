// Supabase Configuration for Adola App
// Following requirements document: Migration from Firebase to Supabase
// Project ID: ltxxtuugfunyybsowknv

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Supabase Configuration - Using the correct project
const supabaseUrl = 'https://ltxxtuugfunyybsowknv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0eHh0dXVnZnVueXlic293a252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTM0NTgsImV4cCI6MjA2Nzk4OTQ1OH0.I2wMZHvTb-NBk3HQRl8tmgLHziE67008MMc7ubVuIl8';

// Verify we're using the correct project
if (!supabaseUrl.includes('ltxxtuugfunyybsowknv')) {
  throw new Error('Incorrect Supabase project configuration');
}

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
    
    return true;
  } catch (error) {
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
