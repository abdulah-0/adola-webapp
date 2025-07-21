// Transaction Service for Deposit and Withdrawal Requests
// Migrated from Firebase to Supabase following requirements document

import { supabase, supabaseAvailable } from "../lib/supabase";
import {
  createTransaction,
  getUserTransactions,
  updateTransactionStatus,
  getAllTransactions
} from "./supabaseDatabase";
import AsyncStorage from '@react-native-async-storage/async-storage';


/**
 * Transaction Request Interface
 */
export const TransactionTypes = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal'
};

export const TransactionStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

/**
 * Submit Deposit Request
 * Stores deposit request in database for admin approval
 */
export const submitDepositRequest = async (userId, depositData) => {
  try {
    console.log('🔄 Submitting deposit request:', { userId, depositData });
    const transactionId = 'dep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    
    const depositRequest = {
      user_id: userId,
      type: TransactionTypes.DEPOSIT,
      status: TransactionStatus.PENDING,
      amount: depositData.amount,
      payment_method: depositData.method, // 'bank_transfer'
      bank_details: {
        account_name: depositData.accountName,
        account_number: depositData.accountNumber,
        bank_name: depositData.bankName,
        transaction_id: depositData.transactionId,
        screenshot: depositData.screenshot
      },
      reference_id: transactionId,
      admin_notes: '',
      user_notes: depositData.notes || ''
    };

    if (supabaseAvailable) {
      // Store in Supabase
      const result = await createTransaction(depositRequest);

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('✅ Deposit request stored in Supabase:', result.data.id);
    } else {
      // Store in AsyncStorage for mock implementation
      const transactions = await getMockTransactions();
      transactions.push(depositRequest);
      await AsyncStorage.setItem('mockTransactions', JSON.stringify(transactions));
      
      console.log('✅ Deposit request stored in mock storage:', transactionId);
    }

    return {
      success: true,
      transactionId: transactionId,
      message: 'Deposit request submitted successfully'
    };
  } catch (error) {
    console.error('❌ Error submitting deposit request:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit deposit request'
    };
  }
};

/**
 * Submit Withdrawal Request
 * Stores withdrawal request in database for admin approval
 */
export const submitWithdrawalRequest = async (userId, withdrawalData) => {
  try {
    console.log('🔄 Submitting withdrawal request:', { userId, withdrawalData });
    const transactionId = 'wit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    
    const withdrawalRequest = {
      id: transactionId,
      userId: userId,
      type: TransactionTypes.WITHDRAWAL,
      status: TransactionStatus.PENDING,
      amount: withdrawalData.amount,
      method: withdrawalData.method, // 'bank_transfer'
      bankDetails: {
        accountName: withdrawalData.accountName,
        accountNumber: withdrawalData.accountNumber,
        bankName: withdrawalData.bankName,
        iban: withdrawalData.iban
      },
      requestDate: new Date(),
      processedDate: null,
      processedBy: null,
      adminNotes: '',
      userNotes: withdrawalData.notes || '',
      deductionAmount: Math.ceil(withdrawalData.amount * 0.01), // 1% deduction
      finalAmount: withdrawalData.amount - Math.ceil(withdrawalData.amount * 0.01)
    };

    let result = null;

    if (supabaseAvailable) {
      // Store in Supabase
      result = await createTransaction({
        user_id: userId,
        type: 'withdrawal',
        amount: withdrawalData.amount,
        status: 'pending',
        payment_method: 'bank_transfer',
        bank_details: {
          account_name: withdrawalData.accountName,
          account_number: withdrawalData.accountNumber,
          bank_name: withdrawalData.bankName,
          iban: withdrawalData.iban
        },
        user_notes: withdrawalData.notes || '',
        reference_id: transactionId
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create withdrawal transaction');
      }

      console.log('✅ Withdrawal request stored in Supabase:', result.data?.id);
    } else {
      // Store in AsyncStorage for mock implementation
      const transactions = await getMockTransactions();
      transactions.push(withdrawalRequest);
      await AsyncStorage.setItem('mockTransactions', JSON.stringify(transactions));
      
      console.log('✅ Withdrawal request stored in mock storage:', transactionId);
    }

    return {
      success: true,
      transactionId: result?.data?.id || transactionId,
      message: 'Withdrawal request submitted successfully'
    };
  } catch (error) {
    console.error('❌ Error submitting withdrawal request:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit withdrawal request'
    };
  }
};

/**
 * Get All Transaction Requests for Admin Panel
 * Returns all pending, approved, and rejected requests
 */
export const getAllTransactionRequests = async () => {
  try {
    console.log('🔄 Getting all transaction requests...');
    if (supabaseAvailable) {
      // Get deposit requests from Supabase
      const { data: depositRequests, error: depositError } = await supabase
        .from('deposit_requests')
        .select(`
          id,
          user_id,
          amount,
          status,
          bank_account_id,
          transaction_id,
          created_at,
          approved_at,
          approved_by,
          admin_notes,
          metadata
        `)
        .order('created_at', { ascending: false });

      if (depositError) {
        console.error('❌ Error fetching deposit requests:', depositError);
      }

      // Get withdrawal requests from Supabase
      const { data: withdrawalRequests, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select(`
          id,
          user_id,
          amount,
          status,
          bank_details,
          deduction_amount,
          final_amount,
          created_at,
          approved_at,
          approved_by,
          admin_notes
        `)
        .order('created_at', { ascending: false });

      if (withdrawalError) {
        console.error('❌ Error fetching withdrawal requests:', withdrawalError);
      }

      // Combine and format transactions
      const transactions = [];

      // Safe date conversion helper
      const safeCreateDate = (dateString) => {
        try {
          if (!dateString) return new Date();
          const date = new Date(dateString);
          return isNaN(date.getTime()) ? new Date() : date;
        } catch {
          return new Date();
        }
      };

      // Add deposit requests
      if (depositRequests) {
        depositRequests.forEach(deposit => {
          transactions.push({
            id: deposit.id,
            userId: deposit.user_id,
            type: TransactionTypes.DEPOSIT,
            amount: parseFloat(deposit.amount.toString()),
            status: deposit.status,
            requestDate: safeCreateDate(deposit.created_at),
            processedDate: deposit.approved_at ? safeCreateDate(deposit.approved_at) : null,
            adminNotes: deposit.admin_notes,
            metadata: {
              bankAccountId: deposit.bank_account_id,
              transactionId: deposit.transaction_id,
              ...deposit.metadata
            }
          });
        });
      }

      // Add withdrawal requests
      if (withdrawalRequests) {
        withdrawalRequests.forEach(withdrawal => {
          transactions.push({
            id: withdrawal.id,
            userId: withdrawal.user_id,
            type: TransactionTypes.WITHDRAWAL,
            amount: parseFloat(withdrawal.amount.toString()),
            status: withdrawal.status,
            requestDate: safeCreateDate(withdrawal.created_at),
            processedDate: withdrawal.approved_at ? safeCreateDate(withdrawal.approved_at) : null,
            adminNotes: withdrawal.admin_notes,
            metadata: {
              bankDetails: withdrawal.bank_details,
              deductionAmount: withdrawal.deduction_amount,
              finalAmount: withdrawal.final_amount
            }
          });
        });
      }

      // Sort by request date (newest first)
      transactions.sort((a, b) => b.requestDate - a.requestDate);

      console.log('✅ Transaction requests fetched from Supabase:', transactions.length);
      return transactions;
    } else {
      // Get from mock storage
      const transactions = await getMockTransactions();
      console.log('✅ Transaction requests fetched from mock storage:', transactions.length);
      return transactions;
    }
  } catch (error) {
    console.error('❌ Error fetching transaction requests:', error);
    return [];
  }
};

/**
 * Approve Transaction Request
 * Updates transaction status to approved and processes the transaction
 */
export const approveTransactionRequest = async (transactionId, adminId, adminNotes = '') => {
  try {
    if (supabaseAvailable) {
      // First, determine if this is a deposit or withdrawal request
      const { data: depositRequest } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      const { data: withdrawalRequest } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      if (depositRequest) {
        // Use the NewAdminService to approve deposit
        const { NewAdminService } = await import('./newAdminService');
        const result = await NewAdminService.approveDeposit(transactionId, adminId);

        if (result.success) {
          console.log('✅ Deposit approved via NewAdminService:', transactionId);
          return { success: true, message: 'Deposit approved successfully' };
        } else {
          throw new Error(result.error);
        }
      } else if (withdrawalRequest) {
        // Use the NewAdminService to approve withdrawal
        const { NewAdminService } = await import('./newAdminService');
        const result = await NewAdminService.approveWithdrawal(transactionId, adminId);

        if (result.success) {
          console.log('✅ Withdrawal approved via NewAdminService:', transactionId);
          return { success: true, message: 'Withdrawal approved successfully' };
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('Transaction not found');
      }
    } else {
      // Update in mock storage
      const transactions = await getMockTransactions();
      const transactionIndex = transactions.findIndex(t => t.id === transactionId);

      if (transactionIndex !== -1) {
        transactions[transactionIndex].status = TransactionStatus.APPROVED;
        transactions[transactionIndex].processedDate = new Date();
        transactions[transactionIndex].processedBy = adminId;
        transactions[transactionIndex].adminNotes = adminNotes;

        await AsyncStorage.setItem('mockTransactions', JSON.stringify(transactions));
      }

      console.log('✅ Transaction approved in mock storage:', transactionId);
      return { success: true, message: 'Transaction approved successfully' };
    }
  } catch (error) {
    console.error('❌ Error approving transaction:', error);
    return {
      success: false,
      error: error.message || 'Failed to approve transaction'
    };
  }
};

/**
 * Reject Transaction Request
 * Updates transaction status to rejected with admin notes
 */
export const rejectTransactionRequest = async (transactionId, adminId, adminNotes = '') => {
  try {
    if (supabaseAvailable) {
      // First, determine if this is a deposit or withdrawal request
      const { data: depositRequest } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      const { data: withdrawalRequest } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      if (depositRequest) {
        // Use the NewAdminService to reject deposit
        const { NewAdminService } = await import('./newAdminService');
        const result = await NewAdminService.rejectDeposit(transactionId, adminId, adminNotes);

        if (result.success) {
          console.log('✅ Deposit rejected via NewAdminService:', transactionId);
          return { success: true, message: 'Deposit rejected successfully' };
        } else {
          throw new Error(result.error);
        }
      } else if (withdrawalRequest) {
        // Use the NewAdminService to reject withdrawal
        const { NewAdminService } = await import('./newAdminService');
        const result = await NewAdminService.rejectWithdrawal(transactionId, adminId, adminNotes);

        if (result.success) {
          console.log('✅ Withdrawal rejected via NewAdminService:', transactionId);
          return { success: true, message: 'Withdrawal rejected successfully' };
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('Transaction not found');
      }
    } else {
      // Update in mock storage
      const transactions = await getMockTransactions();
      const transactionIndex = transactions.findIndex(t => t.id === transactionId);

      if (transactionIndex !== -1) {
        transactions[transactionIndex].status = TransactionStatus.REJECTED;
        transactions[transactionIndex].processedDate = new Date();
        transactions[transactionIndex].processedBy = adminId;
        transactions[transactionIndex].adminNotes = adminNotes;

        await AsyncStorage.setItem('mockTransactions', JSON.stringify(transactions));
      }

      console.log('✅ Transaction rejected in mock storage:', transactionId);
      return { success: true, message: 'Transaction rejected successfully' };
    }
  } catch (error) {
    console.error('❌ Error rejecting transaction:', error);
    return {
      success: false,
      error: error.message || 'Failed to reject transaction'
    };
  }
};

/**
 * Get User Transaction History
 * Returns all transactions for a specific user
 */
export const getUserTransactionHistory = async (userId) => {
  try {
    const allTransactions = await getAllTransactionRequests();
    const userTransactions = allTransactions.filter(t => t.userId === userId);
    
    console.log('✅ User transaction history fetched:', userTransactions.length);
    return userTransactions;
  } catch (error) {
    console.error('❌ Error fetching user transaction history:', error);
    return [];
  }
};

/**
 * Helper function to get mock transactions from AsyncStorage
 */
const getMockTransactions = async () => {
  try {
    const transactionsData = await AsyncStorage.getItem('mockTransactions');
    return transactionsData ? JSON.parse(transactionsData) : [];
  } catch (error) {
    console.error('❌ Error getting mock transactions:', error);
    return [];
  }
};

/**
 * Get Transaction Statistics for Admin Dashboard
 */
export const getTransactionStatistics = async () => {
  try {
    const transactions = await getAllTransactionRequests();
    
    const stats = {
      totalRequests: transactions.length,
      pendingRequests: transactions.filter(t => t.status === TransactionStatus.PENDING).length,
      approvedRequests: transactions.filter(t => t.status === TransactionStatus.APPROVED).length,
      rejectedRequests: transactions.filter(t => t.status === TransactionStatus.REJECTED).length,
      totalDepositAmount: transactions
        .filter(t => t.type === TransactionTypes.DEPOSIT && t.status === TransactionStatus.APPROVED)
        .reduce((sum, t) => sum + t.amount, 0),
      totalWithdrawalAmount: transactions
        .filter(t => t.type === TransactionTypes.WITHDRAWAL && t.status === TransactionStatus.APPROVED)
        .reduce((sum, t) => sum + t.finalAmount, 0),
      pendingDepositAmount: transactions
        .filter(t => t.type === TransactionTypes.DEPOSIT && t.status === TransactionStatus.PENDING)
        .reduce((sum, t) => sum + t.amount, 0),
      pendingWithdrawalAmount: transactions
        .filter(t => t.type === TransactionTypes.WITHDRAWAL && t.status === TransactionStatus.PENDING)
        .reduce((sum, t) => sum + t.amount, 0)
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting transaction statistics:', error);
    return {
      totalRequests: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      totalDepositAmount: 0,
      totalWithdrawalAmount: 0,
      pendingDepositAmount: 0,
      pendingWithdrawalAmount: 0
    };
  }
};

/**
 * Test function to verify transaction storage
 */
export const testTransactionStorage = async () => {
  try {
    console.log('🧪 Testing transaction storage...');

    // Test deposit request
    const testDeposit = await submitDepositRequest('test-user-123', {
      amount: 1000,
      method: 'bank_transfer',
      accountName: 'Test User',
      accountNumber: '1234567890',
      bankName: 'Test Bank',
      transactionId: 'TEST123',
      screenshot: '',
      notes: 'Test deposit'
    });

    console.log('🧪 Test deposit result:', testDeposit);

    // Get all transactions to verify
    const allTransactions = await getAllTransactionRequests();
    console.log('🧪 All transactions after test:', allTransactions.length, allTransactions);

    return { success: true, testDeposit, allTransactions };
  } catch (error) {
    console.error('🧪 Test failed:', error);
    return { success: false, error: error.message };
  }
};

console.log('✅ Transaction Service initialized for deposit/withdrawal management');
