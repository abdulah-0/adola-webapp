// Admin Service for Adola Gaming Platform

import {
  AdminDashboardStats,
  PendingDepositRequest,
  PendingWithdrawalRequest,
  UserManagement,
  GameStatistics,
  AdminAction
} from '../types/adminTypes';
import { supabase } from '../lib/supabase';

// Mock admin data (in production, use Firebase with proper admin authentication)
let mockAdminData = {
  pendingDeposits: [] as PendingDepositRequest[],
  pendingWithdrawals: [] as PendingWithdrawalRequest[],
  users: [] as UserManagement[],
  adminActions: [] as AdminAction[],
};

export class AdminService {
  // Check if user is admin (simplified for demo)
  static isAdmin(email: string): boolean {
    return email === 'snakeyes358@gmail.com' || email.includes('admin');
  }

  // Get dashboard statistics
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      // Get real data from Supabase
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, status, created_at');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      const { data: transactions, error: transactionsError } = await supabase
        .from('wallet_transactions')
        .select('type, amount, status, created_at');

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        throw transactionsError;
      }

      const { data: gameSessions, error: gameSessionsError } = await supabase
        .from('game_sessions')
        .select('bet_amount, win_amount, created_at');

      if (gameSessionsError) {
        console.error('Error fetching game sessions:', gameSessionsError);
        // Don't throw error for game sessions as it's optional
      }

      // Calculate real statistics
      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter(user => user.status === 'online').length || 0;

      const deposits = transactions?.filter(t => t.type === 'deposit') || [];
      const withdrawals = transactions?.filter(t => t.type === 'withdraw') || [];

      const totalDeposits = deposits
        .filter(t => t.status === 'approved' || t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalWithdrawals = withdrawals
        .filter(t => t.status === 'approved' || t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Get pending amounts from wallet_transactions
      const pendingDepositsFromWallet = deposits
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const pendingWithdrawalsFromWallet = withdrawals
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Also check dedicated deposit_requests and withdrawal_requests tables for accurate pending amounts
      let pendingDepositsFromRequests = 0;
      let pendingWithdrawalsFromRequests = 0;

      try {
        const { data: pendingDepositRequests } = await supabase
          .from('deposit_requests')
          .select('amount')
          .eq('status', 'pending');

        const { data: pendingWithdrawalRequests } = await supabase
          .from('withdrawal_requests')
          .select('amount')
          .eq('status', 'pending');

        if (pendingDepositRequests && pendingDepositRequests.length > 0) {
          pendingDepositsFromRequests = pendingDepositRequests.reduce((sum, req) => sum + Number(req.amount || 0), 0);
        }

        if (pendingWithdrawalRequests && pendingWithdrawalRequests.length > 0) {
          pendingWithdrawalsFromRequests = pendingWithdrawalRequests.reduce((sum, req) => sum + Number(req.amount || 0), 0);
        }
      } catch (error) {
        console.log('Note: deposit_requests/withdrawal_requests tables may not exist yet');
      }

      // Use the higher amount (from dedicated tables if available, otherwise from wallet_transactions)
      const pendingDepositsAmount = Math.max(pendingDepositsFromWallet, pendingDepositsFromRequests);
      const pendingWithdrawalsAmount = Math.max(pendingWithdrawalsFromWallet, pendingWithdrawalsFromRequests);

      console.log(`📊 Admin Dashboard Stats - Pending Deposits: PKR ${pendingDepositsAmount} (Wallet: ${pendingDepositsFromWallet}, Requests: ${pendingDepositsFromRequests})`);
      console.log(`📊 Admin Dashboard Stats - Pending Withdrawals: PKR ${pendingWithdrawalsAmount} (Wallet: ${pendingWithdrawalsFromWallet}, Requests: ${pendingWithdrawalsFromRequests})`);

      // Calculate real game revenue (house profit = total bets - total winnings)
      const totalBets = gameSessions?.reduce((sum, session) => sum + Number(session.bet_amount || 0), 0) || 0;
      const totalWinnings = gameSessions?.reduce((sum, session) => sum + Number(session.win_amount || 0), 0) || 0;
      const totalGameRevenue = totalBets - totalWinnings; // This is the actual house profit (amount players lost)

      const totalReferralBonuses = transactions?.filter(t => t.type === 'referral_bonus').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Calculate today's stats with live data
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayUsers = users?.filter(user => new Date(user.created_at) >= today).length || 0;

      // Today's approved deposits/withdrawals from wallet_transactions
      const todayDeposits = deposits
        .filter(t => new Date(t.created_at) >= today && (t.status === 'approved' || t.status === 'completed'))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const todayWithdrawals = withdrawals
        .filter(t => new Date(t.created_at) >= today && (t.status === 'approved' || t.status === 'completed'))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Today's pending amounts from dedicated request tables
      let todayPendingDeposits = 0;
      let todayPendingWithdrawals = 0;
      let todayDepositRequests = 0;
      let todayWithdrawalRequests = 0;

      try {
        const { data: todayDepositRequestsData } = await supabase
          .from('deposit_requests')
          .select('amount, status')
          .gte('created_at', today.toISOString());

        const { data: todayWithdrawalRequestsData } = await supabase
          .from('withdrawal_requests')
          .select('amount, status')
          .gte('created_at', today.toISOString());

        if (todayDepositRequestsData) {
          todayDepositRequests = todayDepositRequestsData.length;
          todayPendingDeposits = todayDepositRequestsData
            .filter(req => req.status === 'pending')
            .reduce((sum, req) => sum + Number(req.amount || 0), 0);
        }

        if (todayWithdrawalRequestsData) {
          todayWithdrawalRequests = todayWithdrawalRequestsData.length;
          todayPendingWithdrawals = todayWithdrawalRequestsData
            .filter(req => req.status === 'pending')
            .reduce((sum, req) => sum + Number(req.amount || 0), 0);
        }
      } catch (error) {
        console.log('Note: Could not fetch today\'s request data from dedicated tables');
      }

      // Calculate today's game revenue (house profit)
      const todayGameSessions = gameSessions?.filter(session => new Date(session.created_at) >= today) || [];
      const todayBets = todayGameSessions.reduce((sum, session) => sum + Number(session.bet_amount || 0), 0);
      const todayWinnings = todayGameSessions.reduce((sum, session) => sum + Number(session.win_amount || 0), 0);
      const todayGameRevenue = todayBets - todayWinnings; // House profit for today
      const todayGamesPlayed = todayGameSessions.length;

      console.log(`📊 Today's Activity - New Users: ${todayUsers}, Deposits: PKR ${todayDeposits}, Withdrawals: PKR ${todayWithdrawals}`);
      console.log(`📊 Today's Activity - Pending: ${todayDepositRequests} deposit requests (PKR ${todayPendingDeposits}), ${todayWithdrawalRequests} withdrawal requests (PKR ${todayPendingWithdrawals})`);
      console.log(`📊 Today's Activity - Games: ${todayGamesPlayed} played, PKR ${todayBets} bet, PKR ${todayGameRevenue} house profit`);

      return {
        totalUsers,
        activeUsers,
        totalDeposits,
        totalWithdrawals,
        pendingDeposits: pendingDepositsAmount,
        pendingWithdrawals: pendingWithdrawalsAmount,
        totalGameRevenue,
        totalReferralBonuses,
        todayStats: {
          newUsers: todayUsers,
          deposits: todayDeposits,
          withdrawals: todayWithdrawals,
          gameRevenue: todayGameRevenue,
          pendingDeposits: todayPendingDeposits,
          pendingWithdrawals: todayPendingWithdrawals,
          depositRequests: todayDepositRequests,
          withdrawalRequests: todayWithdrawalRequests,
          gamesPlayed: todayGamesPlayed,
          totalBets: todayBets,
        },
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      // Return fallback data if there's an error
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        totalGameRevenue: 0,
        totalReferralBonuses: 0,
        todayStats: {
          newUsers: 0,
          deposits: 0,
          withdrawals: 0,
          gameRevenue: 0,
        },
      };
    }
  }

  // Get pending deposit requests - Direct query only
  static async getPendingDeposits(): Promise<PendingDepositRequest[]> {
    try {
      return await this.getPendingDepositsDirectly();
    } catch (error) {
      console.error('Error getting pending deposits:', error);
      return [];
    }
  }

  // Fallback method for getting pending deposits
  private static async getPendingDepositsDirectly(): Promise<PendingDepositRequest[]> {
    try {
      const { data: deposits, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return deposits?.map(deposit => ({
        id: deposit.id,
        userId: deposit.user_id,
        userEmail: `user-${deposit.user_id.substring(0, 8)}@adola.com`,
        amount: Number(deposit.amount),
        bankAccountId: deposit.bank_account_id || '',
        bankAccountName: `User ${deposit.user_id.substring(0, 8)}`,
        receiptImage: deposit.receipt_image || '',
        status: 'pending' as const,
        createdAt: new Date(deposit.created_at),
        adminNotes: deposit.admin_notes || '',
      })) || [];
    } catch (error) {
      console.error('Error in fallback deposit fetch:', error);
      return [];
    }
  }

  // Get pending withdrawal requests - Direct query only
  static async getPendingWithdrawals(): Promise<PendingWithdrawalRequest[]> {
    try {
      return await this.getPendingWithdrawalsDirectly();
    } catch (error) {
      console.error('Error getting pending withdrawals:', error);
      return [];
    }
  }

  // Fallback method for getting pending withdrawals
  private static async getPendingWithdrawalsDirectly(): Promise<PendingWithdrawalRequest[]> {
    try {
      const { data: withdrawals, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending withdrawals:', error);
        throw error;
      }

      // Get user details separately
      const userIds = withdrawals?.map(w => w.user_id) || [];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('auth_user_id, email, username, display_name')
        .in('auth_user_id', userIds);

      if (usersError) {
        console.error('Error fetching user details:', usersError);
      }

      // Create a map of user details
      const userMap = new Map();
      users?.forEach(user => {
        userMap.set(user.auth_user_id, user);
      });

      if (error) {
        console.error('Error fetching pending withdrawals:', error);
        throw error;
      }

      return withdrawals?.map(withdrawal => {
        const user = userMap.get(withdrawal.user_id);

        // Debug: Log bank_details structure
        console.log('🔍 Debug - withdrawal.bank_details:', withdrawal.bank_details);

        // Ensure bank_details is properly structured
        const bankDetails = withdrawal.bank_details || {};

        return {
          id: withdrawal.id,
          userId: withdrawal.user_id,
          userEmail: user?.email || 'Unknown',
          userName: user?.username || user?.display_name || 'Unknown',
          amount: Number(withdrawal.amount),
          deductionAmount: Number(withdrawal.deduction_amount),
          finalAmount: Number(withdrawal.final_amount),
          bankDetails: {
            accountTitle: bankDetails.accountTitle || '',
            accountNumber: bankDetails.accountNumber || '',
            iban: bankDetails.iban || '',
            bank: bankDetails.bank || '',
          },
          status: 'pending' as const,
          createdAt: new Date(withdrawal.created_at),
          adminNotes: withdrawal.admin_notes || '',
        };
      }) || [];
    } catch (error) {
      console.error('Error getting pending withdrawals:', error);
      return [];
    }
  }

  // Approve deposit request
  static async approveDeposit(
    depositId: string,
    adminId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, get the transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, type')
        .eq('id', depositId)
        .eq('type', 'deposit')
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError || !transaction) {
        console.error('Error fetching transaction:', fetchError);
        return { success: false, error: 'Deposit request not found' };
      }

      // Update transaction status to approved
      const { error: updateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'approved',
          description: notes || '',
          approved_at: new Date().toISOString(),
        })
        .eq('id', depositId);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return { success: false, error: 'Failed to approve deposit' };
      }

      // Update user's wallet balance
      const { data: user, error: userFetchError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('auth_user_id', transaction.user_id)
        .maybeSingle();

      if (userFetchError || !user) {
        console.error('Error fetching user:', userFetchError);
        return { success: false, error: 'User not found' };
      }

      // Calculate 5% bonus for every deposit
      const depositAmount = Number(transaction.amount);
      const bonusAmount = Math.floor(depositAmount * 0.05);
      const totalAmount = depositAmount + bonusAmount;
      const newBalance = Number(user.wallet_balance) + totalAmount;

      console.log(`💰 Processing deposit: PKR ${depositAmount} + 5% bonus (PKR ${bonusAmount}) = PKR ${totalAmount} total`);

      const { error: balanceUpdateError } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', transaction.user_id);

      if (balanceUpdateError) {
        console.error('Error updating user balance:', balanceUpdateError);
        return { success: false, error: 'Failed to update user balance' };
      }

      // Create a separate transaction record for the 5% deposit bonus
      if (bonusAmount > 0) {
        const { error: bonusTransactionError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: transaction.user_id,
            type: 'deposit_bonus',
            status: 'approved',
            amount: bonusAmount,
            description: `5% Deposit Bonus - PKR ${bonusAmount} (on PKR ${depositAmount} deposit)`,
            approved_at: new Date().toISOString(),
          });

        if (bonusTransactionError) {
          console.error('❌ Error creating bonus transaction:', bonusTransactionError);
        } else {
          console.log(`✅ 5% deposit bonus added: PKR ${bonusAmount} for user ${transaction.user_id}`);
        }
      }

      // Check if this user was referred by someone and give referrer 5% bonus
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('referred_by_user_id, username')
        .eq('auth_user_id', transaction.user_id)
        .maybeSingle();

      if (!userError && userData && userData.referred_by_user_id) {
        const referrerBonus = Math.floor(depositAmount * 0.05);

        if (referrerBonus > 0) {
          console.log(`💰 Processing referral bonus: PKR ${referrerBonus} for referrer of ${userData.username}`);

          // Get referrer's current balance
          const { data: referrerUser, error: referrerUserError } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('auth_user_id', userData.referred_by_user_id)
            .maybeSingle();

          if (!referrerUserError && referrerUser) {
            const referrerNewBalance = Number(referrerUser.wallet_balance) + referrerBonus;

            // Update referrer's wallet balance
            const { error: referrerUpdateError } = await supabase
              .from('users')
              .update({ wallet_balance: referrerNewBalance })
              .eq('auth_user_id', userData.referred_by_user_id);

            if (!referrerUpdateError) {
              // Create referral bonus transaction for referrer
              const { error: referralTxError } = await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: userData.referred_by_user_id,
                  type: 'referral_deposit_bonus',
                  status: 'approved',
                  amount: referrerBonus,
                  description: `5% Referral Bonus - PKR ${referrerBonus} (from ${userData.username}'s PKR ${depositAmount} deposit)`,
                  approved_at: new Date().toISOString(),
                });

              if (!referralTxError) {
                console.log(`✅ 5% referral bonus given: PKR ${referrerBonus} to referrer of ${userData.username}`);
              } else {
                console.error('❌ Error creating referral bonus transaction:', referralTxError);
              }
            } else {
              console.error('❌ Error updating referrer balance:', referrerUpdateError);
            }
          } else {
            console.error('❌ Error fetching referrer user:', referrerUserError);
          }
        }
      }

      // Log admin action
      this.logAdminAction(adminId, 'approve_deposit', 'deposit', depositId, {
        amount: depositAmount,
        bonusAmount: bonusAmount,
        totalAmount: totalAmount,
        userId: transaction.user_id,
        notes,
      });

      console.log(`✅ Deposit approved: User ${transaction.user_id} balance updated by +PKR ${totalAmount} (including PKR ${bonusAmount} bonus)`);

      return {
        success: true,
        userId: transaction.user_id,
        amount: depositAmount,
        bonusAmount: bonusAmount,
        totalAmount: totalAmount,
        newBalance: newBalance
      };
    } catch (error) {
      console.error('Error approving deposit:', error);
      return { success: false, error: 'Failed to approve deposit' };
    }
  }

  // Reject deposit request
  static async rejectDeposit(
    depositId: string,
    adminId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, get the transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, type')
        .eq('id', depositId)
        .eq('type', 'deposit')
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError || !transaction) {
        console.error('Error fetching transaction:', fetchError);
        return { success: false, error: 'Deposit request not found' };
      }

      // Update transaction status to rejected
      const { error: updateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'rejected',
          description: reason,
          approved_at: new Date().toISOString(),
        })
        .eq('id', depositId);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return { success: false, error: 'Failed to reject deposit' };
      }

      // Log admin action
      this.logAdminAction(adminId, 'reject_deposit', 'deposit', depositId, {
        amount: transaction.amount,
        userId: transaction.user_id,
        reason,
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      return { success: false, error: 'Failed to reject deposit' };
    }
  }

  // Approve withdrawal request
  static async approveWithdrawal(
    withdrawalId: string,
    adminId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, get the transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, type')
        .eq('id', withdrawalId)
        .eq('type', 'withdraw')
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError || !transaction) {
        console.error('Error fetching transaction:', fetchError);
        return { success: false, error: 'Withdrawal request not found' };
      }

      // Update transaction status to approved
      const { error: updateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'approved',
          description: notes || '',
          approved_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return { success: false, error: 'Failed to approve withdrawal' };
      }

      // Deduct withdrawal amount from user's wallet balance
      const { data: user, error: userFetchError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('auth_user_id', transaction.user_id)
        .maybeSingle();

      if (userFetchError || !user) {
        console.error('Error fetching user:', userFetchError);
        return { success: false, error: 'User not found' };
      }

      const withdrawalAmount = Number(transaction.amount);
      const newBalance = Math.max(0, Number(user.wallet_balance) - withdrawalAmount);

      const { error: balanceUpdateError } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', transaction.user_id);

      if (balanceUpdateError) {
        console.error('Error updating user balance:', balanceUpdateError);
        return { success: false, error: 'Failed to update user balance' };
      }

      // Log admin action
      const finalAmount = Number(transaction.amount) * 0.99; // 1% deduction
      this.logAdminAction(adminId, 'approve_withdrawal', 'withdrawal', withdrawalId, {
        amount: transaction.amount,
        finalAmount,
        userId: transaction.user_id,
        notes,
      });

      console.log(`✅ Withdrawal approved: User ${transaction.user_id} balance updated by -PKR ${withdrawalAmount}`);

      return {
        success: true,
        userId: transaction.user_id,
        amount: withdrawalAmount,
        newBalance: newBalance
      };
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      return { success: false, error: 'Failed to approve withdrawal' };
    }
  }

  // Reject withdrawal request
  static async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, get the transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, type')
        .eq('id', withdrawalId)
        .eq('type', 'withdraw')
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError || !transaction) {
        console.error('Error fetching transaction:', fetchError);
        return { success: false, error: 'Withdrawal request not found' };
      }

      // Update transaction status to rejected
      const { error: updateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'rejected',
          description: reason,
          approved_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return { success: false, error: 'Failed to reject withdrawal' };
      }

      // Refund the amount back to user's wallet since withdrawal was rejected
      const { data: user, error: userFetchError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('auth_user_id', transaction.user_id)
        .maybeSingle();

      if (userFetchError || !user) {
        console.error('Error fetching user:', userFetchError);
        return { success: false, error: 'User not found' };
      }

      const refundAmount = Number(transaction.amount);
      const newBalance = Number(user.wallet_balance) + refundAmount;

      const { error: balanceUpdateError } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', transaction.user_id);

      if (balanceUpdateError) {
        console.error('Error updating user balance:', balanceUpdateError);
        return { success: false, error: 'Failed to refund user balance' };
      }

      // Log admin action
      this.logAdminAction(adminId, 'reject_withdrawal', 'withdrawal', withdrawalId, {
        amount: transaction.amount,
        userId: transaction.user_id,
        reason,
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      return { success: false, error: 'Failed to reject withdrawal' };
    }
  }

  // Get game statistics
  static async getGameStatistics(): Promise<GameStatistics[]> {
    return [
      {
        gameId: 'dice',
        gameName: 'Dice Game',
        totalBets: 1247,
        totalWagered: 12470.50,
        totalWon: 11223.45,
        houseEdge: 10.0,
        popularityRank: 1,
        activeUsers: 234,
      },
      {
        gameId: 'plinko',
        gameName: 'Plinko',
        totalBets: 892,
        totalWagered: 8920.25,
        totalWon: 8028.23,
        houseEdge: 10.0,
        popularityRank: 2,
        activeUsers: 156,
      },
      {
        gameId: 'mines',
        gameName: 'Mines',
        totalBets: 567,
        totalWagered: 5670.75,
        totalWon: 5103.68,
        houseEdge: 10.0,
        popularityRank: 3,
        activeUsers: 89,
      },
    ];
  }

  // Log admin action
  static async logAdminAction(
    adminId: string,
    action: string,
    target: string,
    targetId: string,
    details: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_logs')
        .insert({
          admin_id: adminId,
          action,
          target_user_id: details.userId || null,
          details: {
            target,
            targetId,
            ...details,
          },
        });

      if (error) {
        console.error('Error logging admin action:', error);
      }
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  // Get recent admin actions
  static async getRecentActions(limit: number = 50): Promise<AdminAction[]> {
    return mockAdminData.adminActions.slice(0, limit);
  }

  // Get all users for management
  static async getAllUsers(): Promise<UserManagement[]> {
    // Mock user data
    return [
      {
        id: 'user1',
        email: 'user1@example.com',
        username: 'Player1',
        balance: 150.75,
        totalDeposited: 500.00,
        totalWithdrawn: 200.00,
        totalGameLoss: 120.25,
        totalGameWin: 70.00,
        referralCode: 'PLA123456',
        isActive: true,
        isBanned: false,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: 'user2',
        email: 'user2@example.com',
        username: 'Player2',
        balance: 89.50,
        totalDeposited: 300.00,
        totalWithdrawn: 150.00,
        totalGameLoss: 45.50,
        totalGameWin: 85.00,
        referralCode: 'PLA789012',
        referredBy: 'PLA123456',
        isActive: true,
        isBanned: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
    ];
  }
}
