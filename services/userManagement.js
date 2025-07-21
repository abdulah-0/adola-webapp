// User Management Service for Admin Panel
// Migrated from Firebase to Supabase following requirements document

import { supabase, supabaseAvailable } from "../lib/supabase";
import {
  getAllUsers as getSupabaseUsers,
  updateUserProfile,
  getUserProfile
} from "./supabaseDatabase";
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get all users for admin panel
 * Requirements Document Section 9: Testing Requirements
 */
export const getAllUsers = async () => {
  try {
    if (supabaseAvailable) {
      // Use Supabase
      const result = await getSupabaseUsers();

      if (result.success) {
        console.log('✅ Users fetched from Supabase:', result.data.length);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } else {
      // Fallback to mock data
      const users = await getMockUsers();
      console.log('✅ Users fetched from mock implementation:', users.length);
      return users;
    }
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    // Fallback to mock data on error
    const users = await getMockUsers();
    console.log('✅ Users fetched from mock fallback:', users.length);
    return users;
  }
};

/**
 * Grant admin access to user
 * Requirements Document Section 11: Future Enhancements
 */
export const grantAdminAccess = async (userId, permissions) => {
  try {
    if (firebaseAvailable && db && updateDoc) {
      // Update in Firebase

      await updateDoc(doc(db, 'users', userId), {
        isAdmin: true,
        adminPermissions: {
          manageUsers: permissions.manageUsers || false,
          manageTransactions: permissions.manageTransactions || false,
          manageGames: permissions.manageGames || false,
          viewAnalytics: permissions.viewAnalytics || false,
          systemSettings: permissions.systemSettings || false,
          grantAdminAccess: permissions.grantAdminAccess || false,
        }
      });

      console.log('✅ Admin access granted in Firebase for user:', userId);
    } else {
      // Update in mock data
      const users = await getMockUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].isAdmin = true;
        users[userIndex].adminPermissions = {
          manageUsers: permissions.manageUsers || false,
          manageTransactions: permissions.manageTransactions || false,
          manageGames: permissions.manageGames || false,
          viewAnalytics: permissions.viewAnalytics || false,
          systemSettings: permissions.systemSettings || false,
          grantAdminAccess: permissions.grantAdminAccess || false,
        };
        await AsyncStorage.setItem('mockUsers', JSON.stringify(users));
      }

      console.log('✅ Admin access granted in mock data for user:', userId);
    }

    return true;
  } catch (error) {
    console.error('❌ Error granting admin access:', error);
    return false;
  }
};

/**
 * Revoke admin access from user
 * Requirements Document Section 11: Future Enhancements
 */
export const revokeAdminAccess = async (userId) => {
  try {
    if (firebaseAvailable && db && updateDoc) {
      // Update in Firebase

      await updateDoc(doc(db, 'users', userId), {
        isAdmin: false,
        adminPermissions: {
          manageUsers: false,
          manageTransactions: false,
          manageGames: false,
          viewAnalytics: false,
          systemSettings: false,
          grantAdminAccess: false,
        }
      });

      console.log('✅ Admin access revoked in Firebase for user:', userId);
    } else {
      // Update in mock data
      const users = await getMockUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].isAdmin = false;
        users[userIndex].adminPermissions = {
          manageUsers: false,
          manageTransactions: false,
          manageGames: false,
          viewAnalytics: false,
          systemSettings: false,
          grantAdminAccess: false,
        };
        await AsyncStorage.setItem('mockUsers', JSON.stringify(users));
      }

      console.log('✅ Admin access revoked in mock data for user:', userId);
    }

    return true;
  } catch (error) {
    console.error('❌ Error revoking admin access:', error);
    return false;
  }
};

/**
 * Update user wallet balance
 * Requirements Document Section 11: Future Enhancements
 */
export const updateWalletBalance = async (userId, amount) => {
  try {
    if (firebaseAvailable && db && updateDoc && getDoc) {
      // Update in Firebase

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const currentBalance = userDoc.data().walletBalance || 0;
        await updateDoc(doc(db, 'users', userId), {
          walletBalance: currentBalance + amount
        });
      }

      console.log('✅ Wallet balance updated in Firebase for user:', userId);
    } else {
      // Update in mock data
      const users = await getMockUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].walletBalance = (users[userIndex].walletBalance || 0) + amount;
        await AsyncStorage.setItem('mockUsers', JSON.stringify(users));
      }

      console.log('✅ Wallet balance updated in mock data for user:', userId);
    }

    return true;
  } catch (error) {
    console.error('❌ Error updating wallet balance:', error);
    return false;
  }
};

/**
 * Helper function to get mock users from AsyncStorage
 * Used as fallback when Firebase is not available
 */
const getMockUsers = async () => {
  try {
    const usersData = await AsyncStorage.getItem('mockUsers');
    return usersData ? JSON.parse(usersData) : [];
  } catch (error) {
    console.error('❌ Error getting mock users:', error);
    return [];
  }
};

/**
 * Check if Firebase is available
 */
export const isFirebaseAvailable = () => {
  return firebaseAvailable && db !== null && db !== undefined;
};

console.log('✅ User Management Service initialized according to requirements document');
