-- =====================================================
-- ADOLA GAMING PLATFORM - CREATE SUPER ADMIN
-- Add jacknick476@gmail.com as Super Admin
-- =====================================================

-- ⚠️ IMPORTANT: User must first sign up through the app!
-- This script only promotes existing users to super admin
-- Password is handled by Supabase Auth, not database

-- =====================================================
-- STEP 1: PROMOTE EXISTING USER TO SUPER ADMIN
-- =====================================================

-- Promote jacknick476@gmail.com to super admin
UPDATE public.users 
SET 
    is_admin = true,
    is_super_admin = true,
    wallet_balance = 999999999.00, -- Unlimited balance for super admin
    updated_at = NOW()
WHERE email = 'jacknick476@gmail.com';

-- =====================================================
-- STEP 2: VERIFY SUPER ADMIN CREATION
-- =====================================================

-- Check if user exists and is now super admin
SELECT 
    id,
    email,
    username,
    display_name,
    is_admin,
    is_super_admin,
    wallet_balance,
    created_at,
    updated_at
FROM public.users 
WHERE email = 'jacknick476@gmail.com';

-- =====================================================
-- STEP 3: LOG THE SUPER ADMIN CREATION
-- =====================================================

-- Insert audit log for super admin creation
INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_user_id,
    details,
    created_at
) 
SELECT 
    (SELECT id FROM public.users WHERE email = 'snakeyes358@gmail.com'), -- Original super admin
    'promote_to_super_admin',
    u.id,
    jsonb_build_object(
        'promoted_user_email', u.email,
        'promoted_user_username', u.username,
        'new_balance', u.wallet_balance,
        'promotion_method', 'sql_script',
        'promoted_by', 'database_admin'
    ),
    NOW()
FROM public.users u 
WHERE u.email = 'jacknick476@gmail.com' AND u.is_super_admin = true;

-- =====================================================
-- STEP 4: VERIFY ALL SUPER ADMINS
-- =====================================================

-- List all current super admins
SELECT 
    email,
    username,
    display_name,
    is_admin,
    is_super_admin,
    wallet_balance,
    created_at
FROM public.users 
WHERE is_super_admin = true
ORDER BY created_at ASC;

-- =====================================================
-- STEP 5: COUNT ADMIN LEVELS
-- =====================================================

-- Summary of admin accounts
SELECT 
    'Super Admins' as admin_type,
    COUNT(*) as count
FROM public.users 
WHERE is_super_admin = true

UNION ALL

SELECT 
    'Regular Admins' as admin_type,
    COUNT(*) as count
FROM public.users 
WHERE is_admin = true AND is_super_admin = false

UNION ALL

SELECT 
    'Regular Users' as admin_type,
    COUNT(*) as count
FROM public.users 
WHERE is_admin = false;

-- =====================================================
-- ALTERNATIVE: CREATE USER IF NOT EXISTS (ADVANCED)
-- =====================================================

-- ⚠️ WARNING: This bypasses normal signup process
-- Only use if you need to create user directly in database
-- This will NOT work with Supabase Auth - user still needs to sign up

/*
-- Check if user exists, if not create them
DO $$
DECLARE
    user_exists BOOLEAN;
    new_user_id UUID;
BEGIN
    -- Check if user already exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE email = 'jacknick476@gmail.com') INTO user_exists;
    
    IF NOT user_exists THEN
        -- Generate new UUID for user
        new_user_id := uuid_generate_v4();
        
        -- Insert new super admin user
        INSERT INTO public.users (
            id,
            auth_user_id,
            email,
            username,
            display_name,
            wallet_balance,
            is_admin,
            is_super_admin,
            email_verified,
            registration_bonus,
            referral_code
        ) VALUES (
            new_user_id,
            new_user_id, -- Using same ID for auth_user_id (will need manual auth setup)
            'jacknick476@gmail.com',
            'jacknick476',
            'Jack Nick',
            999999999.00,
            true,
            true,
            true,
            true,
            'JACK' || SUBSTRING(new_user_id::text, 1, 6)
        );
        
        RAISE NOTICE 'Created new super admin user: jacknick476@gmail.com';
        RAISE NOTICE 'User ID: %', new_user_id;
        RAISE NOTICE '⚠️ WARNING: User still needs to sign up through Supabase Auth!';
    ELSE
        -- User exists, just promote to super admin
        UPDATE public.users 
        SET 
            is_admin = true,
            is_super_admin = true,
            wallet_balance = 999999999.00,
            updated_at = NOW()
        WHERE email = 'jacknick476@gmail.com';
        
        RAISE NOTICE 'Promoted existing user to super admin: jacknick476@gmail.com';
    END IF;
END $$;
*/

-- =====================================================
-- INSTRUCTIONS FOR COMPLETE SETUP
-- =====================================================

/*
COMPLETE SUPER ADMIN SETUP PROCESS:

1. USER SIGNUP (REQUIRED FIRST):
   - User must sign up through the Adola app
   - Email: jacknick476@gmail.com
   - Password: +Bmwez786
   - This creates the auth record in Supabase

2. RUN THIS SQL SCRIPT:
   - Execute the UPDATE statement above
   - This promotes the user to super admin in the database

3. VERIFICATION:
   - User can now login with jacknick476@gmail.com / +Bmwez786
   - They will have full super admin access
   - Unlimited wallet balance (PKR 999,999,999)
   - Can access all admin panel features

4. SUPER ADMIN CAPABILITIES:
   - Promote/demote other users
   - Approve/reject all transactions
   - Access all analytics and reports
   - Manage platform settings
   - Cannot be demoted by other admins

CURRENT SUPER ADMINS:
- snakeyes358@gmail.com (original)
- jacknick476@gmail.com (new - after running this script)

SECURITY NOTES:
- Keep super admin credentials secure
- Regularly review admin access
- Monitor admin_logs table for all actions
- Both super admins have equal privileges
*/
