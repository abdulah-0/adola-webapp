-- =====================================================
-- CUSTOM NOTIFICATIONS SYSTEM FOR ADMIN PANEL
-- Allows admins to create custom notifications with frequency settings
-- =====================================================

-- Create custom_notifications table
CREATE TABLE IF NOT EXISTS public.custom_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    icon TEXT DEFAULT 'notifications',
    color TEXT DEFAULT '#007AFF',
    priority INTEGER DEFAULT 5,
    frequency_type TEXT DEFAULT 'once' CHECK (frequency_type IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
    frequency_hours INTEGER DEFAULT NULL, -- For custom frequency (hours between shows)
    enabled BOOLEAN DEFAULT true,
    show_during_games BOOLEAN DEFAULT false, -- Whether to show during game sessions
    target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'new_users', 'active_users', 'vip_users')),
    conditions JSONB DEFAULT '{}', -- Custom conditions (balance, games played, etc.)
    created_by UUID NOT NULL, -- Admin who created it
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    total_views INTEGER DEFAULT 0,
    total_dismissals INTEGER DEFAULT 0
);

-- Create notification_user_status table to track per-user notification status
CREATE TABLE IF NOT EXISTS public.notification_user_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES public.custom_notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    last_shown_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    times_shown INTEGER DEFAULT 0,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(notification_id, user_id)
);

-- Create active_game_sessions table to track when users are in games
CREATE TABLE IF NOT EXISTS public.active_game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    game_type TEXT NOT NULL,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_type)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.custom_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_notifications table
-- Allow all authenticated users to read active notifications
CREATE POLICY "Allow users to read active notifications" ON public.custom_notifications
    FOR SELECT TO authenticated 
    USING (enabled = true AND (ends_at IS NULL OR ends_at > NOW()));

-- Allow only admins to manage notifications
CREATE POLICY "Allow admins to manage notifications" ON public.custom_notifications
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.auth_user_id = auth.uid() 
            AND (users.is_admin = true OR users.is_super_admin = true)
        )
    );

-- Create policies for notification_user_status table
-- Allow users to read/update their own notification status
CREATE POLICY "Allow users to manage their notification status" ON public.notification_user_status
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.auth_user_id = auth.uid() 
            AND users.id = notification_user_status.user_id
        )
    );

-- Create policies for active_game_sessions table
-- Allow users to manage their own game sessions
CREATE POLICY "Allow users to manage their game sessions" ON public.active_game_sessions
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.auth_user_id = auth.uid() 
            AND users.id = active_game_sessions.user_id
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_notifications_enabled ON public.custom_notifications(enabled);
CREATE INDEX IF NOT EXISTS idx_custom_notifications_priority ON public.custom_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_custom_notifications_frequency ON public.custom_notifications(frequency_type);
CREATE INDEX IF NOT EXISTS idx_notification_user_status_user ON public.notification_user_status(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_status_notification ON public.notification_user_status(notification_id);
CREATE INDEX IF NOT EXISTS idx_active_game_sessions_user ON public.active_game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_game_sessions_active ON public.active_game_sessions(is_active);

-- Grant permissions
GRANT SELECT ON public.custom_notifications TO authenticated;
GRANT ALL ON public.notification_user_status TO authenticated;
GRANT ALL ON public.active_game_sessions TO authenticated;
GRANT ALL ON public.custom_notifications TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_notifications_updated_at
    BEFORE UPDATE ON public.custom_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_notifications_updated_at();

-- Add to realtime publication for live updates
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_user_status;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.active_game_sessions;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Tables already in realtime publication';
END $$;

-- Insert some default custom notifications
INSERT INTO public.custom_notifications (title, message, icon, color, priority, frequency_type, created_by, target_audience) VALUES
('🎮 Welcome to Adola!', 'Start your gaming journey with PKR 50 bonus! Play your favorite games and win big prizes.', 'game-controller', '#00FF88', 1, 'once', (SELECT id FROM public.users WHERE is_super_admin = true LIMIT 1), 'new_users'),
('💰 Daily Bonus Available!', 'Claim your daily bonus now! Login every day to get free coins and special rewards.', 'gift', '#FFD700', 3, 'daily', (SELECT id FROM public.users WHERE is_super_admin = true LIMIT 1), 'all'),
('🔥 Weekend Special!', 'Double your winnings this weekend! All games have increased payout rates. Play now!', 'flame', '#FF6B35', 2, 'weekly', (SELECT id FROM public.users WHERE is_super_admin = true LIMIT 1), 'active_users')
ON CONFLICT DO NOTHING;

-- Verify the setup
SELECT 
    'Custom Notifications System Setup Complete!' as status,
    COUNT(*) as default_notifications_created
FROM public.custom_notifications;
