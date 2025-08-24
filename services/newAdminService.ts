// New Admin Service - Following Requirements Document
// Implements admin operations for wallet management using secure RPC functions

import { supabase } from '../lib/supabase';
import { TransactionResult } from './newWalletService';

export class NewAdminService {
  
  /**
   * Approve deposit request - Direct table approach
   */
  static async approveDeposit(
    depositId: string,
    adminId: string,
    adminNotes: string = ''
  ): Promise<TransactionResult> {
    try {
      console.log(`🔄 Starting deposit approval process for ID: ${depositId}, Admin: ${adminId}`);

      // Validate inputs
      if (!depositId || !adminId) {
        console.error('❌ Missing required parameters:', { depositId, adminId });
        return {
          success: false,
          error: 'Missing deposit ID or admin ID'
        };
      }

      // Get deposit request
      const { data: deposit, error: depositError } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', depositId)
        .maybeSingle();

      if (depositError || !deposit) {
        console.error('❌ Deposit request not found:', depositError);
        return {
          success: false,
          error: 'Deposit request not found'
        };
      }

      if (deposit.status !== 'pending') {
        console.error('❌ Deposit request already processed:', deposit.status);
        return {
          success: false,
          error: 'Deposit request already processed'
        };
      }

      console.log(`✅ Found pending deposit: PKR ${deposit.amount} for user ${deposit.user_id}`);

      // Get current wallet balance
      console.log(`🔄 Looking up wallet for user: ${deposit.user_id}`);
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', deposit.user_id)
        .maybeSingle();

      let wallet = walletData;

      if (walletError) {
        console.error('❌ Error fetching wallet:', walletError);
        return {
          success: false,
          error: `Wallet lookup failed: ${walletError.message}`
        };
      }

      if (!wallet) {
        console.error('❌ No wallet found for user:', deposit.user_id);
        console.log('🔧 Creating missing wallet for user...');

        // Create wallet for user if it doesn't exist
        const { data: newWallet, error: createWalletError } = await supabase
          .from('wallets')
          .insert({
            user_id: deposit.user_id,
            balance: 0,
            total_deposited: 0,
            referral_earnings: 0,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createWalletError) {
          console.error('❌ Failed to create wallet:', createWalletError);
          return {
            success: false,
            error: `Failed to create user wallet: ${createWalletError.message}`
          };
        }

        console.log('✅ Created new wallet for user');
        wallet = newWallet;
      }

      console.log(`✅ Found wallet with balance: PKR ${wallet.balance}`);

      const balanceBefore = parseFloat((wallet.balance || 0).toString());
      const depositAmount = parseFloat((deposit.amount || 0).toString());

      // Calculate 5% bonus for every deposit
      const bonusAmount = Math.floor(depositAmount * 0.05);
      const totalAmount = depositAmount + bonusAmount;
      const balanceAfter = balanceBefore + totalAmount;

      console.log(`💰 Processing deposit: PKR ${depositAmount} + 5% bonus (PKR ${bonusAmount}) = PKR ${totalAmount} total`);

      // Update wallet balance with deposit + bonus
      console.log(`💰 Updating wallet: ${balanceBefore} + ${totalAmount} = ${balanceAfter}`);
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: balanceAfter,
          total_deposited: parseFloat((wallet.total_deposited || 0).toString()) + depositAmount
        })
        .eq('user_id', deposit.user_id);

      if (updateError) {
        console.error('❌ Error updating wallet balance:', updateError);
        return {
          success: false,
          error: updateError.message
        };
      }
      console.log(`✅ Wallet balance updated successfully`);

      // Update deposit request status
      console.log(`🔄 Updating deposit status to approved...`);
      const { error: statusError } = await supabase
        .from('deposit_requests')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', depositId);

      if (statusError) {
        console.error('❌ Error updating deposit status:', statusError);
        return {
          success: false,
          error: `Failed to update deposit status: ${statusError.message}`
        };
      }
      console.log(`✅ Deposit status updated to approved`);

      // Create wallet transaction record for the approved deposit
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: deposit.user_id,
          type: 'deposit',
          status: 'approved',
          amount: depositAmount,
          balance_before: balanceBefore,
          balance_after: balanceBefore + depositAmount,
          description: `Deposit approved - PKR ${depositAmount} (+ PKR ${bonusAmount} bonus)`,
          metadata: deposit.metadata,
          reference_id: depositId,
          approved_by: adminId,
          approved_at: new Date().toISOString()
        });

      if (txError) {
        console.error('❌ Error creating transaction record:', txError);
      }

      // Create a separate transaction record for the 5% deposit bonus
      if (bonusAmount > 0) {
        const { error: bonusError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: deposit.user_id,
            type: 'deposit_bonus',
            status: 'approved',
            amount: bonusAmount,
            balance_before: balanceBefore + depositAmount,
            balance_after: balanceAfter,
            description: `5% Deposit Bonus - PKR ${bonusAmount} (on PKR ${depositAmount} deposit)`,
            metadata: {
              original_deposit_id: depositId,
              original_deposit_amount: depositAmount,
              bonus_percentage: 5
            },
            approved_by: adminId,
            approved_at: new Date().toISOString()
          });

        if (bonusError) {
          console.error('❌ Error creating bonus transaction:', bonusError);
        } else {
          console.log(`✅ 5% deposit bonus added: PKR ${bonusAmount} for user ${deposit.user_id}`);
        }
      }

      // Check if this user was referred by someone and give referrer 5% bonus
      // Wrap in try-catch to ensure deposit approval doesn't fail if referral bonus fails
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('referred_by_user_id, username')
          .eq('auth_user_id', deposit.user_id)
          .maybeSingle();

        if (!userError && userData && userData.referred_by_user_id) {
          const referrerBonus = Math.floor(depositAmount * 0.05);

          if (referrerBonus > 0) {
            console.log(`💰 Processing referral bonus: PKR ${referrerBonus} for referrer of ${userData.username}`);

            // Get referrer's current wallet balance
            const { data: referrerWallet, error: referrerWalletError } = await supabase
              .from('wallets')
              .select('balance, referral_earnings')
              .eq('user_id', userData.referred_by_user_id)
              .maybeSingle();

            if (!referrerWalletError && referrerWallet) {
              const referrerBalanceBefore = parseFloat((referrerWallet.balance || 0).toString());
              const referrerBalanceAfter = referrerBalanceBefore + referrerBonus;
              const currentReferralEarnings = parseFloat((referrerWallet.referral_earnings || 0).toString());

              // Update referrer's wallet balance and referral earnings
              const { error: referrerUpdateError } = await supabase
                .from('wallets')
                .update({
                  balance: referrerBalanceAfter,
                  referral_earnings: currentReferralEarnings + referrerBonus
                })
                .eq('user_id', userData.referred_by_user_id);

              if (!referrerUpdateError) {
                // Create referral bonus transaction for referrer
                const { error: referralTxError } = await supabase
                  .from('wallet_transactions')
                  .insert({
                    user_id: userData.referred_by_user_id,
                    type: 'referral_deposit_bonus',
                    status: 'approved',
                    amount: referrerBonus,
                    balance_before: referrerBalanceBefore,
                    balance_after: referrerBalanceAfter,
                    description: `5% Referral Bonus - PKR ${referrerBonus} (from ${userData.username}'s PKR ${depositAmount} deposit)`,
                    metadata: {
                      referred_user_id: deposit.user_id,
                      referred_username: userData.username,
                      original_deposit_id: depositId,
                      original_deposit_amount: depositAmount,
                      bonus_percentage: 5
                    },
                    approved_by: adminId,
                    approved_at: new Date().toISOString()
                  });

                if (!referralTxError) {
                  console.log(`✅ 5% referral bonus given: PKR ${referrerBonus} to referrer of ${userData.username}`);
                } else {
                  console.error('❌ Error creating referral bonus transaction:', referralTxError);
                }
              } else {
                console.error('❌ Error updating referrer wallet:', referrerUpdateError);
              }
            } else {
              console.error('❌ Error fetching referrer wallet:', referrerWalletError);
            }
          }
        } else if (userError) {
          console.error('❌ Error fetching user referral data:', userError);
        }
      } catch (referralError) {
        console.error('❌ Error processing referral bonus (non-blocking):', referralError);
        // Continue with deposit approval even if referral bonus fails
      }

      console.log(`✅ Deposit approved successfully: ${depositId} - PKR ${depositAmount} + PKR ${bonusAmount} bonus = PKR ${totalAmount} total`);

      return {
        success: true,
        userId: deposit.user_id,
        amount: depositAmount,
        bonusAmount: bonusAmount,
        totalAmount: totalAmount,
        newBalance: balanceAfter,
        message: `Deposit approved with 5% bonus! PKR ${depositAmount} + PKR ${bonusAmount} bonus = PKR ${totalAmount} total`
      };
    } catch (error) {
      console.error('❌ Error approving deposit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve deposit'
      };
    }
  }

  /**
   * Approve withdrawal request - Direct table approach
   */
  static async approveWithdrawal(
    withdrawalId: string,
    adminId: string,
    adminNotes: string = ''
  ): Promise<TransactionResult> {
    try {
      // Get withdrawal request
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', withdrawalId)
        .maybeSingle();

      if (withdrawalError || !withdrawal) {
        return {
          success: false,
          error: 'Withdrawal request not found'
        };
      }

      if (withdrawal.status !== 'pending') {
        return {
          success: false,
          error: 'Withdrawal request already processed'
        };
      }

      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', withdrawal.user_id)
        .maybeSingle();

      if (walletError || !wallet) {
        return {
          success: false,
          error: 'User wallet not found'
        };
      }

      const balanceBefore = parseFloat((wallet.balance || 0).toString());
      const withdrawalAmount = parseFloat((withdrawal.amount || 0).toString());

      // Check if user still has sufficient balance
      if (balanceBefore < withdrawalAmount) {
        return {
          success: false,
          error: 'Insufficient balance'
        };
      }

      const balanceAfter = balanceBefore - withdrawalAmount;

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: balanceAfter,
          total_withdrawn: parseFloat((wallet.total_withdrawn || 0).toString()) + withdrawalAmount
        })
        .eq('user_id', withdrawal.user_id);

      if (updateError) {
        return {
          success: false,
          error: updateError.message
        };
      }

      // Update withdrawal request status
      const { error: statusError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', withdrawalId);

      if (statusError) {
        console.error('❌ Error updating withdrawal status:', statusError);
      }

      // Update wallet transaction status
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'approved',
          balance_before: balanceBefore,
          balance_after: balanceAfter
        })
        .eq('reference_id', withdrawalId)
        .eq('type', 'withdraw');

      if (txError) {
        console.error('❌ Error updating transaction status:', txError);
      }

      console.log(`✅ Withdrawal approved: ${withdrawalId} - Balance decreased by PKR ${withdrawalAmount}`);

      return {
        success: true,
        new_balance: balanceAfter,
        message: 'Withdrawal approved successfully'
      };
    } catch (error) {
      console.error('❌ Error approving withdrawal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve withdrawal'
      };
    }
  }

  /**
   * Reject deposit request
   */
  static async rejectDeposit(
    depositId: string,
    adminId: string,
    reason: string = 'Rejected by admin'
  ): Promise<TransactionResult> {
    try {
      // Get the deposit request
      const { data: depositRequest, error: fetchError } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', depositId)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError || !depositRequest) {
        return { success: false, error: 'Deposit request not found or already processed' };
      }

      // Update deposit request status
      const { error: updateError } = await supabase
        .from('deposit_requests')
        .update({
          status: 'rejected',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          admin_notes: reason
        })
        .eq('id', depositId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Create wallet transaction record for the rejected deposit
      const { error: txCreateError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: depositRequest.user_id,
          type: 'deposit',
          status: 'rejected',
          amount: depositRequest.amount,
          balance_before: 0, // No balance change for rejected deposits
          balance_after: 0,
          description: `Deposit rejected - ${reason}`,
          metadata: depositRequest.metadata,
          reference_id: depositId,
          approved_by: adminId,
          approved_at: new Date().toISOString()
        });

      if (txCreateError) {
        console.error('❌ Error creating transaction record:', txCreateError);
      }

      console.log('✅ Deposit rejected successfully:', depositId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error rejecting deposit:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to reject deposit' };
    }
  }

  /**
   * Reject withdrawal request
   */
  static async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    reason: string = 'Rejected by admin'
  ): Promise<TransactionResult> {
    try {
      // Get the withdrawal request
      const { data: withdrawalRequest, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', withdrawalId)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError || !withdrawalRequest) {
        return { success: false, error: 'Withdrawal request not found or already processed' };
      }

      // Update withdrawal request status
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          admin_notes: reason
        })
        .eq('id', withdrawalId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Update the corresponding wallet transaction
      const { error: txUpdateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'rejected',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          admin_notes: reason
        })
        .eq('reference_id', withdrawalId)
        .eq('type', 'withdraw');

      if (txUpdateError) {
        console.error('❌ Error updating transaction:', txUpdateError);
      }

      console.log('✅ Withdrawal rejected successfully:', withdrawalId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error rejecting withdrawal:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to reject withdrawal' };
    }
  }

  /**
   * Reject transaction (deposit or withdrawal)
   */
  static async rejectTransaction(
    transactionId: string,
    adminId: string,
    reason: string = 'Rejected by admin'
  ): Promise<TransactionResult> {
    try {
      const { data, error } = await supabase.rpc('reject_transaction', {
        p_tx_id: transactionId,
        p_admin_id: adminId,
        p_reason: reason
      });

      if (error) throw error;

      if (data.success) {
        console.log(`✅ Transaction rejected: ${transactionId} - ${reason}`);
      }

      return {
        success: data.success,
        transaction_id: data.transaction_id,
        message: data.message,
        error: data.error
      };
    } catch (error) {
      console.error('❌ Error rejecting transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject transaction'
      };
    }
  }

  /**
   * Get all pending deposits
   */
  static async getPendingDeposits() {
    try {
      // Get pending deposit requests (not wallet transactions)
      const { data: depositRequests, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Bank account mapping
      const bankAccountMap = {
        'zoraz': 'Account 2',
        'UBL Bank': 'UBL Bank' // Fallback for old entries
      };

      // USDT account mapping
      const usdtAccountMap = {
        'usdt_account_1': 'USDT Account 1',
        'usdt_account_2': 'USDT Account 2'
      };

      // Get user details separately and format data
      const depositsWithUsers = [];
      for (const deposit of depositRequests || []) {
        // Try both auth_user_id and id fields to find the user
        let user = null;

        // First try with auth_user_id
        const { data: userByAuth } = await supabase
          .from('users')
          .select('username, email, display_name')
          .eq('auth_user_id', deposit.user_id)
          .maybeSingle();

        if (userByAuth) {
          user = userByAuth;
        } else {
          // If not found, try with id field
          const { data: userById } = await supabase
            .from('users')
            .select('username, email, display_name')
            .eq('id', deposit.user_id)
            .maybeSingle();
          user = userById;
        }

        // Determine payment method from metadata
        const metadata = deposit.metadata || {};
        const paymentMethod = metadata.method || 'bank_transfer';

        // Get account details based on payment method
        let accountName = '';
        let accountId = '';
        let transactionRef = '';
        let usdtAddress = '';

        if (paymentMethod === 'usdt_trc20') {
          accountId = metadata.usdt_account_id || '';
          accountName = usdtAccountMap[accountId] || accountId || 'Unknown USDT Account';
          transactionRef = metadata.transaction_hash || '';
          // Get USDT address from USDT_ACCOUNTS
          if (accountId === 'usdt_account_1') {
            usdtAddress = 'TCqKH497p5J6Tjc4tafA5m5qmqw54JsYLj';
          } else if (accountId === 'usdt_account_2') {
            usdtAddress = 'TMcSyNNPx8zC523MsqqEGAUEwYFHgWN2ap';
          }
        } else {
          accountId = deposit.bank_account_id || metadata.bank_account_id || '';
          accountName = bankAccountMap[accountId] || accountId || 'Unknown Bank';
          transactionRef = deposit.transaction_id || metadata.transaction_id || '';
        }

        // Determine currency and amounts
        const currency = metadata.currency || 'PKR';
        const originalAmount = metadata.original_inr_amount || Number(deposit.amount);
        const displayAmount = currency === 'INR' ? originalAmount : Number(deposit.amount);

        depositsWithUsers.push({
          id: deposit.id,
          userId: deposit.user_id,
          userEmail: user?.email || 'Unknown',
          userName: user?.username || user?.display_name || 'Unknown User',
          amount: Number(deposit.amount), // Always PKR amount for backend processing
          paymentMethod: paymentMethod,
          bankAccountId: paymentMethod === 'bank_transfer' ? accountId : undefined,
          bankAccountName: paymentMethod === 'bank_transfer' ? accountName : undefined,
          usdtAccountId: paymentMethod === 'usdt_trc20' ? accountId : undefined,
          usdtAccountName: paymentMethod === 'usdt_trc20' ? accountName : undefined,
          usdtAddress: paymentMethod === 'usdt_trc20' ? usdtAddress : undefined,
          transactionId: paymentMethod === 'bank_transfer' ? transactionRef : undefined,
          transactionHash: paymentMethod === 'usdt_trc20' ? transactionRef : undefined,
          receiptImage: deposit.receipt_image || '',
          status: deposit.status,
          createdAt: new Date(deposit.created_at),
          adminNotes: deposit.admin_notes || '',
          metadata: metadata,
          currency: currency,
          originalAmount: originalAmount,
          displayAmount: displayAmount
        });
      }

      return depositsWithUsers;
    } catch (error) {
      console.error('❌ Error getting pending deposits:', error);
      return [];
    }
  }

  /**
   * Get all pending withdrawals
   */
  static async getPendingWithdrawals() {
    try {
      // Get pending withdrawal requests (not wallet transactions)
      const { data: withdrawalRequests, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user details separately and format data properly
      const withdrawalsWithUsers = [];
      for (const withdrawal of withdrawalRequests || []) {
        // Try both auth_user_id and id fields to find the user
        let user = null;

        // First try with auth_user_id
        const { data: userByAuth } = await supabase
          .from('users')
          .select('username, email, display_name')
          .eq('auth_user_id', withdrawal.user_id)
          .maybeSingle();

        if (userByAuth) {
          user = userByAuth;
        } else {
          // If not found, try with id field
          const { data: userById } = await supabase
            .from('users')
            .select('username, email, display_name')
            .eq('id', withdrawal.user_id)
            .maybeSingle();
          user = userById;
        }

        // Determine withdrawal method from metadata or bank_details presence
        const metadata = withdrawal.metadata || {};
        const withdrawalMethod = metadata.method || (withdrawal.bank_details ? 'bank_transfer' : 'usdt_trc20');

        // Debug: Log withdrawal details structure
        console.log('🔍 Debug - withdrawal method:', withdrawalMethod);
        console.log('🔍 Debug - withdrawal.bank_details:', withdrawal.bank_details);
        console.log('🔍 Debug - withdrawal.metadata:', metadata);

        let bankDetails = undefined;
        let usdtDetails = undefined;

        if (withdrawalMethod === 'bank_transfer') {
          // Handle bank transfer withdrawal
          const bankData = withdrawal.bank_details || metadata.bank_details || {};
          bankDetails = {
            accountTitle: bankData.accountTitle || '',
            accountNumber: bankData.accountNumber || '',
            iban: bankData.iban || '',
            bank: bankData.bank || '',
          };
        } else {
          // Handle USDT withdrawal
          const usdtData = metadata.usdt_details || {};
          usdtDetails = {
            usdtAddress: usdtData.usdtAddress || '',
            usdtAmount: usdtData.usdtAmount || 0,
            pkrEquivalent: usdtData.pkrEquivalent || Number(withdrawal.amount),
          };
        }

        // Determine currency and amounts
        const currency = metadata.currency || 'PKR';
        const originalAmount = metadata.original_inr_amount || Number(withdrawal.amount);
        const displayAmount = currency === 'INR' ? originalAmount : Number(withdrawal.amount);

        withdrawalsWithUsers.push({
          id: withdrawal.id,
          userId: withdrawal.user_id,
          userEmail: user?.email || 'Unknown',
          userName: user?.username || user?.display_name || 'Unknown',
          amount: Number(withdrawal.amount), // Always PKR amount for backend processing
          deductionAmount: Number(withdrawal.deduction_amount || 0),
          finalAmount: Number(withdrawal.final_amount || withdrawal.amount),
          withdrawalMethod: withdrawalMethod,
          bankDetails: bankDetails,
          usdtDetails: usdtDetails,
          status: 'pending' as const,
          createdAt: new Date(withdrawal.created_at),
          adminNotes: withdrawal.admin_notes || '',
          metadata: metadata,
          currency: currency,
          originalAmount: originalAmount,
          displayAmount: displayAmount
        });
      }

      return withdrawalsWithUsers;
    } catch (error) {
      console.error('❌ Error getting pending withdrawals:', error);
      return [];
    }
  }

  /**
   * Get wallet statistics for admin dashboard
   */
  static async getWalletStats() {
    try {
      // Get total balances
      const { data: totalBalances, error: balanceError } = await supabase
        .from('wallets')
        .select('balance');

      if (balanceError) throw balanceError;

      // Get transaction counts
      const { data: transactionCounts, error: countError } = await supabase
        .from('wallet_transactions')
        .select('type, status');

      if (countError) throw countError;

      // Calculate statistics
      const totalWalletBalance = totalBalances?.reduce((sum, wallet) => sum + parseFloat(wallet.balance), 0) || 0;

      const pendingDeposits = transactionCounts?.filter(t => t.type === 'deposit' && t.status === 'pending').length || 0;
      const pendingWithdrawals = transactionCounts?.filter(t => t.type === 'withdraw' && t.status === 'pending').length || 0;
      const approvedDeposits = transactionCounts?.filter(t => t.type === 'deposit' && t.status === 'approved').length || 0;
      const approvedWithdrawals = transactionCounts?.filter(t => t.type === 'withdraw' && t.status === 'approved').length || 0;

      return {
        totalWalletBalance,
        pendingDeposits,
        pendingWithdrawals,
        approvedDeposits,
        approvedWithdrawals,
        totalUsers: totalBalances?.length || 0
      };
    } catch (error) {
      console.error('❌ Error getting wallet stats:', error);
      return {
        totalWalletBalance: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        approvedDeposits: 0,
        approvedWithdrawals: 0,
        totalUsers: 0
      };
    }
  }

  /**
   * Get real-time dashboard statistics with proper today's activity
   */
  static async getDashboardStats() {
    try {
      console.log('📊 Fetching real-time dashboard statistics...');

      // Get current date boundaries for today's stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayStartISO = todayStart.toISOString();

      console.log(`📅 Today's date range: ${todayStartISO} to ${now.toISOString()}`);

      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, auth_user_id, created_at, status, wallet_balance');

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        throw usersError;
      }

      // Get all deposit requests
      const { data: depositRequests, error: depositError } = await supabase
        .from('deposit_requests')
        .select('id, amount, status, created_at, approved_at');

      if (depositError) {
        console.error('❌ Error fetching deposit requests:', depositError);
        throw depositError;
      }

      // Get all withdrawal requests
      const { data: withdrawalRequests, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('id, amount, status, created_at, approved_at');

      if (withdrawalError) {
        console.error('❌ Error fetching withdrawal requests:', withdrawalError);
        throw withdrawalError;
      }

      // Get game sessions
      const { data: gameSessions, error: gameError } = await supabase
        .from('game_sessions')
        .select('bet_amount, win_amount, created_at');

      if (gameError) {
        console.error('❌ Error fetching game sessions:', gameError);
      }

      // Calculate total statistics
      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter(u => u.status === 'active').length || 0;

      // Calculate total deposits and withdrawals (approved only)
      const totalDeposits = depositRequests
        ?.filter(d => d.status === 'approved')
        .reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0;

      const totalWithdrawals = withdrawalRequests
        ?.filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + Number(w.amount || 0), 0) || 0;

      // Calculate pending amounts
      const pendingDeposits = depositRequests
        ?.filter(d => d.status === 'pending')
        .reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0;

      const pendingWithdrawals = withdrawalRequests
        ?.filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + Number(w.amount || 0), 0) || 0;

      // Calculate game revenue
      const totalGameRevenue = totalDeposits - totalWithdrawals;
      const totalReferralBonuses = 0; // TODO: Calculate from referral system

      // Calculate TODAY'S statistics with proper date filtering
      const todayUsers = users?.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate >= todayStart;
      }).length || 0;

      const todayDepositRequests = depositRequests?.filter(d => {
        const requestDate = new Date(d.created_at);
        return requestDate >= todayStart;
      }) || [];

      const todayWithdrawalRequests = withdrawalRequests?.filter(w => {
        const requestDate = new Date(w.created_at);
        return requestDate >= todayStart;
      }) || [];

      // Today's approved amounts (approved today OR created today and approved)
      const todayDeposits = depositRequests?.filter(d => {
        const createdToday = new Date(d.created_at) >= todayStart;
        const approvedToday = d.approved_at && new Date(d.approved_at) >= todayStart;
        return d.status === 'approved' && (createdToday || approvedToday);
      }).reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0;

      const todayWithdrawals = withdrawalRequests?.filter(w => {
        const createdToday = new Date(w.created_at) >= todayStart;
        const approvedToday = w.approved_at && new Date(w.approved_at) >= todayStart;
        return w.status === 'approved' && (createdToday || approvedToday);
      }).reduce((sum, w) => sum + Number(w.amount || 0), 0) || 0;

      // Today's pending amounts
      const todayPendingDeposits = todayDepositRequests
        .filter(d => d.status === 'pending')
        .reduce((sum, d) => sum + Number(d.amount || 0), 0);

      const todayPendingWithdrawals = todayWithdrawalRequests
        .filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + Number(w.amount || 0), 0);

      // Today's game statistics
      const todayGameSessions = gameSessions?.filter(session => {
        const sessionDate = new Date(session.created_at);
        return sessionDate >= todayStart;
      }) || [];

      const todayGamesPlayed = todayGameSessions.length;
      const todayBets = todayGameSessions.reduce((sum, s) => sum + Number(s.bet_amount || 0), 0);
      const todayGameRevenue = todayDeposits - todayWithdrawals;

      const stats = {
        totalUsers,
        activeUsers,
        totalDeposits,
        totalWithdrawals,
        pendingDeposits,
        pendingWithdrawals,
        totalGameRevenue,
        totalReferralBonuses,
        todayStats: {
          newUsers: todayUsers,
          deposits: todayDeposits,
          withdrawals: todayWithdrawals,
          gameRevenue: todayGameRevenue,
          pendingDeposits: todayPendingDeposits,
          pendingWithdrawals: todayPendingWithdrawals,
          depositRequests: todayDepositRequests.length,
          withdrawalRequests: todayWithdrawalRequests.length,
          gamesPlayed: todayGamesPlayed,
          totalBets: todayBets,
        },
      };

      console.log(`📊 Real-time stats calculated:`, {
        totalUsers: stats.totalUsers,
        todayUsers: stats.todayStats.newUsers,
        todayDeposits: stats.todayStats.deposits,
        todayWithdrawals: stats.todayStats.withdrawals,
        todayDepositRequests: stats.todayStats.depositRequests,
        todayWithdrawalRequests: stats.todayStats.withdrawalRequests,
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting dashboard stats:', error);
      // Return fallback data
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
          pendingDeposits: 0,
          pendingWithdrawals: 0,
          depositRequests: 0,
          withdrawalRequests: 0,
          gamesPlayed: 0,
          totalBets: 0,
        },
      };
    }
  }

  /**
   * Get user wallet details for admin
   */
  static async getUserWallet(userId: string) {
    try {
      // Get wallet without foreign key join
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) throw walletError;

      // Get user details separately
      const { data: user } = await supabase
        .from('users')
        .select('username, email, display_name')
        .eq('auth_user_id', userId)
        .maybeSingle();

      const { data: transactions, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txError) throw txError;

      return {
        wallet: {
          ...wallet,
          user: user || { username: 'Unknown', email: 'Unknown', display_name: 'Unknown User' }
        },
        transactions: transactions || []
      };
    } catch (error) {
      console.error('❌ Error getting user wallet:', error);
      return null;
    }
  }
}
