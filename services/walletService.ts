// Wallet Service for Adola Gaming Platform - Supabase Integration

import { BankAccount, USDTAccount, PaymentAccount, Transaction, DepositRequest, WithdrawalRequest, WalletState } from '../types/walletTypes';
import { submitDepositRequest, submitWithdrawalRequest, getUserTransactionHistory } from './transactionService.js';
import {
  updateWalletBalance as updateSupabaseBalance,
  getUserProfile,
  createTransaction,
  getUserTransactions
} from './supabaseDatabase';

// Wallet limits and constants
export const WALLET_LIMITS = {
  MIN_DEPOSIT: 300,
  MAX_DEPOSIT: 50000,
  MIN_WITHDRAWAL: 500,
  MAX_WITHDRAWAL: 50000,
  MIN_BET: 10,
  MAX_BET_PERCENTAGE: 0.1, // 10% of balance
  MAX_SINGLE_BET: 5000,
};

// Bank Accounts Configuration
export const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'zarbonics',
    name: 'Account 1',
    accountNumber: '0109000324585986',
    iban: 'PK10UNIL0109000324585986',
    bank: 'United Bank Limited (UBL)',
    isActive: true,
  },
  {
    id: 'zoraz',
    name: 'Account 2',
    accountNumber: '01090003200363376',
    iban: 'PK38UNIL01090003200363376',
    bank: 'United Bank Limited (UBL)',
    isActive: true,
  },
];

// USDT TRC20 Accounts Configuration
export const USDT_ACCOUNTS: USDTAccount[] = [
  {
    id: 'usdt_account_1',
    name: 'USDT Account 1',
    address: 'TCqKH497p5J6Tjc4tafA5m5qmqw54JsYLj',
    network: 'TRC20',
    isActive: true,
    conversionRate: 270, // 270 PKR per 1 USDT
    minDeposit: 5, // Minimum 5 USDT
  },
  {
    id: 'usdt_account_2',
    name: 'USDT Account 2',
    address: 'TMcSyNNPx8zC523MsqqEGAUEwYFHgWN2ap',
    network: 'TRC20',
    isActive: true,
    conversionRate: 270, // 270 PKR per 1 USDT
    minDeposit: 5, // Minimum 5 USDT
  },
];

// Mock wallet data (in production, this would come from Firebase)
let mockWalletData: { [userId: string]: WalletState } = {};

export class WalletService {
  // Get user wallet state
  static async getWalletState(userId: string): Promise<WalletState> {
    try {
      // Get user profile from Supabase
      const userProfileResult = await getUserProfile(userId);
      if (!userProfileResult?.success || !userProfileResult?.data) {
        throw new Error('User not found');
      }
      const userProfile = userProfileResult.data;

      // Get user transactions from Supabase
      const transactionsResult = await getUserTransactions(userId);
      const transactions = transactionsResult?.data || [];

      // Calculate totals from transactions
      const deposits = transactions.filter(t => t.type === 'deposit' && t.status === 'approved');
      const withdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'approved');
      const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'pending');
      const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');

      const totalDeposited = deposits.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalWithdrawn = withdrawals.reduce((sum, t) => sum + Number(t.amount), 0);
      const pendingDepositAmount = pendingDeposits.reduce((sum, t) => sum + Number(t.amount), 0);
      const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, t) => sum + Number(t.amount), 0);

      // Ensure balance is a valid number
      const balance = Number(userProfile.wallet_balance || 0);
      const validBalance = isNaN(balance) ? 0 : balance;

      return {
        balance: validBalance,
        pendingDeposits: pendingDepositAmount,
        pendingWithdrawals: pendingWithdrawalAmount,
        totalDeposited,
        totalWithdrawn,
        transactions: transactions.map(t => {
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
            id: t.id,
            userId: t.user_id,
            type: t.type as any,
            amount: Number(t.amount),
            status: t.status as any,
            description: `${t.type} - PKR ${(Number(t.amount) || 0).toLocaleString()}`,
            metadata: t.bank_details || {},
            createdAt: safeCreateDate(t.created_at),
            updatedAt: safeCreateDate(t.updated_at || t.created_at),
          };
        }),
      };
    } catch (error) {
      console.error('Error getting wallet state:', error);
      // Return fallback state
      return {
        balance: 50,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        transactions: [],
      };
    }
  }

  // Update balance
  static async updateBalance(userId: string, amount: number, type: 'add' | 'subtract'): Promise<number> {
    try {
      // Get current balance from Supabase
      const userProfileResult = await getUserProfile(userId);
      if (!userProfileResult?.success || !userProfileResult?.data) {
        throw new Error('User not found');
      }
      const userProfile = userProfileResult.data;

      let newBalance: number;
      if (type === 'add') {
        newBalance = Number(userProfile.wallet_balance || 0) + amount;
      } else {
        newBalance = Math.max(0, Number(userProfile.wallet_balance || 0) - amount);
      }

      // Update balance in Supabase
      await updateSupabaseBalance(userId, newBalance);

      return newBalance;
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }

  // Add transaction
  static async addTransaction(userId: string, transaction: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const wallet = await this.getWalletState(userId);
    
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    wallet.transactions.unshift(newTransaction);
    return newTransaction;
  }

  // Create deposit request - Now stores in database for admin approval
  static async createDepositRequest(
    userId: string,
    amount: number,
    bankAccountId: string,
    receiptImage?: string,
    transactionId?: string,
    notes?: string
  ): Promise<DepositRequest> {
    const bankAccount = BANK_ACCOUNTS.find(acc => acc.id === bankAccountId);

    // Submit deposit request to transaction service for admin approval
    const result = await submitDepositRequest(userId, {
      amount,
      method: 'bank_transfer',
      accountName: bankAccount?.accountTitle || bankAccount?.name || '',
      accountNumber: bankAccount?.accountNumber || '',
      bankName: bankAccount?.bank || '',
      transactionId: transactionId || '',
      screenshot: receiptImage || '',
      notes: notes || ''
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to submit deposit request');
    }

    const depositRequest: DepositRequest = {
      id: result.transactionId || `dep_${Date.now()}`,
      userId,
      amount,
      bankAccountId,
      receiptImage,
      status: 'pending',
      createdAt: new Date(),
    };

    // Add transaction record for user history
    await this.addTransaction(userId, {
      type: 'deposit',
      amount,
      status: 'pending',
      description: `Deposit request via ${bankAccount?.name} - Pending admin approval`,
      metadata: {
        bankAccount: bankAccountId,
        receiptImage,
      },
    });

    const wallet = await this.getWalletState(userId);
    wallet.pendingDeposits += amount;

    return depositRequest;
  }

  // Create withdrawal request - Now stores in database for admin approval
  static async createWithdrawalRequest(
    userId: string,
    amount: number,
    bankDetails: WithdrawalRequest['bankDetails'],
    notes?: string
  ): Promise<WithdrawalRequest> {
    const deductionAmount = Math.round(amount * 0.01 * 100) / 100; // 1% deduction
    const finalAmount = amount - deductionAmount;

    // Submit withdrawal request to transaction service for admin approval
    const result = await submitWithdrawalRequest(userId, {
      amount,
      method: 'bank_transfer',
      accountName: bankDetails.accountTitle,
      accountNumber: bankDetails.accountNumber,
      bankName: bankDetails.bank,
      iban: bankDetails.iban || '',
      notes: notes || ''
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to submit withdrawal request');
    }

    const withdrawalRequest: WithdrawalRequest = {
      id: result.transactionId || `wth_${Date.now()}`,
      userId,
      amount,
      bankDetails,
      status: 'pending',
      createdAt: new Date(),
      deductionAmount,
      finalAmount,
    };

    // Deduct amount from balance immediately (will be refunded if rejected)
    await this.updateBalance(userId, amount, 'subtract');

    // Add transaction record for user history
    await this.addTransaction(userId, {
      type: 'withdrawal',
      amount,
      status: 'pending',
      description: `Withdrawal request to ${bankDetails.bank} - Pending admin approval`,
      metadata: {
        bankAccount: `${bankDetails.accountTitle} - ${bankDetails.accountNumber}`,
        adminNotes: `Final amount: Rs ${finalAmount}, Deduction: Rs ${deductionAmount}`,
      },
    });

    const wallet = await this.getWalletState(userId);
    wallet.pendingWithdrawals += amount;

    return withdrawalRequest;
  }

  // Process game result (win/loss)
  static async processGameResult(
    userId: string,
    gameId: string,
    betAmount: number,
    winAmount: number,
    isWin: boolean
  ): Promise<void> {
    if (isWin && winAmount > 0) {
      await this.updateBalance(userId, winAmount, 'add');
      await this.addTransaction(userId, {
        type: 'game_win',
        amount: winAmount,
        status: 'completed',
        description: `Won PKR ${winAmount.toLocaleString()} in ${gameId}`,
        metadata: { gameId },
      });
    } else {
      await this.updateBalance(userId, betAmount, 'subtract');
      await this.addTransaction(userId, {
        type: 'game_loss',
        amount: betAmount,
        status: 'completed',
        description: `Lost PKR ${betAmount.toLocaleString()} in ${gameId}`,
        metadata: { gameId },
      });
    }
  }

  // Get available bank accounts
  static getBankAccounts(): BankAccount[] {
    return BANK_ACCOUNTS.filter(account => account.isActive);
  }

  // Get transactions for user
  static async getTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    const wallet = await this.getWalletState(userId);
    return wallet.transactions.slice(0, limit);
  }

  // Validate withdrawal amount
  static async canWithdraw(userId: string, amount: number): Promise<{ canWithdraw: boolean; reason?: string }> {
    const wallet = await this.getWalletState(userId);

    if (amount <= 0) {
      return { canWithdraw: false, reason: 'Amount must be greater than 0' };
    }

    if (amount > wallet.balance) {
      return { canWithdraw: false, reason: 'Insufficient balance' };
    }

    if (amount < WALLET_LIMITS.MIN_WITHDRAWAL) {
      return { canWithdraw: false, reason: `Minimum withdrawal amount is Rs ${WALLET_LIMITS.MIN_WITHDRAWAL}` };
    }

    if (amount > WALLET_LIMITS.MAX_WITHDRAWAL) {
      return { canWithdraw: false, reason: `Maximum withdrawal amount is Rs ${WALLET_LIMITS.MAX_WITHDRAWAL.toLocaleString()}` };
    }

    // Check if user has made at least one approved deposit
    const approvedDeposits = wallet.transactions.filter(t =>
      t.type === 'deposit' && t.status === 'approved'
    );

    if (approvedDeposits.length === 0) {
      return { canWithdraw: false, reason: 'You must make at least one deposit before you can withdraw money' };
    }

    return { canWithdraw: true };
  }
}
