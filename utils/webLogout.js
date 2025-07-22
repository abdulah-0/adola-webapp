// Simple web logout utility
// This bypasses all the complex mobile logic and does a direct web logout

export const webLogout = async () => {
  console.log('🌐 Starting web logout...');
  
  try {
    // Step 1: Clear localStorage
    console.log('🧹 Clearing localStorage...');
    if (typeof window !== 'undefined') {
      // Clear all Supabase related items
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('user'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('✅ Cleared localStorage items:', keysToRemove);
    }

    // Step 2: Call Supabase signOut directly
    console.log('🔐 Calling Supabase signOut...');
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Supabase signOut error:', error);
    } else {
      console.log('✅ Supabase signOut successful');
    }

    // Step 3: Clear any remaining session data
    console.log('🧹 Final cleanup...');
    if (typeof window !== 'undefined') {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ All storage cleared');
    }

    // Step 4: Force redirect
    console.log('🔄 Redirecting to login...');
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }

    return true;
  } catch (error) {
    console.error('❌ Web logout failed:', error);
    
    // Even if logout fails, clear storage and redirect
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth/login';
    }
    
    return false;
  }
};
