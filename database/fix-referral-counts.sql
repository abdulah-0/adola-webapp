-- Fix Referral Counts
-- This script recalculates and fixes the total_referrals count for all users

-- Update total_referrals count based on actual referrals in the referrals table
UPDATE public.users 
SET total_referrals = (
    SELECT COUNT(*) 
    FROM public.referrals 
    WHERE referrals.referrer_user_id = users.auth_user_id
)
WHERE referral_code IS NOT NULL;

-- Show the results
SELECT 
    u.email,
    u.username,
    u.referral_code,
    u.total_referrals as updated_count,
    (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_user_id = u.auth_user_id) as actual_referrals
FROM public.users u 
WHERE u.referral_code IS NOT NULL 
ORDER BY u.total_referrals DESC;

-- Also ensure all users who were referred have the proper referrer information
UPDATE public.users 
SET referred_by_user_id = (
    SELECT r.referrer_user_id 
    FROM public.referrals r 
    WHERE r.referred_user_id = users.auth_user_id 
    LIMIT 1
)
WHERE auth_user_id IN (
    SELECT DISTINCT referred_user_id 
    FROM public.referrals
) 
AND referred_by_user_id IS NULL;

-- Show users who have been referred
SELECT 
    u.email,
    u.username,
    u.referred_by_code,
    referrer.email as referrer_email,
    referrer.username as referrer_username
FROM public.users u
LEFT JOIN public.users referrer ON referrer.auth_user_id = u.referred_by_user_id
WHERE u.referred_by_user_id IS NOT NULL
ORDER BY u.created_at DESC;
