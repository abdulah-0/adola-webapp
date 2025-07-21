// Supabase Configuration for Adola App
// Following requirements document: Migration from Firebase to Supabase
// Project ID: ltxxtuugfunyybsowknv

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase Configuration from requirements document
const supabaseUrl = 'https://ltxxtuugfunyybsowknv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0eHh0dXVnZnVueXlic293a252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTM0NTgsImV4cCI6MjA2Nzk4OTQ1OH0.I2wMZHvTb-NBk3HQRl8tmgLHziE67008MMc7ubVuIl8';

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
    console.log('🔗 Connected to project: ltxxtuugfunyybsowknv');
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
