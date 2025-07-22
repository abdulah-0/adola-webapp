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
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', deposit.user_id)
        .maybeSingle();

      if (walletError || !wallet) {
        return {
          success: false,
          error: 'User wallet not found'
        };
      }

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

      // Update wallet transaction status for the original deposit
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'approved',
          balance_before: balanceBefore,
          balance_after: balanceBefore + depositAmount, // Only the deposit amount
          description: `Deposit approved - PKR ${depositAmount} (+ PKR ${bonusAmount} bonus)`
        })
        .eq('reference_id', depositId)
        .eq('type', 'deposit');

      if (txError) {
        console.error('❌ Error updating transaction status:', txError);
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

      // Update the corresponding wallet transaction
      const { error: txUpdateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'rejected',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          admin_notes: reason
        })
        .eq('reference_id', depositId)
        .eq('type', 'deposit');

      if (txUpdateError) {
        console.error('❌ Error updating transaction:', txUpdateError);
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
        'zarbonics': 'ZARBONICS SOLUTIONS',
        'zoraz': 'Zoraz Yousaf',
        'UBL Bank': 'UBL Bank' // Fallback for old entries
      };

      // Get user details separately and format data
      const depositsWithUsers = [];
      for (const deposit of depositRequests || []) {
        const { data: user } = await supabase
          .from('users')
          .select('username, email, display_name')
          .eq('auth_user_id', deposit.user_id)
          .maybeSingle();

        // Get bank account name from mapping
        const bankAccountName = bankAccountMap[deposit.bank_account_id] || deposit.bank_account_id || 'Unknown Bank';

        depositsWithUsers.push({
          id: deposit.id,
          userId: deposit.user_id,
          userEmail: user?.email || 'Unknown',
          userName: user?.username || user?.display_name || 'Unknown User',
          amount: Number(deposit.amount),
          bankAccountId: deposit.bank_account_id,
          bankAccountName: bankAccountName,
          transactionId: deposit.transaction_id || '',
          receiptImage: deposit.receipt_image || '',
          status: deposit.status,
          createdAt: new Date(deposit.created_at),
          adminNotes: deposit.admin_notes || '',
          metadata: deposit.metadata || {}
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
        const { data: user } = await supabase
          .from('users')
          .select('username, email, display_name')
          .eq('auth_user_id', withdrawal.user_id)
          .maybeSingle();

        // Debug: Log bank_details structure
        console.log('🔍 Debug - withdrawal.bank_details:', withdrawal.bank_details);

        // Ensure bank_details is properly structured
        const bankDetails = withdrawal.bank_details || {};

        withdrawalsWithUsers.push({
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
