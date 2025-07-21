-- Game Engine Enhancement Database Schema
-- Adds support for advanced win calculation engine with user behavior tracking
-- Based on requirements document: Player Engagement & House Edge Mechanism

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game configurations table for admin-configurable house edge and win probabilities
CREATE TABLE IF NOT EXISTS public.game_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_type TEXT UNIQUE NOT NULL,
    game_name TEXT NOT NULL,
    house_edge NUMERIC(5,4) DEFAULT 0.05, -- 5% default house edge
    base_win_probability NUMERIC(5,4) DEFAULT 0.45, -- 45% default base win probability
    min_bet NUMERIC(15,2) DEFAULT 10.00,
    max_bet NUMERIC(15,2) DEFAULT 5000.00,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Engagement features configuration table
CREATE TABLE IF NOT EXISTS public.engagement_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_name TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT true,
    config_value NUMERIC(5,4) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced user game statistics table
CREATE TABLE IF NOT EXISTS public.user_game_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    game_type TEXT NOT NULL,
    total_games_played INTEGER DEFAULT 0,
    total_won NUMERIC(15,2) DEFAULT 0.00,
    total_lost NUMERIC(15,2) DEFAULT 0.00,
    net_profit NUMERIC(15,2) DEFAULT 0.00,
    current_win_streak INTEGER DEFAULT 0,
    current_loss_streak INTEGER DEFAULT 0,
    max_win_streak INTEGER DEFAULT 0,
    max_loss_streak INTEGER DEFAULT 0,
    average_bet NUMERIC(15,2) DEFAULT 0.00,
    last_game_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_type)
);

-- Game session analytics table (enhanced version of existing game_sessions)
CREATE TABLE IF NOT EXISTS public.game_session_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    game_type TEXT NOT NULL,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    total_bets INTEGER DEFAULT 0,
    total_wagered NUMERIC(15,2) DEFAULT 0.00,
    total_won NUMERIC(15,2) DEFAULT 0.00,
    net_result NUMERIC(15,2) DEFAULT 0.00,
    win_rate NUMERIC(5,4) DEFAULT 0.00,
    average_bet NUMERIC(15,2) DEFAULT 0.00,
    session_duration INTEGER DEFAULT 0, -- in seconds
    engagement_features_used JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin audit log for game configuration changes
CREATE TABLE IF NOT EXISTS public.game_config_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL,
    game_type TEXT NOT NULL,
    action TEXT NOT NULL, -- 'UPDATE', 'CREATE', 'DELETE'
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    reason TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default game configurations
INSERT INTO public.game_configs (game_type, game_name, house_edge, base_win_probability, min_bet, max_bet) VALUES
('dice', 'Dice Game', 0.05, 0.45, 10, 5000),
('mines', 'Mines', 0.03, 0.45, 10, 5000),
('tower', 'Tower', 0.04, 0.45, 10, 5000),
('limbo', 'Limbo', 0.02, 0.45, 10, 5000),
('aviator', 'Aviator', 0.03, 0.45, 10, 5000),
('slots', 'Diamond Slots', 0.05, 0.45, 10, 5000),
('baccarat', 'Baccarat', 0.04, 0.45, 10, 5000),
('megadraw', 'Mega Draw', 0.30, 0.15, 10, 1000),
('luckynumbers', 'Lucky Numbers', 0.30, 0.15, 10, 1000)
ON CONFLICT (game_type) DO NOTHING;

-- Insert default engagement features configuration
INSERT INTO public.engagement_configs (feature_name, enabled, config_value, description) VALUES
('loss_recovery_mode', true, 0.15, 'Maximum loss recovery bonus percentage'),
('win_streak_boost', true, 0.10, 'Maximum win streak reduction percentage'),
('near_miss_enabled', true, 0.00, 'Enable near-miss visual effects'),
('daily_bonus_enabled', true, 0.00, 'Enable daily bonus features'),
('max_recovery_bonus', true, 0.15, 'Maximum recovery bonus after consecutive losses'),
('max_streak_reduction', true, 0.10, 'Maximum win probability reduction after win streaks')
ON CONFLICT (feature_name) DO NOTHING;

-- Function to update user game statistics
CREATE OR REPLACE FUNCTION update_user_game_statistics(
    p_user_id UUID,
    p_game_type TEXT,
    p_bet_amount NUMERIC,
    p_win_amount NUMERIC,
    p_is_win BOOLEAN
) RETURNS VOID AS $$
DECLARE
    current_stats RECORD;
    new_win_streak INTEGER := 0;
    new_loss_streak INTEGER := 0;
BEGIN
    -- Get current statistics
    SELECT * INTO current_stats 
    FROM user_game_statistics 
    WHERE user_id = p_user_id AND game_type = p_game_type;

    -- Calculate new streaks
    IF p_is_win THEN
        new_win_streak := COALESCE(current_stats.current_win_streak, 0) + 1;
        new_loss_streak := 0;
    ELSE
        new_win_streak := 0;
        new_loss_streak := COALESCE(current_stats.current_loss_streak, 0) + 1;
    END IF;

    -- Insert or update statistics
    INSERT INTO user_game_statistics (
        user_id, game_type, total_games_played, total_won, total_lost,
        net_profit, current_win_streak, current_loss_streak,
        max_win_streak, max_loss_streak, average_bet, last_game_time
    ) VALUES (
        p_user_id, p_game_type, 1,
        CASE WHEN p_is_win THEN p_win_amount ELSE 0 END,
        CASE WHEN NOT p_is_win THEN p_bet_amount ELSE 0 END,
        CASE WHEN p_is_win THEN p_win_amount - p_bet_amount ELSE -p_bet_amount END,
        new_win_streak, new_loss_streak, new_win_streak, new_loss_streak,
        p_bet_amount, NOW()
    )
    ON CONFLICT (user_id, game_type) DO UPDATE SET
        total_games_played = user_game_statistics.total_games_played + 1,
        total_won = user_game_statistics.total_won + CASE WHEN p_is_win THEN p_win_amount ELSE 0 END,
        total_lost = user_game_statistics.total_lost + CASE WHEN NOT p_is_win THEN p_bet_amount ELSE 0 END,
        net_profit = user_game_statistics.net_profit + CASE WHEN p_is_win THEN p_win_amount - p_bet_amount ELSE -p_bet_amount END,
        current_win_streak = new_win_streak,
        current_loss_streak = new_loss_streak,
        max_win_streak = GREATEST(user_game_statistics.max_win_streak, new_win_streak),
        max_loss_streak = GREATEST(user_game_statistics.max_loss_streak, new_loss_streak),
        average_bet = (user_game_statistics.average_bet * user_game_statistics.total_games_played + p_bet_amount) / (user_game_statistics.total_games_played + 1),
        last_game_time = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user game statistics when game sessions are created
CREATE OR REPLACE FUNCTION trigger_update_user_game_statistics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_game_statistics(
        NEW.user_id,
        NEW.game_id,
        NEW.bet_amount,
        COALESCE(NEW.win_amount, 0),
        NEW.is_win
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on game_sessions table
DROP TRIGGER IF EXISTS update_user_stats_trigger ON game_sessions;
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT ON game_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_game_statistics();

-- Function to get user game statistics for the advanced game engine
CREATE OR REPLACE FUNCTION get_user_game_stats(
    p_user_id UUID,
    p_game_type TEXT DEFAULT NULL
) RETURNS TABLE (
    game_type TEXT,
    total_games_played INTEGER,
    total_won NUMERIC,
    total_lost NUMERIC,
    net_profit NUMERIC,
    current_win_streak INTEGER,
    current_loss_streak INTEGER,
    average_bet NUMERIC,
    last_game_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF p_game_type IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            ugs.game_type,
            ugs.total_games_played,
            ugs.total_won,
            ugs.total_lost,
            ugs.net_profit,
            ugs.current_win_streak,
            ugs.current_loss_streak,
            ugs.average_bet,
            ugs.last_game_time
        FROM user_game_statistics ugs
        WHERE ugs.user_id = p_user_id AND ugs.game_type = p_game_type;
    ELSE
        RETURN QUERY
        SELECT 
            ugs.game_type,
            ugs.total_games_played,
            ugs.total_won,
            ugs.total_lost,
            ugs.net_profit,
            ugs.current_win_streak,
            ugs.current_loss_streak,
            ugs.average_bet,
            ugs.last_game_time
        FROM user_game_statistics ugs
        WHERE ugs.user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_game_statistics_user_id ON user_game_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_statistics_game_type ON user_game_statistics(game_type);
CREATE INDEX IF NOT EXISTS idx_user_game_statistics_user_game ON user_game_statistics(user_id, game_type);
CREATE INDEX IF NOT EXISTS idx_game_session_analytics_user_id ON game_session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_game_session_analytics_game_type ON game_session_analytics(game_type);
CREATE INDEX IF NOT EXISTS idx_game_config_audit_admin_id ON game_config_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_game_config_audit_game_type ON game_config_audit(game_type);

-- Add RLS policies for security
ALTER TABLE game_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_config_audit ENABLE ROW LEVEL SECURITY;

-- Game configs: Readable by all, writable by admins only
CREATE POLICY "Game configs are viewable by all users" ON game_configs FOR SELECT USING (true);
CREATE POLICY "Game configs are editable by admins only" ON game_configs FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND (users.is_admin = true OR users.is_super_admin = true))
);

-- Engagement configs: Readable by all, writable by admins only
CREATE POLICY "Engagement configs are viewable by all users" ON engagement_configs FOR SELECT USING (true);
CREATE POLICY "Engagement configs are editable by admins only" ON engagement_configs FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND (users.is_admin = true OR users.is_super_admin = true))
);

-- User game statistics: Users can only see their own stats, admins can see all
CREATE POLICY "Users can view their own game statistics" ON user_game_statistics FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Admins can view all game statistics" ON user_game_statistics FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND (users.is_admin = true OR users.is_super_admin = true))
);

-- Game session analytics: Users can only see their own sessions, admins can see all
CREATE POLICY "Users can view their own session analytics" ON game_session_analytics FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Admins can view all session analytics" ON game_session_analytics FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND (users.is_admin = true OR users.is_super_admin = true))
);

-- Game config audit: Only admins can view
CREATE POLICY "Only admins can view config audit logs" ON game_config_audit FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND (users.is_admin = true OR users.is_super_admin = true))
);

-- Grant necessary permissions
GRANT ALL ON game_configs TO authenticated;
GRANT ALL ON engagement_configs TO authenticated;
GRANT ALL ON user_game_statistics TO authenticated;
GRANT ALL ON game_session_analytics TO authenticated;
GRANT ALL ON game_config_audit TO authenticated;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE game_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE engagement_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE user_game_statistics;

-- Game Engine Enhancement Database Schema Applied Successfully!
-- New tables: game_configs, engagement_configs, user_game_statistics, game_session_analytics, game_config_audit
-- New functions: update_user_game_statistics, get_user_game_stats
-- Automatic user statistics tracking enabled via triggers
-- RLS policies and indexes created for security and performance
