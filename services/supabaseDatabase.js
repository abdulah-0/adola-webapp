// Supabase Database Service
// Following requirements document: Migration from Firebase to Supabase
// Implements: User data, transactions, wallet operations

import { supabase, supabaseAvailable } from '../lib/supabase';

/**
 * User Data Operations
 * Migrated from: firebase.firestore().collection('users')
 * To: supabase.from('users')
 */

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1);

    if (error) {
      throw error;
    }

    // Check if user exists
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      data: data[0]
    };

  } catch (error) {
    console.error('❌ Get user profile error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('❌ Update user profile error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update wallet balance
export const updateWalletBalance = async (userId, newBalance) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (error) {
      throw error;
    }

    // Check if user was updated
    if (!data || data.length === 0) {
      throw new Error('User not found for balance update');
    }

    console.log('✅ Wallet balance updated:', newBalance);
    return {
      success: true,
      data: data[0]
    };

  } catch (error) {
    console.error('❌ Update wallet balance error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Transaction Operations
 * Following requirements document: Transactions table for deposits/withdrawals
 */

// Create transaction record
export const createTransaction = async (transactionData) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const transaction = {
      ...transactionData,
      created_at: new Date().toISOString(),
      status: transactionData.status || 'pending'
    };

    console.log('🔍 Debug - Transaction data to insert:', JSON.stringify(transaction, null, 2));

    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert([transaction])
      .select();

    if (error) {
      console.error('🔍 Debug - Supabase error details:', error);
      throw error;
    }

    console.log('✅ Transaction created:', data?.[0]?.id || 'unknown');
    return {
      success: true,
      data: data?.[0] || data
    };

  } catch (error) {
    console.error('❌ Create transaction error:', error.message);
    console.error('❌ Full error object:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get user transactions
export const getUserTransactions = async (userId, limit = 50) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ Get user transactions error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update transaction status
export const updateTransactionStatus = async (transactionId, status, adminNotes = null) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const updates = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (adminNotes) {
      updates.admin_notes = adminNotes;
    }

    if (status === 'approved') {
      updates.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('wallet_transactions')
      .update(updates)
      .eq('id', transactionId)
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ Transaction status updated:', status);
    return {
      success: true,
      data: data?.[0] || data
    };

  } catch (error) {
    console.error('❌ Update transaction status error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Admin Operations
 * Following requirements document: Admin panel functionality
 */

// Get all users (admin only)
export const getAllUsers = async (limit = 100) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('joined_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ Get all users error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all transactions (admin only)
export const getAllTransactions = async (limit = 100) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ Get all transactions error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get app statistics (admin only)
export const getAppStatistics = async () => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    // Get user count
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get transaction count
    const { count: transactionCount } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact', head: true });

    // Get pending transactions
    const { count: pendingTransactions } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get total wallet balance
    const { data: balanceData } = await supabase
      .from('users')
      .select('wallet_balance');

    const totalBalance = balanceData?.reduce((sum, user) => sum + (user.wallet_balance || 0), 0) || 0;

    return {
      success: true,
      data: {
        totalUsers: userCount || 0,
        totalTransactions: transactionCount || 0,
        pendingTransactions: pendingTransactions || 0,
        totalWalletBalance: totalBalance,
        lastUpdated: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Get app statistics error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Realtime Subscriptions (Optional)
 * Following requirements document: Realtime updates for wallet balance
 */

// Subscribe to user profile changes
export const subscribeToUserProfile = (userId, callback) => {
  if (!supabaseAvailable) {
    console.log('ℹ️ Supabase not available, realtime updates disabled');
    return () => {};
  }

  const subscription = supabase
    .channel(`user-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      },
      (payload) => {
        console.log('🔄 User profile updated:', payload.new);
        callback(payload.new);
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    subscription.unsubscribe();
  };
};

// Subscribe to transaction changes
export const subscribeToTransactions = (userId, callback) => {
  if (!supabaseAvailable) {
    console.log('ℹ️ Supabase not available, realtime updates disabled');
    return () => {};
  }

  const subscription = supabase
    .channel(`wallet-transactions-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wallet_transactions',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔄 Wallet transaction updated:', payload);
        callback(payload);
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    subscription.unsubscribe();
  };
};
