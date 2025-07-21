-- CRITICAL FIXES - Run this if quick-fixes.sql has issues
-- This script contains only the most essential fixes

-- 1. Add missing joined_date column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS joined_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
UPDATE public.users SET joined_date = created_at WHERE joined_date IS NULL;

-- 2. Create missing wallets for existing users
INSERT INTO public.wallets (user_id, balance, total_deposited)
SELECT 
    u.auth_user_id,
    CASE WHEN u.email = 'snakeyes358@gmail.com' THEN 999999999.00 ELSE 50.00 END,
    CASE WHEN u.email = 'snakeyes358@gmail.com' THEN 999999999.00 ELSE 50.00 END
FROM public.users u
LEFT JOIN public.wallets w ON u.auth_user_id = w.user_id
WHERE w.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Create missing welcome transactions
INSERT INTO public.wallet_transactions (user_id, type, status, amount, balance_before, balance_after, description)
SELECT 
    u.auth_user_id,
    'welcome_bonus',
    'auto',
    CASE WHEN u.email = 'snakeyes358@gmail.com' THEN 999999999.00 ELSE 50.00 END,
    0,
    CASE WHEN u.email = 'snakeyes358@gmail.com' THEN 999999999.00 ELSE 50.00 END,
    CASE WHEN u.email = 'snakeyes358@gmail.com' THEN 'Super Admin Account' ELSE 'Welcome bonus for new user' END
FROM public.users u
LEFT JOIN public.wallet_transactions wt ON u.auth_user_id = wt.user_id AND wt.type = 'welcome_bonus'
WHERE wt.id IS NULL;

-- 4. Update super admin flags
UPDATE public.users 
SET is_admin = true, is_super_admin = true, wallet_balance = 999999999.00
WHERE email = 'snakeyes358@gmail.com';

-- 5. Update super admin wallet balance
UPDATE public.wallets 
SET balance = 999999999.00, total_deposited = 999999999.00
WHERE user_id = (SELECT auth_user_id FROM public.users WHERE email = 'snakeyes358@gmail.com');

-- 6. Generate referral codes for users who don't have them
UPDATE public.users 
SET referral_code = 'ADL' || UPPER(SUBSTRING(auth_user_id::text, 1, 6))
WHERE referral_code IS NULL;

-- 7. Make RLS policies permissive
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;
CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on wallets" ON public.wallets;
CREATE POLICY "Allow all operations on wallets" ON public.wallets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on transactions" ON public.wallet_transactions;
CREATE POLICY "Allow all operations on transactions" ON public.wallet_transactions FOR ALL USING (true) WITH CHECK (true);

-- 8. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 9. Verification
SELECT 'Critical fixes applied successfully!' as status;

-- Show results
SELECT 
    'Users with wallets' as check_type,
    COUNT(*) as count
FROM public.users u
INNER JOIN public.wallets w ON u.auth_user_id = w.user_id

UNION ALL

SELECT 
    'Users without wallets' as check_type,
    COUNT(*) as count
FROM public.users u
LEFT JOIN public.wallets w ON u.auth_user_id = w.user_id
WHERE w.user_id IS NULL

UNION ALL

SELECT 
    'Super admin status' as check_type,
    COUNT(*) as count
FROM public.users 
WHERE email = 'snakeyes358@gmail.com' AND is_super_admin = true

UNION ALL

SELECT 
    'Total users' as check_type,
    COUNT(*) as count
FROM public.users;
