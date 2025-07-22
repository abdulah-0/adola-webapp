// Wallet Context - Following Requirements Document
// Implements real-time wallet updates using Supabase channels

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { NewWalletService, WalletBalance, WalletTransaction } from '../services/newWalletService';
import { Transaction } from '../types/walletTypes';
import { useApp } from './AppContext';

interface WalletContextType {
  balance: number;
  isLoading: boolean;
  transactions: Transaction[];
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  canPlaceBet: (amount: number) => boolean;
  createDepositRequest: (amount: number, metadata?: any) => Promise<string | null>;
  createWithdrawalRequest: (amount: number, metadata?: any) => Promise<string | null>;
  approveWithdrawalRequest: (withdrawalId: string, adminId: string) => Promise<boolean>;
  rejectWithdrawalRequest: (withdrawalId: string, adminId: string, reason?: string) => Promise<boolean>;
  placeBet: (amount: number, gameId: string, description?: string) => Promise<boolean>;
  addWinnings: (amount: number, gameId: string, description?: string) => Promise<boolean>;
  applyGameResult: (amount: number, isWin: boolean, gameId: string, description?: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { user } = useApp();
  const [walletState, setWalletState] = useState<{balance: number}>({balance: 0});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Extract balance from state object
  const balance = walletState.balance;

  // Create a Hermes-safe balance update function
  const updateBalance = (newBalance: number) => {
    try {
      setWalletState(prev => ({...prev, balance: newBalance}));
    } catch (error) {
      console.error('❌ Error updating balance:', error);
    }
  };

  // Initialize wallet and set up real-time subscription
  useEffect(() => {
    if (!user?.id) {
      updateBalance(0);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    initializeUserWallet();
    setupRealtimeSubscription();

    return () => {
      // Cleanup subscription
      supabase.removeAllChannels();
    };
  }, [user?.id]);

  const initializeUserWallet = async () => {
    if (!user?.id) return;

    // Skip wallet initialization for invalid test users
    if (user.id === '00000000-0000-0000-0000-000000000001' || user.id.startsWith('guest-')) {
      console.log('⚠️ Skipping wallet initialization for test/guest user');
      updateBalance(user.walletBalance || 50);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Try to get existing balance
      let walletBalance = await NewWalletService.getBalance(user.id);

      // If wallet doesn't exist, initialize it
      if (!walletBalance) {
        console.log('🔧 Initializing wallet for new user...');
        const initResult = await NewWalletService.initializeWallet(user.id, 50);

        if (initResult.success && typeof initResult.new_balance === 'number') {
          updateBalance(initResult.new_balance);
          console.log(`✅ Wallet initialized with PKR ${initResult.new_balance}`);
        } else {
          console.error('❌ Failed to initialize wallet:', initResult.error);
          console.log('⚠️ This might indicate that the new wallet database schema is not set up yet.');
          console.log('📋 Please run the database migration scripts: wallet-schema.sql and wallet-procedures.sql');
          updateBalance(50); // Fallback to default balance
        }
      } else {
        updateBalance(walletBalance.balance);
        console.log(`💰 Wallet loaded: PKR ${walletBalance.balance}`);
      }

      // Load recent transactions
      await refreshTransactions();
    } catch (error) {
      console.error('❌ Error initializing wallet:', error);
      console.log('⚠️ This might indicate that the new wallet database schema is not set up yet.');
      console.log('📋 Please run the database migration scripts: wallet-schema.sql and wallet-procedures.sql');
      updateBalance(50); // Fallback to default balance
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    // Subscribe to wallet balance changes
    const walletChannel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💰 Real-time wallet update:', payload);
          if (payload.new && payload.new.balance !== null && payload.new.balance !== undefined) {
            const newBalance = parseFloat(payload.new.balance.toString()) || 0;
            updateBalance(newBalance);
            console.log(`🔄 Balance updated in real-time: PKR ${newBalance}`);
          } else if (payload.new && payload.new.balance === null) {
            console.error('❌ Received null balance in real-time update, refreshing balance');
            refreshBalance(); // Refresh to get correct balance
          }
        }
      )
      .subscribe();

    // Subscribe to transaction changes (less frequent updates)
    const transactionChannel = supabase
      .channel('transaction-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📝 New transaction added:', payload);
          // Only refresh transactions for new transactions, not all changes
          setTimeout(() => refreshTransactions(), 1000); // Debounce by 1 second
        }
      )
      .subscribe();

    console.log('🔄 Real-time subscriptions established');
  };

  const refreshBalance = async () => {
    if (!user?.id) return;

    try {
      const walletBalance = await NewWalletService.getBalance(user.id);
      if (walletBalance) {
        updateBalance(walletBalance.balance);
        console.log(`🔄 Balance refreshed: PKR ${walletBalance.balance}`);
      }
    } catch (error) {
      console.error('❌ Error refreshing balance:', error);
    }
  };

  const refreshTransactions = async () => {
    if (!user?.id) return;

    try {
      const userTransactions = await NewWalletService.getTransactions(user.id, 20);

      // Map WalletTransaction to Transaction interface with safe date handling
      const mappedTransactions: Transaction[] = userTransactions.map(tx => {
        // Safe date conversion with fallback
        const safeCreateDate = (dateString: string | null | undefined) => {
          try {
            if (!dateString) return new Date();
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? new Date() : date;
          } catch {
            return new Date();
          }
        };

        return {
          id: tx.id,
          userId: tx.user_id,
          type: tx.type as any, // Type mapping
          amount: tx.amount,
          status: tx.status as any, // Status mapping
          description: tx.description || '',
          createdAt: safeCreateDate(tx.created_at), // Safe date conversion
          updatedAt: safeCreateDate(tx.created_at), // Use created_at as fallback
          metadata: tx.metadata || {}
        };
      });

      setTransactions(mappedTransactions);
      console.log(`📝 Loaded ${mappedTransactions.length} transactions`);
    } catch (error) {
      console.error('❌ Error refreshing transactions:', error);
    }
  };

  const canPlaceBet = (amount: number): boolean => {
    return balance >= amount;
  };

  const createDepositRequest = async (amount: number, metadata: any = {}): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      const transactionId = await NewWalletService.createDepositRequest(
        user.id,
        amount,
        metadata,
        `Deposit request for PKR ${amount.toLocaleString()}`
      );

      if (transactionId) {
        console.log(`✅ Deposit request created: ${transactionId}`);
        await refreshTransactions();
      }

      return transactionId;
    } catch (error) {
      console.error('❌ Error creating deposit request:', error);
      return null;
    }
  };

  const createWithdrawalRequest = async (amount: number, metadata: any = {}): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      const transactionId = await NewWalletService.createWithdrawalRequest(
        user.id,
        amount,
        metadata,
        `Withdrawal request for PKR ${amount.toLocaleString()}`
      );

      if (transactionId) {
        console.log(`✅ Withdrawal request created: ${transactionId}`);
        console.log(`💰 PKR ${amount} immediately deducted from balance`);
        // Refresh both balance and transactions to show the immediate deduction
        await refreshBalance();
        await refreshTransactions();
      }

      return transactionId;
    } catch (error) {
      console.error('❌ Error creating withdrawal request:', error);
      return null;
    }
  };

  const approveWithdrawalRequest = async (withdrawalId: string, adminId: string): Promise<boolean> => {
    try {
      const success = await NewWalletService.approveWithdrawalRequest(withdrawalId, adminId);

      if (success) {
        console.log(`✅ Withdrawal request ${withdrawalId} approved`);
        await refreshTransactions();
      }

      return success;
    } catch (error) {
      console.error('❌ Error approving withdrawal request:', error);
      return false;
    }
  };

  const rejectWithdrawalRequest = async (withdrawalId: string, adminId: string, reason?: string): Promise<boolean> => {
    try {
      const success = await NewWalletService.rejectWithdrawalRequest(withdrawalId, adminId, reason);

      if (success) {
        console.log(`✅ Withdrawal request ${withdrawalId} rejected and money returned`);
        // Refresh both balance and transactions to show the refund
        await refreshBalance();
        await refreshTransactions();
      }

      return success;
    } catch (error) {
      console.error('❌ Error rejecting withdrawal request:', error);
      return false;
    }
  };

  const placeBet = async (
    amount: number,
    gameId: string,
    description?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const result = await NewWalletService.applyGameResult(
        user.id,
        amount,
        false, // Always false for bet placement (deduction)
        gameId,
        description || `Bet placed in ${gameId}`
      );

      if (result.success && typeof result.new_balance === 'number') {
        console.log(`🎰 Bet placed: PKR ${amount} in ${gameId}, New balance: PKR ${result.new_balance}`);
        console.log('💡 Skipping direct setBalance call - relying on real-time updates');

        // Skip direct setBalance call to avoid Hermes issues
        // Real-time subscription will update the balance automatically
        await refreshTransactions();
        return true;
      } else {
        console.error('❌ Failed to place bet:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error placing bet:', error);
      return false;
    }
  };

  const addWinnings = async (
    amount: number,
    gameId: string,
    description?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const result = await NewWalletService.applyGameResult(
        user.id,
        amount,
        true, // Always true for winnings (addition)
        gameId,
        description || `Winnings from ${gameId}`
      );

      if (result.success && typeof result.new_balance === 'number') {
        console.log(`🎉 Winnings added: PKR ${amount} from ${gameId}, New balance: PKR ${result.new_balance}`);
        console.log('💡 Skipping direct setBalance call - relying on real-time updates');

        // Skip direct setBalance call to avoid Hermes issues
        // Real-time subscription will update the balance automatically
        await refreshTransactions();
        return true;
      } else {
        console.error('❌ Failed to add winnings:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error adding winnings:', error);
      return false;
    }
  };

  const applyGameResult = async (
    amount: number,
    isWin: boolean,
    gameId: string,
    description?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const result = await NewWalletService.applyGameResult(
        user.id,
        amount,
        isWin,
        gameId,
        description
      );

      if (result.success && typeof result.new_balance === 'number') {
        updateBalance(result.new_balance);
        console.log(`🎮 Game result applied: ${isWin ? 'WIN' : 'LOSS'} PKR ${amount}, New balance: PKR ${result.new_balance}`);
        await refreshTransactions();
        return true;
      } else {
        console.error('❌ Failed to apply game result:', result.error);
        console.log('⚠️ New wallet system not available, using fallback balance update');

        // Fallback: Update balance locally if new system isn't ready
        const currentBalance = balance || 0;
        let newBalance;
        if (isWin) {
          newBalance = currentBalance + amount;
        } else {
          newBalance = Math.max(0, currentBalance - amount);
        }
        updateBalance(newBalance);
        console.log(`🎮 Fallback: Game result applied locally: ${isWin ? 'WIN' : 'LOSS'} PKR ${amount}, New balance: PKR ${newBalance}`);
        return true;
      }
    } catch (error) {
      console.error('❌ Error applying game result:', error);
      console.log('⚠️ Using fallback balance update due to error');

      // Fallback: Update balance locally
      const currentBalance = balance || 0;
      let newBalance;
      if (isWin) {
        newBalance = currentBalance + amount;
      } else {
        newBalance = Math.max(0, currentBalance - amount);
      }
      updateBalance(newBalance);
      console.log(`🎮 Fallback: Game result applied locally: ${isWin ? 'WIN' : 'LOSS'} PKR ${amount}, New balance: PKR ${newBalance}`);
      return true;
    }
  };

  const value: WalletContextType = {
    balance,
    isLoading,
    transactions,
    refreshBalance,
    refreshTransactions,
    canPlaceBet,
    createDepositRequest,
    createWithdrawalRequest,
    approveWithdrawalRequest,
    rejectWithdrawalRequest,
    placeBet,
    addWinnings,
    applyGameResult
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
