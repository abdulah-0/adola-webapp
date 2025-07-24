-- =====================================================
-- FIX GAME CONFIGS PERMISSIONS
-- Run this to fix the "permission denied" error
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read game configs" ON public.game_configs;
DROP POLICY IF EXISTS "Allow admins to update game configs" ON public.game_configs;
DROP POLICY IF EXISTS "Allow admins to insert game configs" ON public.game_configs;
DROP POLICY IF EXISTS "Allow all users to read game configs" ON public.game_configs;

-- Create new policies
-- Allow ALL users (including anon) to read game configs - needed for games to work
CREATE POLICY "Allow all users to read game configs" ON public.game_configs
    FOR SELECT USING (true);

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

-- Grant permissions to both authenticated and anonymous users
GRANT SELECT ON public.game_configs TO anon, authenticated;
GRANT UPDATE ON public.game_configs TO authenticated;
GRANT INSERT ON public.game_configs TO authenticated;

-- Verify the fix
SELECT 
    'Permissions Fixed!' as status,
    'Game configs should now be readable by all users' as message;
