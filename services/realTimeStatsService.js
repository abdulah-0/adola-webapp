// Real-Time Statistics Service for Admin Panel
// Provides live data instead of static numbers

import { getAllUsers } from './userManagement.js';
import { getAllTransactionRequests, getTransactionStatistics } from './transactionService.js';
import centralWalletManager from './centralWalletManager.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Real-time Admin Dashboard Statistics
 */
export const getRealTimeAdminStats = async () => {
  try {
    console.log('📊 Fetching real-time admin statistics...');
    
    // Get all users
    const allUsers = await getAllUsers();

    // Get transaction statistics
    const transactionStats = await getTransactionStatistics();

    // Get all transactions for detailed analysis
    const allTransactions = await getAllTransactionRequests();

    console.log('📊 Real-time data loaded:', {
      users: allUsers.length,
      transactions: allTransactions.length,
      transactionStats
    });
    
    // Calculate user statistics
    const totalUsers = allUsers.length;
    const onlineUsers = allUsers.filter(user => user.isOnline).length;
    const adminUsers = allUsers.filter(user => user.isAdmin).length;
    const verifiedUsers = allUsers.filter(user => user.emailVerified).length;
    
    // Calculate wallet statistics
    const totalWalletBalance = allUsers.reduce((sum, user) => sum + (user.walletBalance || 0), 0);
    const averageBalance = totalUsers > 0 ? totalWalletBalance / totalUsers : 0;
    
    // Calculate game statistics from game_sessions table
    const { data: gameSessions, error: gameSessionsError } = await supabase
      .from('game_sessions')
      .select('bet_amount, win_amount, created_at');

    let totalGamesPlayed = 0;
    let totalBets = 0;
    let totalWinnings = 0;
    let gameRevenue = 0; // House profit (amount players lost)

    if (!gameSessionsError && gameSessions) {
      totalGamesPlayed = gameSessions.length;
      totalBets = gameSessions.reduce((sum, session) => sum + Number(session.bet_amount || 0), 0);
      totalWinnings = gameSessions.reduce((sum, session) => sum + Number(session.win_amount || 0), 0);
      gameRevenue = totalBets - totalWinnings; // This is the actual house profit
    }

    const winRate = totalGamesPlayed > 0 ? (totalWinnings / totalBets) * 100 : 0;
    
    // Calculate recent activity (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentUsers = allUsers.filter(user => 
      user.joinedDate && new Date(user.joinedDate) > yesterday
    ).length;
    
    const recentTransactions = allTransactions.filter(transaction => 
      transaction.requestDate && new Date(transaction.requestDate) > yesterday
    ).length;
    
    // Calculate transaction amounts by status
    const approvedDeposits = allTransactions
      .filter(t => t.type === 'deposit' && t.status === 'approved')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const approvedWithdrawals = allTransactions
      .filter(t => t.type === 'withdrawal' && t.status === 'approved')
      .reduce((sum, t) => sum + (t.finalAmount || t.amount), 0);
    
    const netRevenue = approvedDeposits - approvedWithdrawals;
    
    // Calculate pending amounts from both wallet_transactions and specific request tables
    let pendingDepositAmount = allTransactions
      .filter(t => t.type === 'deposit' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    let pendingWithdrawalAmount = allTransactions
      .filter(t => t.type === 'withdrawal' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    // Also check deposit_requests and withdrawal_requests tables for more accurate pending amounts
    try {
      const { data: pendingDeposits } = await supabase
        .from('deposit_requests')
        .select('amount')
        .eq('status', 'pending');

      const { data: pendingWithdrawals } = await supabase
        .from('withdrawal_requests')
        .select('amount')
        .eq('status', 'pending');

      const pendingDepositCount = pendingDeposits ? pendingDeposits.length : 0;
      const pendingWithdrawalCount = pendingWithdrawals ? pendingWithdrawals.length : 0;

      if (pendingDeposits && pendingDeposits.length > 0) {
        pendingDepositAmount = pendingDeposits.reduce((sum, req) => sum + Number(req.amount || 0), 0);
      }

      if (pendingWithdrawals && pendingWithdrawals.length > 0) {
        pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, req) => sum + Number(req.amount || 0), 0);
      }

      // Store counts for display
      global.pendingDepositCount = pendingDepositCount;
      global.pendingWithdrawalCount = pendingWithdrawalCount;
    } catch (error) {
      console.log('Note: Using wallet_transactions for pending amounts (request tables not available)');
    }
    
    // System health metrics
    const systemHealth = {
      uptime: getSystemUptime(),
      lastUpdate: new Date(),
      activeConnections: onlineUsers,
      errorRate: 0, // Could be calculated from error logs
      responseTime: Math.random() * 100 + 50 // Mock response time
    };
    
    const stats = {
      // User Statistics
      users: {
        total: totalUsers,
        online: onlineUsers,
        admins: adminUsers,
        verified: verifiedUsers,
        recentSignups: recentUsers,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0
      },
      
      // Financial Statistics
      financial: {
        totalWalletBalance,
        averageBalance,
        approvedDeposits,
        approvedWithdrawals,
        netRevenue,
        pendingDepositAmount,
        pendingWithdrawalAmount,
        pendingDepositCount: global.pendingDepositCount || 0,
        pendingWithdrawalCount: global.pendingWithdrawalCount || 0,
        revenueGrowth: calculateRevenueGrowth(allTransactions)
      },
      
      // Transaction Statistics
      transactions: {
        ...transactionStats,
        recentTransactions,
        approvalRate: transactionStats.totalRequests > 0 
          ? (transactionStats.approvedRequests / transactionStats.totalRequests) * 100 
          : 0,
        averageTransactionAmount: transactionStats.totalRequests > 0
          ? (approvedDeposits + approvedWithdrawals) / transactionStats.totalRequests
          : 0
      },
      
      // Gaming Statistics
      gaming: {
        totalGamesPlayed,
        totalBets,
        totalWinnings,
        gameRevenue, // House profit (amount players lost)
        winRate,
        averageGamesPerUser: totalUsers > 0 ? totalGamesPlayed / totalUsers : 0,
        activeGamers: totalUsers // Simplified for now
      },
      
      // System Health
      system: systemHealth,
      
      // Real-time metadata
      metadata: {
        lastUpdated: new Date(),
        dataSource: 'real-time',
        refreshInterval: 30000, // 30 seconds
        isLive: true
      }
    };
    
    console.log('📊 Real-time stats calculated:', {
      users: stats.users.total,
      transactions: stats.transactions.totalRequests,
      revenue: stats.financial.netRevenue
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Error fetching real-time stats:', error);
    return getDefaultStats();
  }
};

/**
 * Calculate revenue growth compared to previous period
 */
const calculateRevenueGrowth = (transactions) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const currentPeriodRevenue = transactions
      .filter(t => t.status === 'approved' && new Date(t.requestDate) > thirtyDaysAgo)
      .reduce((sum, t) => {
        if (t.type === 'deposit') return sum + t.amount;
        if (t.type === 'withdrawal') return sum - (t.finalAmount || t.amount);
        return sum;
      }, 0);
    
    const previousPeriodRevenue = transactions
      .filter(t => t.status === 'approved' && 
        new Date(t.requestDate) > sixtyDaysAgo && 
        new Date(t.requestDate) <= thirtyDaysAgo)
      .reduce((sum, t) => {
        if (t.type === 'deposit') return sum + t.amount;
        if (t.type === 'withdrawal') return sum - (t.finalAmount || t.amount);
        return sum;
      }, 0);
    
    if (previousPeriodRevenue === 0) return 0;
    
    return ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;
  } catch (error) {
    console.error('Error calculating revenue growth:', error);
    return 0;
  }
};

/**
 * Get system uptime (mock implementation)
 */
const getSystemUptime = () => {
  // In a real implementation, this would track actual system uptime
  const startTime = new Date('2024-01-01'); // App launch date
  const now = new Date();
  const uptimeMs = now.getTime() - startTime.getTime();
  
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${days}d ${hours}h ${minutes}m`;
};

/**
 * Default stats when real-time data is unavailable
 */
const getDefaultStats = () => {
  return {
    users: {
      total: 0,
      online: 0,
      admins: 0,
      verified: 0,
      recentSignups: 0,
      verificationRate: 0
    },
    financial: {
      totalWalletBalance: 0,
      averageBalance: 0,
      approvedDeposits: 0,
      approvedWithdrawals: 0,
      netRevenue: 0,
      pendingDepositAmount: 0,
      pendingWithdrawalAmount: 0,
      pendingDepositCount: 0,
      pendingWithdrawalCount: 0,
      revenueGrowth: 0
    },
    transactions: {
      totalRequests: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      recentTransactions: 0,
      approvalRate: 0,
      averageTransactionAmount: 0
    },
    gaming: {
      totalGamesPlayed: 0,
      totalBets: 0,
      totalWinnings: 0,
      gameRevenue: 0,
      winRate: 0,
      averageGamesPerUser: 0,
      activeGamers: 0
    },
    system: {
      uptime: '0d 0h 0m',
      lastUpdate: new Date(),
      activeConnections: 0,
      errorRate: 0,
      responseTime: 0
    },
    metadata: {
      lastUpdated: new Date(),
      dataSource: 'fallback',
      refreshInterval: 30000,
      isLive: false
    }
  };
};

/**
 * Get user activity statistics
 */
export const getUserActivityStats = async () => {
  try {
    const users = await getAllUsers();
    const now = new Date();
    
    // Activity periods
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      activeLastHour: users.filter(u => u.lastLoginDate && new Date(u.lastLoginDate) > oneHourAgo).length,
      activeLastDay: users.filter(u => u.lastLoginDate && new Date(u.lastLoginDate) > oneDayAgo).length,
      activeLastWeek: users.filter(u => u.lastLoginDate && new Date(u.lastLoginDate) > oneWeekAgo).length,
      currentlyOnline: users.filter(u => u.isOnline).length
    };
  } catch (error) {
    console.error('Error getting user activity stats:', error);
    return {
      activeLastHour: 0,
      activeLastDay: 0,
      activeLastWeek: 0,
      currentlyOnline: 0
    };
  }
};

/**
 * Get transaction trends over time
 */
export const getTransactionTrends = async (days = 7) => {
  try {
    const transactions = await getAllTransactionRequests();
    const now = new Date();
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.requestDate);
        return transactionDate >= dayStart && transactionDate < dayEnd;
      });
      
      const deposits = dayTransactions.filter(t => t.type === 'deposit').length;
      const withdrawals = dayTransactions.filter(t => t.type === 'withdrawal').length;
      const depositAmount = dayTransactions
        .filter(t => t.type === 'deposit' && t.status === 'approved')
        .reduce((sum, t) => sum + t.amount, 0);
      
      trends.push({
        date: dayStart.toISOString().split('T')[0],
        deposits,
        withdrawals,
        total: deposits + withdrawals,
        depositAmount,
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }
    
    return trends;
  } catch (error) {
    console.error('Error getting transaction trends:', error);
    return [];
  }
};

console.log('✅ Real-Time Stats Service initialized for admin panel');
