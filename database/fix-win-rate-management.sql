-- =====================================================
-- FIX WIN RATE MANAGEMENT - GAME CONFIGS TABLE SETUP
-- Run this script in Supabase SQL Editor to enable admin win rate management
-- =====================================================

-- Create game_configs table
CREATE TABLE IF NOT EXISTS public.game_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_type TEXT UNIQUE NOT NULL,
    game_name TEXT NOT NULL,
    house_edge NUMERIC(5,4) DEFAULT 0.05,
    base_win_probability NUMERIC(5,4) DEFAULT 0.15,
    enabled BOOLEAN DEFAULT true,
    min_bet NUMERIC(15,2) DEFAULT 10.00,
    max_bet NUMERIC(15,2) DEFAULT 10000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default game configurations
INSERT INTO public.game_configs (game_type, game_name, house_edge, base_win_probability, enabled, min_bet, max_bet) VALUES
('dice', 'Dice Game', 0.05, 0.15, true, 10.00, 5000.00),
('mines', 'Mines Game', 0.04, 0.18, true, 10.00, 5000.00),
('tower', 'Tower Game', 0.06, 0.12, true, 10.00, 5000.00),
('aviator', 'Aviator Game', 0.03, 0.20, true, 10.00, 10000.00),
('crash', 'Crash Game', 0.03, 0.20, true, 10.00, 10000.00),
('slots', 'Diamond Slots', 0.08, 0.10, true, 10.00, 5000.00),
('blackjack', 'Blackjack', 0.05, 0.15, true, 10.00, 5000.00),
('poker', 'Poker', 0.06, 0.12, true, 10.00, 5000.00),
('roulette', 'Roulette', 0.05, 0.15, true, 10.00, 10000.00),
('baccarat', 'Baccarat', 0.04, 0.18, true, 10.00, 5000.00),
('powerball', 'PowerBall Lottery', 0.15, 0.05, true, 10.00, 1000.00),
('luckynumbers', 'Lucky Numbers', 0.12, 0.08, true, 10.00, 1000.00),
('megadraw', 'Mega Draw', 0.10, 0.10, true, 10.00, 1000.00),
('limbo', 'Limbo Game', 0.05, 0.15, true, 10.00, 5000.00),
('rollmaster', 'Roll Master', 0.04, 0.18, true, 10.00, 5000.00)
ON CONFLICT (game_type) DO UPDATE SET
    game_name = EXCLUDED.game_name,
    house_edge = EXCLUDED.house_edge,
    base_win_probability = EXCLUDED.base_win_probability,
    enabled = EXCLUDED.enabled,
    min_bet = EXCLUDED.min_bet,
    max_bet = EXCLUDED.max_bet,
    updated_at = NOW();

-- Enable RLS (Row Level Security)
ALTER TABLE public.game_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for game_configs table
-- Allow authenticated users to read game configs
CREATE POLICY "Allow authenticated users to read game configs" ON public.game_configs
    FOR SELECT TO authenticated USING (true);

-- Allow only admins to update game configs
CREATE POLICY "Allow admins to update game configs" ON public.game_configs
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.auth_user_id = auth.uid() 
            AND (users.is_admin = true OR users.is_super_admin = true)
        )
    );

-- Allow only admins to insert game configs
CREATE POLICY "Allow admins to insert game configs" ON public.game_configs
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.auth_user_id = auth.uid() 
            AND (users.is_admin = true OR users.is_super_admin = true)
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_configs_game_type ON public.game_configs(game_type);
CREATE INDEX IF NOT EXISTS idx_game_configs_enabled ON public.game_configs(enabled);

-- Grant permissions
GRANT SELECT ON public.game_configs TO authenticated;
GRANT UPDATE ON public.game_configs TO authenticated;
GRANT INSERT ON public.game_configs TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_game_configs_updated_at
    BEFORE UPDATE ON public.game_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_game_configs_updated_at();

-- Add to realtime publication for live updates
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_configs;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'game_configs table already in realtime publication';
END $$;

-- Verify the setup
SELECT 
    'Setup Complete!' as status,
    COUNT(*) as games_configured,
    'Admin win rate management is now functional' as message
FROM public.game_configs;
