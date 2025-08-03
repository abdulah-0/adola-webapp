// Wallet Types for Adola Gaming Platform

export interface BankAccount {
  id: string;
  name: string;
  accountTitle?: string;
  accountNumber: string;
  iban: string;
  bank: string;
  isActive: boolean;
}

export interface USDTAccount {
  id: string;
  name: string;
  address: string;
  network: 'TRC20';
  isActive: boolean;
  conversionRate: number; // PKR per USDT
  minDeposit: number; // Minimum USDT amount
}

export type PaymentMethod = 'bank_transfer' | 'usdt_trc20';

export interface PaymentAccount {
  id: string;
  name: string;
  type: PaymentMethod;
  details: BankAccount | USDTAccount;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'game_win' | 'game_loss' | 'referral_bonus' | 'deposit_bonus';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  description: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    gameId?: string;
    referralCode?: string;
    bankAccount?: string;
    receiptImage?: string;
    adminNotes?: string;
    original_deposit_id?: string;
    original_deposit_amount?: number;
    bonus_percentage?: number;
  };
}

export interface DepositRequest {
  id: string;
  userId: string;
  amount: number;
  bankAccountId: string;
  receiptImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  adminNotes?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  bankDetails: {
    accountTitle: string;
    accountNumber: string;
    iban: string;
    bank: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  adminNotes?: string;
  deductionAmount: number; // 1% deduction
  finalAmount: number; // Amount after deduction
}

export interface WalletState {
  balance: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalDeposited: number;
  totalWithdrawn: number;
  transactions: Transaction[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'bank_transfer';
  isActive: boolean;
  config: {
    bankAccounts: BankAccount[];
  };
}
