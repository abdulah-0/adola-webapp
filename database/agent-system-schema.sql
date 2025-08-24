-- Agent System Database Schema
-- This script creates all tables and functions needed for the agent referral system

-- =============================================
-- Agent Applications Table
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

-- Create indexes for agent_applications
CREATE INDEX IF NOT EXISTS idx_agent_applications_user_id ON agent_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_applications_applied_at ON agent_applications(applied_at);

-- =============================================
-- Agents Table
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

-- Create indexes for agents
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_referral_code ON agents(referral_code);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- =============================================
-- Agent Referrals Table
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

-- Create indexes for agent_referrals
CREATE INDEX IF NOT EXISTS idx_agent_referrals_agent_user_id ON agent_referrals(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_referred_user_id ON agent_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_referral_code ON agent_referrals(referral_code);

-- =============================================
-- Agent Commissions Table
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

-- Create indexes for agent_commissions
CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_user_id ON agent_commissions(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_referred_user_id ON agent_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_status ON agent_commissions(status);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_created_at ON agent_commissions(created_at);

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
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
-- Function to process agent commission
-- =============================================
CREATE OR REPLACE FUNCTION process_agent_commission(
    p_user_id UUID,
    p_deposit_amount DECIMAL,
    p_deposit_request_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_referral_record RECORD;
    v_commission_amount DECIMAL;
    v_commission_rate DECIMAL := 0.05; -- 5%
BEGIN
    -- Check if user was referred by an agent
    SELECT ar.agent_user_id, ar.id INTO v_referral_record
    FROM agent_referrals ar
    INNER JOIN agents a ON a.user_id = ar.agent_user_id
    WHERE ar.referred_user_id = p_user_id
    AND a.status = 'active';

    -- If no referral found, return true (no commission to process)
    IF NOT FOUND THEN
        RETURN TRUE;
    END IF;

    -- Calculate commission amount
    v_commission_amount := ROUND(p_deposit_amount * v_commission_rate, 2);

    -- Insert commission record
    INSERT INTO agent_commissions (
        agent_user_id,
        referred_user_id,
        deposit_request_id,
        deposit_amount,
        commission_rate,
        amount,
        status
    ) VALUES (
        v_referral_record.agent_user_id,
        p_user_id,
        p_deposit_request_id,
        p_deposit_amount,
        v_commission_rate,
        v_commission_amount,
        'pending'
    );

    -- Update total commission in referral record
    UPDATE agent_referrals 
    SET total_commission = total_commission + v_commission_amount
    WHERE id = v_referral_record.id;

    -- Update agent total commissions
    UPDATE agents 
    SET total_commissions = total_commissions + v_commission_amount
    WHERE user_id = v_referral_record.agent_user_id;

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return false
        RAISE NOTICE 'Error processing agent commission: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Function to get agent statistics
-- =============================================
CREATE OR REPLACE FUNCTION get_agent_statistics(p_agent_user_id UUID)
RETURNS TABLE (
    total_referrals INTEGER,
    total_commissions DECIMAL,
    pending_commissions DECIMAL,
    this_month_commissions DECIMAL,
    referral_code VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(COUNT(ar.id)::INTEGER, 0) as total_referrals,
        COALESCE(a.total_commissions, 0) as total_commissions,
        COALESCE(SUM(CASE WHEN ac.status = 'pending' THEN ac.amount ELSE 0 END), 0) as pending_commissions,
        COALESCE(SUM(CASE 
            WHEN ac.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
            THEN ac.amount ELSE 0 END), 0) as this_month_commissions,
        a.referral_code
    FROM agents a
    LEFT JOIN agent_referrals ar ON ar.agent_user_id = a.user_id
    LEFT JOIN agent_commissions ac ON ac.agent_user_id = a.user_id
    WHERE a.user_id = p_agent_user_id
    AND a.status = 'active'
    GROUP BY a.total_commissions, a.referral_code;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;

-- Agent Applications Policies
CREATE POLICY "Users can view their own applications" ON agent_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications" ON agent_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications" ON agent_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update applications" ON agent_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Agents Policies
CREATE POLICY "Agents can view their own record" ON agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all agents" ON agents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Agent Referrals Policies
CREATE POLICY "Agents can view their referrals" ON agent_referrals
    FOR SELECT USING (auth.uid() = agent_user_id);

CREATE POLICY "Admins can view all referrals" ON agent_referrals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Agent Commissions Policies
CREATE POLICY "Agents can view their commissions" ON agent_commissions
    FOR SELECT USING (auth.uid() = agent_user_id);

CREATE POLICY "Admins can view all commissions" ON agent_commissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =============================================
-- Sample Data (Optional - for testing)
-- =============================================

-- Insert sample agent application (uncomment for testing)
-- INSERT INTO agent_applications (user_id, reason, status) 
-- VALUES (
--     (SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1),
--     'I have experience in marketing and a large network of potential players.',
--     'pending'
-- );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON agent_applications TO authenticated;
GRANT SELECT ON agents TO authenticated;
GRANT SELECT ON agent_referrals TO authenticated;
GRANT SELECT ON agent_commissions TO authenticated;

-- Grant admin permissions
GRANT ALL ON agent_applications TO service_role;
GRANT ALL ON agents TO service_role;
GRANT ALL ON agent_referrals TO service_role;
GRANT ALL ON agent_commissions TO service_role;
