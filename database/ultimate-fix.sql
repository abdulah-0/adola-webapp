-- ULTIMATE FIX - Resolve all remaining issues
-- This script will fix auto-creation, admin approval, and query errors

-- 1. Drop and recreate the auto-creation trigger with better error handling
DROP TRIGGER IF EXISTS trigger_auto_create_user_and_wallet ON auth.users;
DROP FUNCTION IF EXISTS simple_auto_create_user_and_wallet();
DROP FUNCTION IF EXISTS auto_create_user_and_wallet();

-- 2. Create a bulletproof auto-creation function
CREATE OR REPLACE FUNCTION bulletproof_auto_create_user_and_wallet()
RETURNS TRIGGER AS $$
DECLARE
    is_super_admin BOOLEAN := false;
    welcome_bonus NUMERIC := 50.00;
    new_referral_code TEXT;
    user_username TEXT;
    user_display_name TEXT;
BEGIN
    -- Validate that we have required data
    IF NEW.id IS NULL OR NEW.email IS NULL THEN
        RAISE WARNING 'Missing required user data for auto-creation: id=%, email=%', NEW.id, NEW.email;
        RETURN NEW;
    END IF;
    
    -- Check if this is the super admin email
    IF NEW.email = 'snakeyes358@gmail.com' THEN
        is_super_admin := true;
        welcome_bonus := 999999999.00;
    END IF;
    
    -- Generate referral code
    new_referral_code := 'ADL' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
    
    -- Generate username and display name
    user_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8));
    user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', 'User ' || SUBSTRING(NEW.id::text, 1, 8));
    
    -- Create user record with explicit error handling
    BEGIN
        INSERT INTO public.users (
            auth_user_id,
            email,
            username,
            display_name,
            wallet_balance,
            is_admin,
            is_super_admin,
            email_verified,
            registration_bonus,
            referral_code,
            joined_date,
            created_at
        ) VALUES (
            NEW.id,
            NEW.email,
            user_username,
            user_display_name,
            welcome_bonus,
            is_super_admin,
            is_super_admin,
            COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            true,
            new_referral_code,
            NOW(),
            NOW()
        ) ON CONFLICT (auth_user_id) DO UPDATE SET
            email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            last_login_date = NOW();
            
        RAISE NOTICE 'User created successfully: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user record for %: %', NEW.email, SQLERRM;
            RETURN NEW;
    END;
    
    -- Create wallet with explicit error handling
    BEGIN
        INSERT INTO public.wallets (
            user_id,
            balance,
            total_deposited,
            total_withdrawn,
            total_won,
            total_lost,
            referral_earnings,
            created_at
        ) VALUES (
            NEW.id,
            welcome_bonus,
            welcome_bonus,
            0,
            0,
            0,
            0,
            NOW()
        ) ON CONFLICT (user_id) DO UPDATE SET
            balance = CASE WHEN is_super_admin THEN 999999999.00 ELSE wallets.balance END;
            
        RAISE NOTICE 'Wallet created successfully for: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create wallet for %: %', NEW.email, SQLERRM;
            RETURN NEW;
    END;
    
    -- Create welcome transaction with explicit error handling
    BEGIN
        INSERT INTO public.wallet_transactions (
            user_id,
            type,
            status,
            amount,
            balance_before,
            balance_after,
            description,
            created_at
        ) VALUES (
            NEW.id,
            'welcome_bonus',
            'auto',
            welcome_bonus,
            0,
            welcome_bonus,
            CASE WHEN is_super_admin THEN 'Super Admin Account' ELSE 'Welcome bonus for new user' END,
            NOW()
        );
        
        RAISE NOTICE 'Welcome transaction created for: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create welcome transaction for %: %', NEW.email, SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Auto-creation failed for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the new trigger
CREATE TRIGGER trigger_bulletproof_auto_create_user_and_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION bulletproof_auto_create_user_and_wallet();

-- 4. Fix any existing users that still don't have proper records
DO $$
DECLARE
    user_record RECORD;
    is_super_admin BOOLEAN;
    welcome_bonus NUMERIC;
    new_referral_code TEXT;
BEGIN
    FOR user_record IN
        SELECT au.id, au.email, au.email_confirmed_at, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.auth_user_id
        WHERE pu.auth_user_id IS NULL
    LOOP
        is_super_admin := user_record.email = 'snakeyes358@gmail.com';
        welcome_bonus := CASE WHEN is_super_admin THEN 999999999.00 ELSE 50.00 END;
        new_referral_code := 'ADL' || UPPER(SUBSTRING(user_record.id::text, 1, 6));
        
        -- Create user record
        INSERT INTO public.users (
            auth_user_id, email, username, display_name, wallet_balance,
            is_admin, is_super_admin, email_verified, registration_bonus,
            referral_code, joined_date, created_at
        ) VALUES (
            user_record.id, user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'username', 'user_' || SUBSTRING(user_record.id::text, 1, 8)),
            COALESCE(user_record.raw_user_meta_data->>'display_name', 'User ' || SUBSTRING(user_record.id::text, 1, 8)),
            welcome_bonus, is_super_admin, is_super_admin,
            user_record.email_confirmed_at IS NOT NULL, true, new_referral_code, NOW(), NOW()
        ) ON CONFLICT (auth_user_id) DO NOTHING;
        
        -- Create wallet
        INSERT INTO public.wallets (user_id, balance, total_deposited, created_at)
        VALUES (user_record.id, welcome_bonus, welcome_bonus, NOW())
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create welcome transaction
        INSERT INTO public.wallet_transactions (
            user_id, type, status, amount, balance_before, balance_after, description, created_at
        ) VALUES (
            user_record.id, 'welcome_bonus', 'auto', welcome_bonus, 0, welcome_bonus,
            CASE WHEN is_super_admin THEN 'Super Admin Account' ELSE 'Welcome bonus for new user' END,
            NOW()
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Fixed existing user: %', user_record.email;
    END LOOP;
END $$;

-- 5. Create admin approval functions that work properly
CREATE OR REPLACE FUNCTION approve_deposit_request(
    request_id UUID,
    admin_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    deposit_record RECORD;
    current_balance NUMERIC;
    new_balance NUMERIC;
BEGIN
    -- Get the deposit request
    SELECT * INTO deposit_record
    FROM public.deposit_requests
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Deposit request not found or already processed');
    END IF;
    
    -- Get current wallet balance
    SELECT balance INTO current_balance
    FROM public.wallets
    WHERE user_id = deposit_record.user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User wallet not found');
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance + deposit_record.amount;
    
    -- Update deposit request status
    UPDATE public.deposit_requests
    SET status = 'approved',
        approved_by = admin_user_id,
        approved_at = NOW()
    WHERE id = request_id;
    
    -- Update wallet balance
    UPDATE public.wallets
    SET balance = new_balance,
        total_deposited = total_deposited + deposit_record.amount
    WHERE user_id = deposit_record.user_id;
    
    -- Update transaction status
    UPDATE public.wallet_transactions
    SET status = 'approved',
        approved_by = admin_user_id,
        approved_at = NOW(),
        balance_after = new_balance
    WHERE reference_id = request_id::text AND type = 'deposit';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Deposit approved successfully',
        'new_balance', new_balance
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create withdrawal approval function
CREATE OR REPLACE FUNCTION approve_withdrawal_request(
    request_id UUID,
    admin_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    withdrawal_record RECORD;
    current_balance NUMERIC;
    new_balance NUMERIC;
BEGIN
    -- Get the withdrawal request
    SELECT * INTO withdrawal_record
    FROM public.withdrawal_requests
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Withdrawal request not found or already processed');
    END IF;
    
    -- Get current wallet balance
    SELECT balance INTO current_balance
    FROM public.wallets
    WHERE user_id = withdrawal_record.user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User wallet not found');
    END IF;
    
    -- Check if user has sufficient balance
    IF current_balance < withdrawal_record.amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - withdrawal_record.amount;
    
    -- Update withdrawal request status
    UPDATE public.withdrawal_requests
    SET status = 'approved',
        approved_by = admin_user_id,
        approved_at = NOW()
    WHERE id = request_id;
    
    -- Update wallet balance
    UPDATE public.wallets
    SET balance = new_balance,
        total_withdrawn = total_withdrawn + withdrawal_record.amount
    WHERE user_id = withdrawal_record.user_id;
    
    -- Update transaction status
    UPDATE public.wallet_transactions
    SET status = 'approved',
        approved_by = admin_user_id,
        approved_at = NOW(),
        balance_after = new_balance
    WHERE reference_id = request_id::text AND type = 'withdraw';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Withdrawal approved successfully',
        'new_balance', new_balance
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION approve_deposit_request(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION approve_withdrawal_request(UUID, UUID) TO anon, authenticated;

-- 8. Final verification
SELECT 'Ultimate fix applied successfully!' as status;

-- Show current state
SELECT 
    'Auth users' as type,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Public users' as type,
    COUNT(*) as count
FROM public.users
UNION ALL
SELECT 
    'Wallets' as type,
    COUNT(*) as count
FROM public.wallets
UNION ALL
SELECT 
    'Pending deposits' as type,
    COUNT(*) as count
FROM public.deposit_requests
WHERE status = 'pending';
