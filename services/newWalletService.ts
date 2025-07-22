// New Wallet Service - Following Requirements Document
// Implements secure wallet operations using Supabase RPC functions

import { supabase } from '../lib/supabase';

export interface WalletBalance {
  balance: number;
  total_deposited?: number;
  total_withdrawn?: number;
  total_won?: number;
  total_lost?: number;
  referral_earnings?: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'game_win' | 'game_loss' | 'referral_bonus' | 'welcome_bonus' | 'deposit_bonus';
  status: 'pending' | 'approved' | 'rejected' | 'auto' | 'completed';
  amount: number;
  balance_before?: number;
  balance_after?: number;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  metadata?: any;
  description?: string;
  reference_id?: string;
  admin_notes?: string;
}

export interface GameResult {
  success: boolean;
  new_balance?: number;
  transaction_type?: string;
  amount?: number;
  message?: string;
  error?: string;
}

export interface TransactionResult {
  success: boolean;
  new_balance?: number;
  transaction_id?: string;
  message?: string;
  error?: string;
  userId?: string;
  amount?: number;
  bonusAmount?: number;
  totalAmount?: number;
  newBalance?: number;
}

export class NewWalletService {
  
  /**
   * Initialize wallet for new user - Direct table approach with user creation
   */
  static async initializeWallet(userId: string, initialBalance: number = 50): Promise<TransactionResult> {
    try {
      // Check if wallet already exists
      const { data: existingWallet, error: checkError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing wallet:', checkError);
      }

      if (existingWallet) {
        return {
          success: true,
          new_balance: parseFloat(existingWallet.balance.toString()),
          message: 'Wallet already exists'
        };
      }

      // Try to ensure user exists in public.users table first
      await this.ensureUserExists(userId);

      // Create new wallet (try with foreign key first, then without if needed)
      let newWallet;
      let createError;

      const walletData = {
        user_id: userId,
        balance: initialBalance,
        total_deposited: initialBalance,
        total_withdrawn: 0,
        total_won: 0,
        total_lost: 0
      };

      const { data, error } = await supabase
        .from('wallets')
        .insert(walletData)
        .select();

      newWallet = data?.[0] || data;
      createError = error;

      // If foreign key constraint fails, try creating wallet without user constraint
      if (createError && createError.code === '23503') {
        console.log('🔧 Creating wallet without user constraint...');

        // Try using the force create wallet function
        try {
          const { data: forceResult, error: forceError } = await supabase.rpc('force_create_wallet', {
            p_user_id: userId,
            p_initial_balance: initialBalance
          });

          if (forceError) {
            console.error('❌ Force create wallet error:', forceError);
          } else if (forceResult && forceResult.success) {
            console.log('✅ Wallet force created successfully');
            // Get the created wallet
            const { data: createdWallet } = await supabase
              .from('wallets')
              .select('*')
              .eq('user_id', userId)
              .single();

            newWallet = createdWallet;
            createError = null;
          }
        } catch (forceErr) {
          console.error('❌ Error in force create:', forceErr);
        }
      }

      if (createError) {
        console.error('❌ Error creating wallet:', createError);
        return {
          success: false,
          error: createError.message
        };
      }

      // Create welcome bonus transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          type: 'welcome_bonus',
          status: 'auto',
          amount: initialBalance,
          balance_before: 0,
          balance_after: initialBalance,
          description: 'Welcome bonus for new user'
        });

      if (txError) {
        console.error('❌ Error creating welcome transaction:', txError);
      }

      return {
        success: true,
        new_balance: initialBalance,
        message: 'Wallet initialized successfully'
      };
    } catch (error) {
      console.error('❌ Error initializing wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize wallet'
      };
    }
  }

  /**
   * Ensure user exists in public.users table - Updated approach
   */
  private static async ensureUserExists(userId: string): Promise<void> {
    try {
      // Check if user already exists in public.users
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking user existence:', checkError);
      }

      if (existingUser) {
        return; // User already exists
      }

      // First, try to get current session user info
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      let userEmail = `user_${userId.substring(0, 8)}@adola.com`;
      let isAdmin = false;

      if (sessionUser && sessionUser.id === userId) {
        userEmail = sessionUser.email || userEmail;
        isAdmin = sessionUser.email === 'snakeyes358@gmail.com';
      }

      // Create user in public.users table with session data
      const { error: createError } = await supabase
        .from('users')
        .insert({
          auth_user_id: userId,
          email: userEmail,
          username: `user_${userId.substring(0, 8)}`,
          display_name: `User ${userId.substring(0, 8)}`,
          wallet_balance: 50.00,
          is_admin: isAdmin,
          is_super_admin: isAdmin,
          email_verified: sessionUser?.email_confirmed_at ? true : false,
          registration_bonus: true,
          is_online: true
        });

      if (createError) {
        console.error('❌ Error creating user record:', createError);

        // If foreign key constraint fails, it means the auth user doesn't exist
        // In this case, we need to handle it differently
        if (createError.code === '23503') {
          console.log('🔧 Auth user not found, creating without foreign key constraint...');
          await this.createUserWithoutAuthConstraint(userId, userEmail, isAdmin);
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring user exists:', error);
    }
  }

  /**
   * Create user without auth constraint (for edge cases)
   */
  private static async createUserWithoutAuthConstraint(userId: string, email: string, isAdmin: boolean): Promise<void> {
    try {
      // Temporarily disable the foreign key constraint for this operation
      // This is a fallback for edge cases where auth user doesn't exist

      // Create user with a different approach - using raw SQL to bypass constraint
      const { error } = await supabase.rpc('create_user_without_auth_constraint', {
        p_user_id: userId,
        p_email: email,
        p_username: `user_${userId.substring(0, 8)}`,
        p_display_name: `User ${userId.substring(0, 8)}`,
        p_is_admin: isAdmin
      });

      if (error) {
        console.error('❌ Error creating user without constraint:', error);
        // Final fallback - just proceed without user record
        console.log('🔧 Proceeding without user record - wallet will be created directly');
      }
    } catch (error) {
      console.error('❌ Error in createUserWithoutAuthConstraint:', error);
    }
  }

  /**
   * Get current wallet balance
   */
  static async getBalance(userId: string): Promise<WalletBalance | null> {
    try {
      // Use direct table query - wallet should auto-create on signup now
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error getting balance:', error);
        return null;
      }

      // If no wallet found, it means user wasn't created properly
      if (!data) {
        console.log('🔧 No wallet found - this should not happen with new auto-creation');
        return {
          balance: 50,
          total_deposited: 50,
          total_withdrawn: 0,
          total_won: 0,
          total_lost: 0,
          referral_earnings: 0,
          updated_at: new Date().toISOString()
        };
      }

      return {
        balance: parseFloat((data.balance || 0).toString()),
        total_deposited: parseFloat((data.total_deposited || 0).toString()),
        total_withdrawn: parseFloat((data.total_withdrawn || 0).toString()),
        total_won: parseFloat((data.total_won || 0).toString()),
        total_lost: parseFloat((data.total_lost || 0).toString()),
        referral_earnings: parseFloat((data.referral_earnings || 0).toString()),
        updated_at: data.updated_at || new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting wallet balance:', error);
      return null;
    }
  }

  /**
   * Fallback method to get balance directly from wallets table
   */
  private static async getBalanceDirectly(userId: string): Promise<WalletBalance | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Direct balance query error:', error);
        return null;
      }

      return {
        balance: data.balance ? parseFloat(data.balance.toString()) : 0,
        total_deposited: data.total_deposited ? parseFloat(data.total_deposited.toString()) : 0,
        total_withdrawn: data.total_withdrawn ? parseFloat(data.total_withdrawn.toString()) : 0,
        total_won: data.total_won ? parseFloat(data.total_won.toString()) : 0,
        total_lost: data.total_lost ? parseFloat(data.total_lost.toString()) : 0,
        updated_at: data.updated_at || new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error in direct balance query:', error);
      return null;
    }
  }

  /**
   * Apply game result (win/loss) - Direct table approach with game session tracking
   */
  static async applyGameResult(
    userId: string,
    amount: number,
    isWin: boolean,
    gameId: string,
    description?: string
  ): Promise<GameResult> {
    try {
      // Get current balance
      const currentBalance = await this.getBalance(userId);

      if (!currentBalance) {
        return {
          success: false,
          error: 'Wallet not found'
        };
      }

      const balanceBefore = currentBalance.balance || 0; // Handle null balance
      let balanceAfter: number;
      let txType: string;
      let winAmount = 0;

      if (isWin) {
        txType = 'game_win';
        balanceAfter = balanceBefore + amount;
        winAmount = amount;
      } else {
        txType = 'game_loss';
        balanceAfter = Math.max(balanceBefore - amount, 0); // Don't go below 0
      }

      // Update wallet balance and statistics
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: balanceAfter,
          total_won: isWin ? (currentBalance.total_won || 0) + amount : currentBalance.total_won,
          total_lost: !isWin ? (currentBalance.total_lost || 0) + amount : currentBalance.total_lost
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Error updating wallet balance:', updateError);
        return {
          success: false,
          error: updateError.message
        };
      }

      // TODO: Update user game statistics (will be implemented later)

      // Create game session record
      const { error: gameSessionError } = await supabase
        .from('game_sessions')
        .insert({
          user_id: userId,
          game_id: gameId,
          game_name: gameId.replace('_', ' ').toUpperCase(),
          bet_amount: amount,
          win_amount: winAmount,
          is_win: isWin,
          game_data: { description: description || `${txType} in ${gameId}` }
        });

      if (gameSessionError) {
        console.error('❌ Error creating game session:', gameSessionError);
      }

      // Create transaction record
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          type: txType,
          status: 'auto',
          amount: amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: description || `${txType} in ${gameId}`,
          metadata: { game_id: gameId, is_win: isWin }
        });

      if (txError) {
        console.error('❌ Error creating transaction record:', txError);
      }

      console.log(`🎮 Game result applied: ${gameId} - ${isWin ? 'WIN' : 'LOSS'} PKR ${amount}`);

      return {
        success: true,
        new_balance: balanceAfter,
        transaction_type: txType,
        amount: amount,
        message: 'Game result applied successfully'
      };
    } catch (error) {
      console.error('❌ Error applying game result:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply game result'
      };
    }
  }

  /**
   * Create deposit request (pending status) - Direct table approach
   */
  static async createDepositRequest(
    userId: string,
    amount: number,
    metadata: any = {},
    description?: string
  ): Promise<string | null> {
    try {
      // Validate minimum deposit amount
      if (amount < 300) {
        console.error('❌ Minimum deposit amount is PKR 300');
        return null;
      }

      // Get current balance
      const currentBalance = await this.getBalance(userId);
      const balanceAmount = currentBalance?.balance || 0;

      // Create deposit request
      const { data: depositData, error: depositError } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: userId,
          amount: amount,
          bank_account_id: metadata.bank_account_id || 'UBL Bank',
          transaction_id: metadata.transaction_id || '',
          receipt_image: metadata.receipt_image || '',
          status: 'pending',
          metadata: metadata
        })
        .select();

      if (depositError) {
        console.error('❌ Error creating deposit request:', depositError);
        return null;
      }

      const depositRecord = depositData?.[0] || depositData;

      // Create wallet transaction record
      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          type: 'deposit',
          status: 'pending',
          amount: amount,
          balance_before: balanceAmount,
          balance_after: balanceAmount, // Balance doesn't change until approved
          description: description || `Deposit request - PKR ${amount}`,
          metadata: metadata,
          reference_id: depositRecord.id
        })
        .select();

      if (txError) {
        console.error('❌ Error creating transaction record:', txError);
        // Try to clean up the deposit request
        await supabase.from('deposit_requests').delete().eq('id', depositRecord.id);
        return null;
      }

      const txRecord = txData?.[0] || txData;
      console.log('✅ Deposit request created:', depositRecord.id);
      return depositRecord.id;
    } catch (error) {
      console.error('❌ Error creating deposit request:', error);
      return null;
    }
  }

  /**
   * Create withdrawal request (pending status) - Direct table approach
   */
  static async createWithdrawalRequest(
    userId: string,
    amount: number,
    metadata: any = {},
    description?: string
  ): Promise<string | null> {
    try {
      // Validate withdrawal amount limits
      if (amount < 500) {
        return null;
      }

      if (amount > 50000) {
        return null;
      }

      // Get current balance and ensure user has a balance record
      let currentBalance = await this.getBalance(userId);

      // If no balance record exists, create one with 0 balance
      if (!currentBalance) {
        const { error: createError } = await supabase
          .from('wallets')
          .insert({
            user_id: userId,
            balance: 0,
            total_deposited: 0,
            total_withdrawn: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createError) {
          return null;
        }

        currentBalance = { balance: 0 };
      }

      const balanceAmount = currentBalance?.balance || 0;

      // Check if user has sufficient balance
      if (balanceAmount < amount) {
        return null;
      }

      // Calculate deduction (1%) and final amount
      const deductionAmount = Math.round(amount * 0.01 * 100) / 100;
      const finalAmount = amount - deductionAmount;

      // IMMEDIATELY deduct the withdrawal amount from user's balance
      const newBalance = balanceAmount - amount;

      // Update user's balance immediately (with upsert to handle missing records)
      const { error: balanceUpdateError } = await supabase
        .from('wallets')
        .upsert({
          user_id: userId,
          balance: newBalance,
          total_withdrawn: (currentBalance.total_withdrawn || 0) + amount,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (balanceUpdateError) {
        return null;
      }

      // Create withdrawal request
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: userId,
          amount: amount,
          bank_details: metadata.bank_details || {},
          deduction_amount: deductionAmount,
          final_amount: finalAmount,
          status: 'pending'
        })
        .select();

      if (withdrawalError) {
        // Rollback balance update
        await supabase
          .from('wallets')
          .upsert({
            user_id: userId,
            balance: balanceAmount,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        return null;
      }

      const withdrawalRecord = withdrawalData?.[0] || withdrawalData;

      // Create wallet transaction record (showing the deduction)
      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          type: 'withdraw',
          status: 'pending',
          amount: -amount, // Negative amount to show deduction
          balance_before: balanceAmount,
          balance_after: newBalance, // Updated balance after deduction
          description: description || `Withdrawal request - PKR ${amount} (Pending approval)`,
          metadata: {
            ...metadata,
            deduction_amount: deductionAmount,
            final_amount: finalAmount,
            immediately_deducted: true
          },
          reference_id: withdrawalRecord.id
        })
        .select();

      if (txError) {
        // Rollback: restore balance and clean up withdrawal request
        await supabase
          .from('wallets')
          .upsert({
            user_id: userId,
            balance: balanceAmount,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        await supabase.from('withdrawal_requests').delete().eq('id', withdrawalRecord.id);
        return null;
      }
      return withdrawalRecord.id;
    } catch (error) {
      return null;
    }
  }

  /**
   * Admin approves withdrawal request
   */
  static async approveWithdrawalRequest(
    withdrawalId: string,
    adminId: string
  ): Promise<boolean> {
    try {
      // Get withdrawal request details
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', withdrawalId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !withdrawal) {
        return false;
      }

      // Update withdrawal request status (only use columns that exist)
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved'
        })
        .eq('id', withdrawalId);

      if (updateError) {
        return false;
      }

      // Update the corresponding transaction status
      const { error: txUpdateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'approved',
          description: `Withdrawal approved - PKR ${withdrawal.amount} (Admin: ${adminId})`
        })
        .eq('reference_id', withdrawalId)
        .eq('type', 'withdraw');

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Admin rejects withdrawal request and returns money to user
   */
  static async rejectWithdrawalRequest(
    withdrawalId: string,
    adminId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      // Get withdrawal request details
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', withdrawalId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !withdrawal) {
        return false;
      }

      // Get current user balance
      const currentBalance = await this.getBalance(withdrawal.user_id);
      const balanceAmount = currentBalance?.balance || 0;

      // Return the withdrawal amount to user's balance
      const newBalance = balanceAmount + withdrawal.amount;

      // Update user's balance (return the money) using upsert
      const { error: balanceUpdateError } = await supabase
        .from('wallets')
        .upsert({
          user_id: withdrawal.user_id,
          balance: newBalance,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (balanceUpdateError) {
        return false;
      }

      // Update withdrawal request status (only use columns that exist)
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected'
        })
        .eq('id', withdrawalId);

      if (updateError) {
        return false;
      }

      // Update the original transaction status
      const { error: txUpdateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'rejected',
          description: `Withdrawal rejected - PKR ${withdrawal.amount} returned (Admin: ${adminId})`
        })
        .eq('reference_id', withdrawalId)
        .eq('type', 'withdraw');



      // Create a new transaction record for the refund (using 'deposit' type for money returned)
      const { error: refundTxError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: withdrawal.user_id,
          type: 'deposit',
          status: 'approved',
          amount: withdrawal.amount, // Positive amount (money returned)
          balance_before: balanceAmount,
          balance_after: newBalance,
          description: `Withdrawal refund - PKR ${withdrawal.amount} (Rejection: ${reason || 'Admin decision'})`,
          metadata: {
            original_withdrawal_id: withdrawalId,
            rejection_reason: reason,
            processed_by: adminId
          }
        });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's wallet transactions
   */
  static async getTransactions(
    userId: string,
    limit: number = 50,
    type?: string
  ): Promise<WalletTransaction[]> {
    try {
      // Use direct table query instead of RPC to avoid JSON errors
      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching transactions:', error);
        return [];
      }

      // Handle empty results gracefully
      if (!data || data.length === 0) {
        console.log(`📝 No transactions found for user ${userId}`);
        return [];
      }

      return data.map(tx => ({
        id: tx.id,
        user_id: tx.user_id,
        type: tx.type,
        status: tx.status,
        amount: parseFloat(tx.amount.toString()),
        balance_before: tx.balance_before ? parseFloat(tx.balance_before.toString()) : undefined,
        balance_after: tx.balance_after ? parseFloat(tx.balance_after.toString()) : undefined,
        created_at: tx.created_at,
        approved_by: tx.approved_by,
        approved_at: tx.approved_at,
        metadata: tx.metadata,
        description: tx.description,
        reference_id: tx.reference_id,
        admin_notes: tx.admin_notes
      }));
    } catch (error) {
      console.error('❌ Error getting transactions:', error);
      return [];
    }
  }

  /**
   * Get pending transactions for admin (deposits/withdrawals)
   */
  static async getPendingTransactions(type?: 'deposit' | 'withdraw'): Promise<WalletTransaction[]> {
    try {
      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      } else {
        query = query.in('type', ['deposit', 'withdraw']);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Get user details separately to avoid foreign key issues
      const transactionsWithUsers = [];
      for (const transaction of transactions || []) {
        const { data: user } = await supabase
          .from('users')
          .select('username, email, display_name')
          .eq('auth_user_id', transaction.user_id)
          .maybeSingle();

        transactionsWithUsers.push({
          ...transaction,
          user: user || { username: 'Unknown', email: 'Unknown', display_name: 'Unknown User' }
        });
      }

      return transactionsWithUsers;
    } catch (error) {
      console.error('❌ Error getting pending transactions:', error);
      return [];
    }
  }

  /**
   * Check if user has sufficient balance for bet
   */
  static async canPlaceBet(userId: string, betAmount: number): Promise<boolean> {
    try {
      const balance = await this.getBalance(userId);
      return balance ? balance.balance >= betAmount : false;
    } catch (error) {
      console.error('❌ Error checking bet eligibility:', error);
      return false;
    }
  }
}
