// Clear AsyncStorage to remove invalid stored user
// Run this in your React Native app to clear stored authentication data

import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearStoredAuth = async () => {
  try {
    await AsyncStorage.multiRemove(['user', 'authToken']);
    console.log('✅ Cleared stored authentication data');
    return true;
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
    return false;
  }
};

// You can also call this directly in your app's initialization
// or add a button in your settings to clear storage
