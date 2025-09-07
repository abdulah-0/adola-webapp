import { supabase } from '../lib/supabase';

export interface AgentApplication {
  id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  username?: string;
  email?: string;
}

export interface AgentStats {
  totalReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  thisMonthCommissions: number;
  referralCode: string;
}

export interface AgentReferral {
  id: string;
  username: string;
  email: string;
  created_at: string;
  total_deposits: number;
  total_commission: number;
  last_deposit_at?: string;
}

export class AgentService {
  /**
   * Test database connection and table existence
   */
  static async testDatabaseConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing agent database tables...');

      // Test if agent_applications table exists
      const { data, error } = await supabase
        .from('agent_applications')
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ Agent tables test failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        return false;
      }

      console.log('✅ Agent tables accessible');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get internal user ID from auth user ID
   */
  private static async getInternalUserId(authUserId: string): Promise<string | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error) {
        console.error('Error getting internal user ID:', error);
        return null;
      }

      return user?.id || null;
    } catch (error) {
      console.error('Error getting internal user ID:', error);
      return null;
    }
  }

  /**
   * Check if user is an agent and get their status
   */
  static async getAgentStatus(authUserId: string): Promise<'not_applied' | 'pending' | 'approved' | 'rejected'> {
    try {
      // Get internal user ID
      const internalUserId = await this.getInternalUserId(authUserId);
      if (!internalUserId) {
        console.error('Could not find internal user ID for auth user:', authUserId);
        return 'not_applied';
      }

      // Check if user has an agent application
      const { data: application, error: appError } = await supabase
        .from('agent_applications')
        .select('status')
        .eq('user_id', internalUserId)
        .order('applied_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (appError && appError.code !== 'PGRST116') {
        console.error('Error checking agent application:', appError);
        throw appError;
      }

      if (!application) {
        return 'not_applied';
      }

      return application.status;
    } catch (error) {
      console.error('Error getting agent status:', error);
      return 'not_applied';
    }
  }

  /**
   * Apply to become an agent
   */
  static async applyForAgent(authUserId: string, reason: string): Promise<boolean> {
    try {
      // Prefer secure RPC to avoid RLS friction and ID lookups from client
      const { data: rpcData, error: rpcError } = await supabase.rpc('apply_for_agent', { p_reason: reason });
      if (!rpcError && (rpcData === true || rpcData === null)) {
        // Some RPCs return null on success; treat as success if no error
        return true;
      }

      if (rpcError) {
        console.warn('RPC apply_for_agent failed, falling back to direct insert:', rpcError.message || rpcError);
      }

      // Fallback: direct insert with internal ID resolution
      const internalUserId = await this.getInternalUserId(authUserId);
      if (!internalUserId) {
        console.error('Could not find internal user ID for auth user:', authUserId);
        return false;
      }

      // Check if user already has a pending or approved application
      const currentStatus = await this.getAgentStatus(authUserId);
      if (currentStatus === 'pending' || currentStatus === 'approved') {
        console.warn('User already has a pending or approved agent application');
        return false;
      }

      const { error } = await supabase
        .from('agent_applications')
        .insert({
          user_id: internalUserId,
          reason: reason,
          status: 'pending',
          applied_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error applying for agent (fallback path):', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error applying for agent:', error);
      return false;
    }
  }

  /**
   * Get agent statistics (for approved agents only)
   */
  static async getAgentStats(authUserId: string): Promise<AgentStats | null> {
    try {
      // Get internal user ID
      const internalUserId = await this.getInternalUserId(authUserId);
      if (!internalUserId) {
        console.error('Could not find internal user ID for auth user:', authUserId);
        return null;
      }

      // First check if user is an approved agent
      const status = await this.getAgentStatus(authUserId);
      if (status !== 'approved') {
        return null;
      }

      // Get agent record to get referral code
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('referral_code')
        .eq('user_id', internalUserId)
        .maybeSingle();

      if (agentError || !agent) {
        console.error('Error getting agent record:', agentError);
        return null;
      }

      // Get referral statistics
      const { data: referrals, error: referralsError } = await supabase
        .from('agent_referrals')
        .select('id, total_commission')
        .eq('agent_user_id', internalUserId);

      if (referralsError) {
        console.error('Error getting referrals:', referralsError);
      }

      // Calculate stats
      const totalReferrals = referrals?.length || 0;
      const totalCommissions = referrals?.reduce((sum, ref) => sum + (ref.total_commission || 0), 0) || 0;

      // Get this month's commissions
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      const { data: thisMonthCommissions, error: monthError } = await supabase
        .from('agent_commissions')
        .select('amount')
        .eq('agent_user_id', internalUserId)
        .gte('created_at', thisMonthStart.toISOString());

      const thisMonthTotal = thisMonthCommissions?.reduce((sum, comm) => sum + comm.amount, 0) || 0;

      // Get pending commissions
      const { data: pendingCommissions, error: pendingError } = await supabase
        .from('agent_commissions')
        .select('amount')
        .eq('agent_user_id', internalUserId)
        .eq('status', 'pending');

      const pendingTotal = pendingCommissions?.reduce((sum, comm) => sum + comm.amount, 0) || 0;

      return {
        totalReferrals,
        totalCommissions,
        pendingCommissions: pendingTotal,
        thisMonthCommissions: thisMonthTotal,
        referralCode: agent.referral_code
      };
    } catch (error) {
      console.error('Error getting agent stats:', error);
      return null;
    }
  }

  /**
   * Get agent's referrals list
   */
  static async getAgentReferrals(authUserId: string): Promise<AgentReferral[]> {
    try {
      // Get internal user ID
      const internalUserId = await this.getInternalUserId(authUserId);
      if (!internalUserId) {
        console.error('Could not find internal user ID for auth user:', authUserId);
        return [];
      }

      const { data: referrals, error } = await supabase
        .from('agent_referrals')
        .select(`
          id,
          referred_user_id,
          total_commission,
          created_at,
          users!agent_referrals_referred_user_id_fkey (
            username,
            email
          )
        `)
        .eq('agent_user_id', internalUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting agent referrals:', error);
        return [];
      }

      // Get deposit counts for each referral
      const referralList: AgentReferral[] = [];
      for (const referral of referrals || []) {
        const { data: deposits, error: depositError } = await supabase
          .from('deposit_requests')
          .select('id, created_at')
          .eq('user_id', referral.referred_user_id)
          .eq('status', 'approved');

        const totalDeposits = deposits?.length || 0;
        const lastDepositAt = deposits && deposits.length > 0 
          ? deposits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : undefined;

        referralList.push({
          id: referral.id,
          username: referral.users?.username || 'Unknown',
          email: referral.users?.email || '',
          created_at: referral.created_at,
          total_deposits: totalDeposits,
          total_commission: referral.total_commission || 0,
          last_deposit_at: lastDepositAt
        });
      }

      return referralList;
    } catch (error) {
      console.error('Error getting agent referrals:', error);
      return [];
    }
  }

  /**
   * Get pending agent applications (for admin)
   */
  static async getPendingAgentApplications(): Promise<AgentApplication[]> {
    try {
      const { data: applications, error } = await supabase
        .from('agent_applications')
        .select(`
          id,
          user_id,
          reason,
          status,
          applied_at,
          reviewed_at,
          reviewed_by,
          rejection_reason,
          users!agent_applications_user_id_fkey (
            username,
            email
          )
        `)
        .eq('status', 'pending')
        .order('applied_at', { ascending: true });

      if (error) {
        console.error('Error getting pending applications:', error);
        return [];
      }

      return applications?.map(app => ({
        id: app.id,
        user_id: app.user_id,
        reason: app.reason,
        status: app.status,
        applied_at: app.applied_at,
        reviewed_at: app.reviewed_at,
        reviewed_by: app.reviewed_by,
        rejection_reason: app.rejection_reason,
        username: app.users?.username || 'Unknown',
        email: app.users?.email || ''
      })) || [];
    } catch (error) {
      console.error('Error getting pending applications:', error);
      return [];
    }
  }

  /**
   * Approve agent application (admin only)
   */
  static async approveAgentApplication(applicationId: string, adminId: string): Promise<boolean> {
    try {
      // Get the application details
      const { data: application, error: appError } = await supabase
        .from('agent_applications')
        .select('user_id')
        .eq('id', applicationId)
        .maybeSingle();

      if (appError || !application) {
        console.error('Error getting application:', appError);
        return false;
      }

      // Generate unique referral code
      const referralCode = await this.generateReferralCode();

      // Start transaction
      const { error: updateError } = await supabase
        .from('agent_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId
        })
        .eq('id', applicationId);

      if (updateError) {
        console.error('Error updating application:', updateError);
        return false;
      }

      // Create agent record
      const { error: agentError } = await supabase
        .from('agents')
        .insert({
          user_id: application.user_id,
          referral_code: referralCode,
          status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: adminId
        });

      if (agentError) {
        console.error('Error creating agent record:', agentError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error approving agent application:', error);
      return false;
    }
  }

  /**
   * Reject agent application (admin only)
   */
  static async rejectAgentApplication(applicationId: string, adminId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
          rejection_reason: reason
        })
        .eq('id', applicationId);

      if (error) {
        console.error('Error rejecting application:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error rejecting agent application:', error);
      return false;
    }
  }

  /**
   * Generate unique referral code
   */
  private static async generateReferralCode(): Promise<string> {
    let code: string;
    let isUnique = false;
    let attempts = 0;

    do {
      // Generate 6-character alphanumeric code
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Check if code already exists
      const { data, error } = await supabase
        .from('agents')
        .select('id')
        .eq('referral_code', code)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking referral code uniqueness:', error);
      }

      isUnique = !data;
      attempts++;
    } while (!isUnique && attempts < 10);

    return code;
  }

  /**
   * Process referral signup (called when user signs up with referral code)
   */
  static async processReferralSignup(newUserId: string, referralCode: string): Promise<boolean> {
    try {
      // Find the agent with this referral code
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('user_id')
        .eq('referral_code', referralCode)
        .eq('status', 'active')
        .maybeSingle();

      if (agentError || !agent) {
        console.log('Invalid or inactive referral code:', referralCode);
        return false;
      }

      // Create referral record
      const { error: referralError } = await supabase
        .from('agent_referrals')
        .insert({
          agent_user_id: agent.user_id,
          referred_user_id: newUserId,
          referral_code: referralCode,
          created_at: new Date().toISOString(),
          total_commission: 0
        });

      if (referralError) {
        console.error('Error creating referral record:', referralError);
        return false;
      }

      console.log(`✅ Referral processed: User ${newUserId} referred by agent ${agent.user_id}`);
      return true;
    } catch (error) {
      console.error('Error processing referral signup:', error);
      return false;
    }
  }

  /**
   * Process agent commission (called when referred user makes approved deposit)
   */
  static async processAgentCommission(userId: string, depositAmount: number): Promise<boolean> {
    try {
      // Check if this user was referred by an agent
      const { data: referral, error: referralError } = await supabase
        .from('agent_referrals')
        .select('agent_user_id, id')
        .eq('referred_user_id', userId)
        .maybeSingle();

      if (referralError || !referral) {
        // User was not referred by an agent
        return true;
      }

      // Calculate 5% commission
      const commissionAmount = Math.round(depositAmount * 0.05);

      // Create commission record
      const { error: commissionError } = await supabase
        .from('agent_commissions')
        .insert({
          agent_user_id: referral.agent_user_id,
          referred_user_id: userId,
          deposit_amount: depositAmount,
          commission_rate: 0.05,
          amount: commissionAmount,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (commissionError) {
        console.error('Error creating commission record:', commissionError);
        return false;
      }

      // Update total commission in referral record
      const { error: updateError } = await supabase
        .from('agent_referrals')
        .update({
          total_commission: supabase.sql`total_commission + ${commissionAmount}`
        })
        .eq('id', referral.id);

      if (updateError) {
        console.error('Error updating referral commission:', updateError);
      }

      console.log(`✅ Agent commission processed: PKR ${commissionAmount} for agent ${referral.agent_user_id}`);
      return true;
    } catch (error) {
      console.error('Error processing agent commission:', error);
      return false;
    }
  }
}
