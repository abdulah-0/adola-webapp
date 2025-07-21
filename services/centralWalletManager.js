// Central Wallet Manager - Ensures wallet balance consistency across the app
// Only specific actions should modify the wallet balance

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, updateWalletBalance as updateSupabaseBalance } from './supabaseDatabase';
import { supabase } from '../lib/supabase';

/**
 * Central Wallet Manager
 * Ensures wallet balance consistency and prevents unauthorized changes
 */
class CentralWalletManager {
  constructor() {
    this.walletData = {};
    this.initialized = false;
  }

  /**
   * Ensure user exists in database - create if missing
   */
  async ensureUserExists(userId) {
    try {
      // Check if user exists
      const userProfileResult = await getUserProfile(userId);
      if (userProfileResult?.success && userProfileResult?.data) {
        return true; // User exists
      }

      // User doesn't exist, create them
      console.log(`🔧 Creating missing user in database: ${userId}`);

      const { error } = await supabase
        .from('users')
        .upsert([{
          id: userId,
          email: `user_${userId.slice(0, 8)}@adola.com`, // Temporary email
          username: `user_${userId.slice(0, 8)}`,
          display_name: `User ${userId.slice(0, 8)}`,
          wallet_balance: 50,
          joined_date: new Date().toISOString(),
          is_online: true,
          email_verified: false,
          level: 1,
          xp: 0,
          games_played: 0,
          total_wins: 0,
          total_losses: 0,
          status: 'online',
          is_admin: false,
          is_super_admin: false,
          last_login_date: new Date().toISOString(),
          registration_bonus: true,
        }], {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ Error creating user:', error);
        return false;
      }

      console.log(`✅ User created in database: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error ensuring user exists:', error);
      return false;
    }
  }

  /**
   * Initialize wallet for a user with proper balance
   */
  async initializeWallet(userId, initialBalance = 50) {
    try {
      // Ensure user exists in database first
      await this.ensureUserExists(userId);

      // Check if wallet already exists in Supabase
      const existingWallet = await this.getWalletBalance(userId);
      if (existingWallet !== null) {
        console.log(`💰 Wallet already exists for user ${userId} with balance: PKR ${existingWallet}`);
        return existingWallet;
      }

      // Update wallet balance in Supabase
      await updateSupabaseBalance(userId, initialBalance);

      console.log(`✅ Wallet initialized for user ${userId} with PKR ${initialBalance} welcome bonus`);
      return initialBalance;
    } catch (error) {
      console.error('❌ Error initializing wallet:', error);
      return 50; // Default fallback
    }
  }

  /**
   * Get current wallet balance (read-only)
   */
  async getWalletBalance(userId) {
    try {
      // Ensure user exists in database first
      await this.ensureUserExists(userId);

      // Get balance directly from Supabase
      const userProfileResult = await getUserProfile(userId);

      if (!userProfileResult?.success || !userProfileResult?.data) {
        return null; // User not found
      }

      const userProfile = userProfileResult.data;
      const balance = Number(userProfile.wallet_balance || 0);
      const validBalance = isNaN(balance) ? 0 : balance;

      console.log(`💰 Wallet loaded for user ${userId}: PKR ${validBalance}`);
      return validBalance;
    } catch (error) {
      console.error('❌ Error getting wallet balance:', error);
      return null;
    }
  }

  /**
   * Update wallet balance - ONLY for authorized actions
   * @param {string} userId - User ID
   * @param {number} amount - Amount to add/subtract
   * @param {string} action - Type of action (bet_win, bet_loss, deposit, withdrawal, referral_bonus, welcome_bonus)
   * @param {string} description - Description of the transaction
   */
  async updateWalletBalance(userId, amount, action, description = '') {
    try {
      // Validate authorized actions
      const authorizedActions = [
        'bet_win',
        'bet_loss',
        'deposit_approved',
        'withdrawal_approved',
        'referral_bonus',
        'welcome_bonus',
        'admin_adjustment'
      ];

      if (!authorizedActions.includes(action)) {
        console.error(`❌ Unauthorized wallet action: ${action}`);
        return false;
      }

      // Ensure user exists in database
      await this.ensureUserExists(userId);

      // Get current balance from Supabase
      const currentBalance = await this.getWalletBalance(userId);
      if (currentBalance === null) {
        console.error(`❌ Could not get balance for user ${userId}`);
        return false;
      }

      let newBalance;

      // Calculate new balance based on action
      switch (action) {
        case 'bet_win':
        case 'deposit_approved':
        case 'referral_bonus':
        case 'welcome_bonus':
        case 'admin_adjustment':
          newBalance = currentBalance + Math.abs(amount);
          break;

        case 'bet_loss':
        case 'withdrawal_approved':
          newBalance = Math.max(0, currentBalance - Math.abs(amount));
          break;

        default:
          console.error(`❌ Unknown action: ${action}`);
          return false;
      }

      // Update balance in Supabase
      await updateSupabaseBalance(userId, newBalance);

      console.log(`💰 Wallet updated for user ${userId}:`, {
        action,
        amount,
        previousBalance: currentBalance,
        newBalance: newBalance,
        description
      });

      return newBalance;
    } catch (error) {
      console.error('❌ Error updating wallet balance:', error);
      return false;
    }
  }

  /**
   * Check if user has sufficient balance for a bet
   */
  async canPlaceBet(userId, betAmount) {
    try {
      const balance = await this.getWalletBalance(userId);
      if (balance === null) {
        return false;
      }
      return balance >= betAmount;
    } catch (error) {
      console.error('❌ Error checking bet eligibility:', error);
      return false;
    }
  }

  /**
   * Process game bet result
   */
  async processGameResult(userId, betAmount, winAmount, gameId, isWin) {
    try {
      if (isWin && winAmount > 0) {
        // Player wins - add winnings
        const newBalance = await this.updateWalletBalance(
          userId,
          winAmount,
          'bet_win',
          `Won PKR ${winAmount.toLocaleString()} in ${gameId}`
        );
        return { success: true, newBalance, action: 'win', amount: winAmount };
      } else {
        // Player loses - subtract bet amount
        const newBalance = await this.updateWalletBalance(
          userId,
          betAmount,
          'bet_loss',
          `Lost PKR ${betAmount.toLocaleString()} in ${gameId}`
        );
        return { success: true, newBalance, action: 'loss', amount: betAmount };
      }
    } catch (error) {
      console.error('❌ Error processing game result:', error);
      return { success: false, error: 'Failed to process game result' };
    }
  }

  /**
   * Get wallet transaction history
   */
  async getTransactionHistory(userId, limit = 50) {
    try {
      await this.loadWalletData();
      
      if (!this.walletData[userId]) {
        return [];
      }

      return this.walletData[userId].transactions
        .slice(-limit)
        .reverse(); // Most recent first
    } catch (error) {
      console.error('❌ Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Load wallet data from storage
   */
  async loadWalletData() {
    try {
      if (this.initialized) return;

      const storedData = await AsyncStorage.getItem('centralWalletData');
      if (storedData) {
        this.walletData = JSON.parse(storedData);
      }
      this.initialized = true;
    } catch (error) {
      console.error('❌ Error loading wallet data:', error);
      this.walletData = {};
      this.initialized = true;
    }
  }

  /**
   * Save wallet data to storage
   */
  async saveWalletData() {
    try {
      await AsyncStorage.setItem('centralWalletData', JSON.stringify(this.walletData));
    } catch (error) {
      console.error('❌ Error saving wallet data:', error);
    }
  }

  /**
   * Reset wallet data (for testing/debugging)
   */
  async resetWalletData() {
    try {
      this.walletData = {};
      await AsyncStorage.removeItem('centralWalletData');
      this.initialized = false;
      console.log('🔄 Wallet data reset');
    } catch (error) {
      console.error('❌ Error resetting wallet data:', error);
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId) {
    try {
      await this.loadWalletData();
      
      if (!this.walletData[userId]) {
        return null;
      }

      const transactions = this.walletData[userId].transactions;
      const wins = transactions.filter(t => t.action === 'bet_win');
      const losses = transactions.filter(t => t.action === 'bet_loss');
      const deposits = transactions.filter(t => t.action === 'deposit_approved');
      const withdrawals = transactions.filter(t => t.action === 'withdrawal_approved');

      return {
        currentBalance: this.walletData[userId].balance,
        totalWins: wins.reduce((sum, t) => sum + t.amount, 0),
        totalLosses: losses.reduce((sum, t) => sum + t.amount, 0),
        totalDeposits: deposits.reduce((sum, t) => sum + t.amount, 0),
        totalWithdrawals: withdrawals.reduce((sum, t) => sum + t.amount, 0),
        gamesPlayed: wins.length + losses.length,
        winRate: wins.length + losses.length > 0 ? (wins.length / (wins.length + losses.length)) * 100 : 0,
        lastUpdated: this.walletData[userId].lastUpdated
      };
    } catch (error) {
      console.error('❌ Error getting wallet stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const centralWalletManager = new CentralWalletManager();

export default centralWalletManager;

// Export convenience functions
export const getWalletBalance = (userId) => centralWalletManager.getWalletBalance(userId);
export const updateWalletBalance = (userId, amount, action, description) => 
  centralWalletManager.updateWalletBalance(userId, amount, action, description);
export const canPlaceBet = (userId, betAmount) => centralWalletManager.canPlaceBet(userId, betAmount);
export const processGameResult = (userId, betAmount, winAmount, gameId, isWin) => 
  centralWalletManager.processGameResult(userId, betAmount, winAmount, gameId, isWin);
export const initializeWallet = (userId, initialBalance) => 
  centralWalletManager.initializeWallet(userId, initialBalance);
export const getTransactionHistory = (userId, limit) => 
  centralWalletManager.getTransactionHistory(userId, limit);
export const getWalletStats = (userId) => centralWalletManager.getWalletStats(userId);

console.log('✅ Central Wallet Manager initialized - Ensures balance consistency');
