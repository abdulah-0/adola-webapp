-- Fix RLS policies for user_game_statistics table
-- This allows users to insert and update their own game statistics

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own game statistics" ON user_game_statistics;
DROP POLICY IF EXISTS "Admins can view all game statistics" ON user_game_statistics;

-- Create new policies that allow users to manage their own stats
CREATE POLICY "Users can manage their own game statistics" ON user_game_statistics 
FOR ALL USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Allow admins to view all game statistics
CREATE POLICY "Admins can view all game statistics" ON user_game_statistics 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND (users.is_admin = true OR users.is_super_admin = true))
);

-- Also fix the trigger function to work with RLS
-- Grant necessary permissions for the trigger function
GRANT INSERT, UPDATE ON user_game_statistics TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Update the trigger function to bypass RLS when called from game sessions
CREATE OR REPLACE FUNCTION trigger_update_user_game_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Use SECURITY DEFINER to bypass RLS for this system function
    PERFORM update_user_game_statistics(
        NEW.user_id,
        NEW.game_id,
        NEW.bet_amount,
        COALESCE(NEW.win_amount, 0),
        NEW.is_win
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the main function to also use SECURITY DEFINER
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION update_user_game_statistics(UUID, TEXT, NUMERIC, NUMERIC, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_update_user_game_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_game_stats(UUID, TEXT) TO authenticated;
