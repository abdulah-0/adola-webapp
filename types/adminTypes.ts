// Admin Types for Adola Gaming Platform

export interface AdminUser {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'moderator';
  permissions: AdminPermission[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface AdminPermission {
  id: string;
  name: string;
  description: string;
  category: 'users' | 'transactions' | 'games' | 'referrals' | 'system';
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalGameRevenue: number;
  totalReferralBonuses: number;
  todayStats: {
    newUsers: number;
    deposits: number;
    withdrawals: number;
    gameRevenue: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    depositRequests: number;
    withdrawalRequests: number;
    gamesPlayed: number;
    totalBets: number;
  };
}

export interface PendingDepositRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'usdt_trc20';
  bankAccountId?: string;
  bankAccountName?: string;
  usdtAccountId?: string;
  usdtAccountName?: string;
  usdtAddress?: string;
  transactionId?: string;
  transactionHash?: string;
  receiptImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  adminNotes?: string;
  processedBy?: string;
  processedAt?: Date;
  metadata?: any;
}

export interface PendingWithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  deductionAmount: number;
  finalAmount: number;
  bankDetails: {
    accountTitle: string;
    accountNumber: string;
    iban: string;
    bank: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  adminNotes?: string;
  processedBy?: string;
  processedAt?: Date;
}

export interface UserManagement {
  id: string;
  email: string;
  username: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalGameLoss: number;
  totalGameWin: number;
  referralCode: string;
  referredBy?: string;
  isActive: boolean;
  isBanned: boolean;
  createdAt: Date;
  lastActivity?: Date;
}

export interface GameStatistics {
  gameId: string;
  gameName: string;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  houseEdge: number;
  popularityRank: number;
  activeUsers: number;
}

export interface SystemSettings {
  id: string;
  category: 'games' | 'payments' | 'referrals' | 'general';
  key: string;
  value: string;
  description: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface AdminAction {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  target: string;
  targetId: string;
  details: any;
  timestamp: Date;
  ipAddress?: string;
}
