import { supabase } from '../lib/supabase';

export interface ReferralData {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  bonus_amount: number;
  bonus_paid: boolean;
  bonus_paid_at?: string;
  created_at: string;
}

export interface UserReferralInfo {
  referral_code: string;
  total_referrals: number;
  referral_earnings: number;
  referred_by_code?: string;
  referred_by_user_id?: string;
}

export class ReferralService {
  /**
   * Get user's referral code only
   */
  static async getUserReferralCode(userId: string): Promise<string | null> {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('referral_code')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (userError || !userData) {
        console.error('❌ Error getting user referral code:', userError);
        return null;
      }

      return userData.referral_code || null;
    } catch (error) {
      console.error('❌ Error getting referral code:', error);
      return null;
    }
  }

  /**
   * Get user's referral information
   */
  static async getUserReferralInfo(userId: string): Promise<UserReferralInfo | null> {
    try {
      // Get user referral data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('referral_code, total_referrals, referred_by_code, referred_by_user_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (userError) {
        console.error('❌ Error fetching user referral data:', userError);
        return null;
      }

      // Get wallet referral earnings
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('referral_earnings')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) {
        console.error('❌ Error fetching wallet referral earnings:', walletError);
      }

      return {
        referral_code: userData.referral_code || '',
        total_referrals: userData.total_referrals || 0,
        referral_earnings: walletData?.referral_earnings || 0,
        referred_by_code: userData.referred_by_code,
        referred_by_user_id: userData.referred_by_user_id
      };
    } catch (error) {
      console.error('❌ Error getting user referral info:', error);
      return null;
    }
  }

  /**
   * Get user's referral history (people they referred)
   */
  static async getUserReferrals(userId: string): Promise<ReferralData[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching user referrals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error getting user referrals:', error);
      return [];
    }
  }

  /**
   * Validate referral code
   */
  static async validateReferralCode(referralCode: string): Promise<boolean> {
    try {
      if (!referralCode || referralCode.trim() === '') {
        return false;
      }

      const { data, error } = await supabase
        .from('users')
        .select('referral_code')
        .eq('referral_code', referralCode.trim())
        .maybeSingle();

      if (error) {
        console.log('🔍 Referral code not found:', referralCode);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('❌ Error validating referral code:', error);
      return false;
    }
  }

  /**
   * Get referral statistics for admin
   */
  static async getReferralStats(): Promise<{
    total_referrals: number;
    total_bonus_paid: number;
    active_referrers: number;
  }> {
    try {
      // Get total referrals
      const { count: totalReferrals, error: countError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Error getting referral count:', countError);
      }

      // Get total bonus paid
      const { data: bonusData, error: bonusError } = await supabase
        .from('referrals')
        .select('bonus_amount')
        .eq('bonus_paid', true);

      if (bonusError) {
        console.error('❌ Error getting bonus data:', bonusError);
      }

      const totalBonusPaid = bonusData?.reduce((sum, item) => sum + parseFloat(item.bonus_amount.toString()), 0) || 0;

      // Get active referrers (users who have made referrals)
      const { count: activeReferrers, error: referrersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('total_referrals', 0);

      if (referrersError) {
        console.error('❌ Error getting active referrers:', referrersError);
      }

      return {
        total_referrals: totalReferrals || 0,
        total_bonus_paid: totalBonusPaid,
        active_referrers: activeReferrers || 0
      };
    } catch (error) {
      console.error('❌ Error getting referral stats:', error);
      return {
        total_referrals: 0,
        total_bonus_paid: 0,
        active_referrers: 0
      };
    }
  }

  /**
   * Get top referrers for admin dashboard
   */
  static async getTopReferrers(limit: number = 10): Promise<Array<{
    user_id: string;
    email: string;
    username: string;
    total_referrals: number;
    referral_earnings: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          auth_user_id,
          email,
          username,
          total_referrals,
          wallets!inner(referral_earnings)
        `)
        .gt('total_referrals', 0)
        .order('total_referrals', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching top referrers:', error);
        return [];
      }

      return data?.map(user => ({
        user_id: user.auth_user_id,
        email: user.email,
        username: user.username,
        total_referrals: user.total_referrals,
        referral_earnings: parseFloat(user.wallets.referral_earnings?.toString() || '0')
      })) || [];
    } catch (error) {
      console.error('❌ Error getting top referrers:', error);
      return [];
    }
  }

  /**
   * Get user's detailed referral stats
   */
  static async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    todayReferrals: number;
    currentMilestone: number;
    nextMilestoneTarget: number;
  } | null> {
    try {
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('total_referrals')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (userError) {
        console.error('❌ Error fetching user data:', userError);
        return null;
      }

      // Get wallet referral earnings
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('referral_earnings')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) {
        console.error('❌ Error fetching wallet data:', walletError);
      }

      // Get today's referrals
      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount, error: todayError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', userId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (todayError) {
        console.error('❌ Error fetching today referrals:', todayError);
      }

      // Get active referrals (users who have made deposits)
      const { count: activeCount, error: activeError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', userId)
        .eq('bonus_paid', true);

      if (activeError) {
        console.error('❌ Error fetching active referrals:', activeError);
      }

      const totalReferrals = userData?.total_referrals || 0;
      const totalEarnings = parseFloat(walletData?.referral_earnings?.toString() || '0');
      const todayReferrals = todayCount || 0;
      const activeReferrals = activeCount || 0;

      // Calculate milestone progress
      const milestones = [1, 3, 5, 10, 20, 50];
      let currentMilestone = 0;
      let nextMilestoneTarget = 1;

      for (const milestone of milestones) {
        if (todayReferrals >= milestone) {
          currentMilestone = milestone;
        } else {
          nextMilestoneTarget = milestone;
          break;
        }
      }

      if (currentMilestone === milestones[milestones.length - 1]) {
        nextMilestoneTarget = currentMilestone;
      }

      return {
        totalReferrals,
        activeReferrals,
        totalEarnings,
        todayReferrals,
        currentMilestone,
        nextMilestoneTarget
      };
    } catch (error) {
      console.error('❌ Error getting referral stats:', error);
      return null;
    }
  }

  /**
   * Register user with referral code
   */
  static async registerUserWithReferral(
    userId: string,
    email: string,
    username: string,
    referralCode?: string
  ): Promise<{
    success: boolean;
    userReferralCode: string;
    message: string;
  }> {
    try {
      // Generate unique referral code for new user
      const newReferralCode = `ADL${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('referral_code')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing user:', checkError);
        return {
          success: false,
          userReferralCode: '',
          message: 'Error checking user status'
        };
      }

      if (existingUser) {
        return {
          success: true,
          userReferralCode: existingUser.referral_code || newReferralCode,
          message: 'User already registered'
        };
      }

      // Create user with referral code
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          auth_user_id: userId,
          email,
          username,
          referral_code: newReferralCode,
          referred_by_code: referralCode || null
        });

      if (insertError) {
        console.error('❌ Error creating user:', insertError);
        return {
          success: false,
          userReferralCode: '',
          message: 'Error creating user'
        };
      }

      // Process referral if referral code was provided
      if (referralCode) {
        console.log('🔗 Processing referral for code:', referralCode);
        await this.processReferral(userId, referralCode);
      }

      return {
        success: true,
        userReferralCode: newReferralCode,
        message: 'User registered successfully'
      };
    } catch (error) {
      console.error('❌ Error registering user with referral:', error);
      return {
        success: false,
        userReferralCode: '',
        message: 'Registration failed'
      };
    }
  }

  /**
   * Process referral when a new user signs up with a referral code
   */
  static async processReferral(newUserId: string, referralCode: string): Promise<void> {
    try {
      console.log('🔗 Processing referral for new user:', newUserId, 'with code:', referralCode);

      // Find the referrer by referral code
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('auth_user_id, email, username, total_referrals')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (referrerError || !referrer) {
        console.log('❌ Referrer not found for code:', referralCode);
        return;
      }

      console.log('✅ Found referrer:', referrer.email);

      // Update the new user with referrer information
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          referred_by_user_id: referrer.auth_user_id,
          referral_bonus_received: true
        })
        .eq('auth_user_id', newUserId);

      if (updateUserError) {
        console.error('❌ Error updating referred user:', updateUserError);
        return;
      }

      // Create referral record
      const { error: referralRecordError } = await supabase
        .from('referrals')
        .insert({
          referrer_user_id: referrer.auth_user_id,
          referred_user_id: newUserId,
          referral_code: referralCode,
          bonus_amount: 25.00,
          bonus_paid: true,
          bonus_paid_at: new Date().toISOString()
        });

      if (referralRecordError) {
        console.error('❌ Error creating referral record:', referralRecordError);
        return;
      }

      // Update referrer's total referrals count
      const { error: updateReferrerError } = await supabase
        .from('users')
        .update({
          total_referrals: (referrer.total_referrals || 0) + 1,
          referral_bonus_given: true
        })
        .eq('auth_user_id', referrer.auth_user_id);

      if (updateReferrerError) {
        console.error('❌ Error updating referrer count:', updateReferrerError);
        return;
      }

      // Give referral bonus to referrer
      const { data: referrerWallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance, referral_earnings')
        .eq('user_id', referrer.auth_user_id)
        .maybeSingle();

      if (!walletError && referrerWallet) {
        const bonusAmount = 25.00;
        const newBalance = parseFloat(referrerWallet.balance.toString()) + bonusAmount;
        const newReferralEarnings = parseFloat((referrerWallet.referral_earnings || 0).toString()) + bonusAmount;

        // Update referrer's wallet
        const { error: walletUpdateError } = await supabase
          .from('wallets')
          .update({
            balance: newBalance,
            referral_earnings: newReferralEarnings
          })
          .eq('user_id', referrer.auth_user_id);

        if (!walletUpdateError) {
          // Create referral bonus transaction
          const { error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: referrer.auth_user_id,
              type: 'referral_bonus',
              status: 'auto',
              amount: bonusAmount,
              balance_before: parseFloat(referrerWallet.balance.toString()),
              balance_after: newBalance,
              description: 'Referral bonus for inviting new user',
              metadata: {
                referred_user_id: newUserId,
                referral_code: referralCode
              }
            });

          if (!transactionError) {
            console.log('✅ Referral processed successfully! Bonus given:', bonusAmount);
          } else {
            console.error('❌ Error creating referral transaction:', transactionError);
          }
        } else {
          console.error('❌ Error updating referrer wallet:', walletUpdateError);
        }
      } else {
        console.error('❌ Error getting referrer wallet:', walletError);
      }

    } catch (error) {
      console.error('❌ Error processing referral:', error);
    }
  }

  /**
   * Manually recalculate and fix referral counts for a user
   */
  static async recalculateReferralStats(userId: string): Promise<void> {
    try {
      console.log('🔄 Recalculating referral stats for user:', userId);

      // Count actual referrals from referrals table
      const { count: actualReferrals, error: countError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', userId);

      if (countError) {
        console.error('❌ Error counting referrals:', countError);
        return;
      }

      // Update user's total_referrals to match actual count
      const { error: updateError } = await supabase
        .from('users')
        .update({
          total_referrals: actualReferrals || 0
        })
        .eq('auth_user_id', userId);

      if (updateError) {
        console.error('❌ Error updating referral count:', updateError);
      } else {
        console.log('✅ Referral count updated:', actualReferrals);
      }

    } catch (error) {
      console.error('❌ Error recalculating referral stats:', error);
    }
  }

  /**
   * Fix all users' referral counts
   */
  static async fixAllReferralCounts(): Promise<void> {
    try {
      console.log('🔄 Fixing all referral counts...');

      // Get all users with referral codes
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('auth_user_id, referral_code')
        .not('referral_code', 'is', null);

      if (usersError) {
        console.error('❌ Error getting users:', usersError);
        return;
      }

      // Fix each user's referral count
      for (const user of users || []) {
        await this.recalculateReferralStats(user.auth_user_id);
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ All referral counts fixed!');
    } catch (error) {
      console.error('❌ Error fixing referral counts:', error);
    }
  }
}
