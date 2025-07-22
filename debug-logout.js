// Debug script for logout functionality
// Run this in browser console to test logout

console.log('🔍 Testing logout functionality...');

// Test 1: Check if Supabase is available
if (window.supabase) {
  console.log('✅ Supabase client found');
} else {
  console.log('❌ Supabase client not found');
}

// Test 2: Check current session
async function checkSession() {
  try {
    const { data: { session }, error } = await window.supabase.auth.getSession();
    if (error) {
      console.log('❌ Session check error:', error);
    } else {
      console.log('📋 Current session:', session ? 'Active' : 'None');
    }
  } catch (error) {
    console.log('❌ Session check failed:', error);
  }
}

// Test 3: Test logout
async function testLogout() {
  try {
    console.log('🔄 Testing logout...');
    const { error } = await window.supabase.auth.signOut();
    if (error) {
      console.log('❌ Logout error:', error);
    } else {
      console.log('✅ Logout successful');
    }
  } catch (error) {
    console.log('❌ Logout failed:', error);
  }
}

// Test 4: Check localStorage
function checkStorage() {
  console.log('📦 LocalStorage items:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('supabase')) {
      console.log(`  ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
    }
  }
}

// Run tests
checkSession();
checkStorage();

console.log('🔧 To test logout manually, run: testLogout()');
