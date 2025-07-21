-- =====================================================
-- ADOLA GAMING PLATFORM - PROMOTE USER TO ADMIN
-- SQL Script to update a regular user to admin status
-- =====================================================

-- =====================================================
-- METHOD 1: PROMOTE USER BY EMAIL (RECOMMENDED)
-- =====================================================

-- Replace 'jacknick476@gmail.com' with the actual user email
-- This will make the user a regular admin (not super admin)

UPDATE public.users
SET
    is_admin = true,
    updated_at = NOW()
WHERE email = 'jacknick476@gmail.com';

-- Verify the update
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
-- METHOD 2: PROMOTE USER BY USERNAME
-- =====================================================

-- Replace 'username123' with the actual username
UPDATE public.users
SET
    is_admin = true,
    updated_at = NOW()
WHERE username = 'username123';

-- =====================================================
-- METHOD 3: PROMOTE USER BY USER ID
-- =====================================================

-- Replace 'user-uuid-here' with the actual user ID
UPDATE public.users
SET
    is_admin = true,
    updated_at = NOW()
WHERE id = 'user-uuid-here';

-- =====================================================
-- METHOD 4: PROMOTE TO SUPER ADMIN (DANGEROUS!)
-- =====================================================

-- Only use this for trusted administrators
-- Super admins have unlimited privileges
UPDATE public.users
SET
    is_admin = true,
    is_super_admin = true,
    updated_at = NOW()
WHERE email = 'trusted-admin@example.com';

-- =====================================================
-- BULK OPERATIONS
-- =====================================================

-- BULK PROMOTE: Multiple users to regular admin
UPDATE public.users
SET
    is_admin = true,
    updated_at = NOW()
WHERE email IN (
    'admin1@example.com',
    'admin2@example.com',
    'admin3@example.com'
);

-- BULK PROMOTE: Multiple users by username
UPDATE public.users
SET
    is_admin = true,
    updated_at = NOW()
WHERE username IN (
    'admin_user1',
    'admin_user2',
    'admin_user3'
);

-- =====================================================
-- REVOKE ADMIN ACCESS (DEMOTE TO REGULAR USER)
-- =====================================================

-- Remove admin access from a user (demote to regular user)
UPDATE public.users
SET
    is_admin = false,
    is_super_admin = false,
    updated_at = NOW()
WHERE email = 'demote@example.com';

-- Remove admin access from multiple users
UPDATE public.users
SET
    is_admin = false,
    is_super_admin = false,
    updated_at = NOW()
WHERE email IN (
    'user1@example.com',
    'user2@example.com'
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all current admins
SELECT 
    id,
    email,
    username,
    display_name,
    is_admin,
    is_super_admin,
    admin_permissions,
    wallet_balance,
    created_at
FROM public.users 
WHERE is_admin = true 
ORDER BY is_super_admin DESC, created_at ASC;

-- Check specific user admin status
SELECT
    email,
    username,
    is_admin,
    is_super_admin,
    wallet_balance,
    created_at
FROM public.users
WHERE email = 'jacknick476@gmail.com';

-- Count total admins
SELECT 
    COUNT(*) as total_admins,
    COUNT(*) FILTER (WHERE is_super_admin = true) as super_admins,
    COUNT(*) FILTER (WHERE is_admin = true AND is_super_admin = false) as regular_admins
FROM public.users;

-- =====================================================
-- LOG ADMIN PROMOTION (AUDIT TRAIL)
-- =====================================================

-- Insert audit log for admin promotion
INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_user_id,
    details,
    created_at
)
SELECT
    (SELECT id FROM public.users WHERE email = 'snakeyes358@gmail.com'), -- Super admin ID
    'promote_to_admin',
    u.id,
    jsonb_build_object(
        'promoted_user_email', u.email,
        'promoted_user_username', u.username,
        'is_admin', u.is_admin,
        'is_super_admin', u.is_super_admin,
        'promotion_method', 'sql_script'
    ),
    NOW()
FROM public.users u
WHERE u.email = 'jacknick476@gmail.com' AND u.is_admin = true;

-- =====================================================
-- ADMIN SYSTEM REFERENCE
-- =====================================================

/*
ADMIN SYSTEM EXPLANATION:

DATABASE COLUMNS:
- is_admin (boolean): Basic admin access to admin panel
- is_super_admin (boolean): Full administrative privileges

ADMIN LEVELS:

1. REGULAR USER
   - is_admin = false
   - is_super_admin = false
   - No admin panel access

2. REGULAR ADMIN
   - is_admin = true
   - is_super_admin = false
   - Can access admin panel
   - Limited privileges (managed through app logic)

3. SUPER ADMIN
   - is_admin = true
   - is_super_admin = true
   - Full administrative access
   - Can promote/demote other users
   - Cannot be demoted

SUPER ADMIN ACCOUNT:
- Email: snakeyes358@gmail.com
- Automatically gets super admin status
- Unlimited wallet balance (PKR 999,999,999)
- Cannot be demoted or deleted

SECURITY NOTES:
- Admin permissions are handled in the app code
- Database only stores basic admin flags
- All admin actions are logged in admin_logs table
- Regular admins can be promoted/demoted by super admin
- Use audit logs to track all administrative changes

PROMOTION PROCESS:
1. User must already exist in the system
2. Update is_admin = true for basic admin access
3. Update is_super_admin = true only for trusted administrators
4. User can immediately access admin panel with existing credentials
5. No password change required
*/
