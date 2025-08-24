-- Setup Agent System for Adola Gaming Platform
-- Run this script in your Supabase SQL editor to create the agent system

-- =============================================
-- 1. Agent Applications Table
-- =============================================
CREATE TABLE IF NOT EXISTS agent_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. Agents Table
-- =============================================
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(10) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
    approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES users(id),
    total_referrals INTEGER NOT NULL DEFAULT 0,
    total_commissions DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. Agent Referrals Table
-- =============================================
CREATE TABLE IF NOT EXISTS agent_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(10) NOT NULL,
    total_commission DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. Agent Commissions Table
-- =============================================
CREATE TABLE IF NOT EXISTS agent_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deposit_request_id UUID REFERENCES deposit_requests(id),
    deposit_amount DECIMAL(15,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0500, -- 5%
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 5. Create Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_agent_applications_user_id ON agent_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_referral_code ON agents(referral_code);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_agent_user_id ON agent_referrals(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_referred_user_id ON agent_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_user_id ON agent_commissions(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_status ON agent_commissions(status);

-- =============================================
-- 6. Enable Row Level Security
-- =============================================
ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. Create RLS Policies
-- =============================================

-- Agent Applications Policies
CREATE POLICY "Users can view their own applications" ON agent_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND id = agent_applications.user_id
        )
    );

CREATE POLICY "Users can create their own applications" ON agent_applications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND id = agent_applications.user_id
        )
    );

CREATE POLICY "Admins can view all applications" ON agent_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
    );

CREATE POLICY "Admins can update applications" ON agent_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
    );

-- Agents Policies
CREATE POLICY "Agents can view their own record" ON agents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND id = agents.user_id
        )
    );

CREATE POLICY "Admins can view all agents" ON agents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
    );

-- Agent Referrals Policies
CREATE POLICY "Agents can view their referrals" ON agent_referrals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND id = agent_referrals.agent_user_id
        )
    );

CREATE POLICY "Admins can view all referrals" ON agent_referrals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
    );

-- Agent Commissions Policies
CREATE POLICY "Agents can view their commissions" ON agent_commissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND id = agent_commissions.agent_user_id
        )
    );

CREATE POLICY "Admins can view all commissions" ON agent_commissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
    );

-- =============================================
-- 8. Grant Permissions
-- =============================================
GRANT SELECT, INSERT, UPDATE ON agent_applications TO authenticated;
GRANT SELECT ON agents TO authenticated;
GRANT SELECT ON agent_referrals TO authenticated;
GRANT SELECT ON agent_commissions TO authenticated;

-- Grant admin permissions
GRANT ALL ON agent_applications TO service_role;
GRANT ALL ON agents TO service_role;
GRANT ALL ON agent_referrals TO service_role;
GRANT ALL ON agent_commissions TO service_role;

-- =============================================
-- 9. Create Updated At Triggers
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_applications_updated_at 
    BEFORE UPDATE ON agent_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON agents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_referrals_updated_at 
    BEFORE UPDATE ON agent_referrals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_commissions_updated_at 
    BEFORE UPDATE ON agent_commissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 10. Success Message
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Agent system tables created successfully!';
    RAISE NOTICE '📊 Tables: agent_applications, agents, agent_referrals, agent_commissions';
    RAISE NOTICE '🔒 RLS policies enabled for security';
    RAISE NOTICE '⚡ Indexes created for performance';
    RAISE NOTICE '🎯 Ready for agent referral system!';
END $$;
