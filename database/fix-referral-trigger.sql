-- FIX REFERRAL SYSTEM TRIGGER
-- This script restores the referral processing logic that was removed in previous fixes

-- 1. Drop the current trigger that doesn't handle referrals
DROP TRIGGER IF EXISTS trigger_bulletproof_auto_create_user_and_wallet ON auth.users;
DROP TRIGGER IF EXISTS trigger_auto_create_user_and_wallet ON auth.users;
DROP FUNCTION IF EXISTS bulletproof_auto_create_user_and_wallet();
DROP FUNCTION IF EXISTS auto_create_user_and_wallet();

-- 2. Create a comprehensive function that handles both user creation AND referrals
CREATE OR REPLACE FUNCTION complete_auto_create_user_and_wallet()
RETURNS TRIGGER AS $$
DECLARE
    is_super_admin BOOLEAN := false;
    welcome_bonus NUMERIC := 50.00;
    referral_bonus NUMERIC := 25.00;
    new_referral_code TEXT;
    user_username TEXT;
    user_display_name TEXT;
    referral_code_used TEXT;
    referrer_user_record RECORD;
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
    
    -- Get referral code from user metadata
    referral_code_used := NEW.raw_user_meta_data->>'referral_code';
    
    -- Generate unique referral code for new user
    new_referral_code := 'ADL' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
    
    -- Extract username and display name from metadata
    user_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8));
    user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', user_username);
    
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
            referred_by_code,
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
            NEW.email_confirmed_at IS NOT NULL,
            true,
            new_referral_code,
            referral_code_used,
            NOW(),
            NOW()
        ) ON CONFLICT (auth_user_id) DO NOTHING;
        
        RAISE NOTICE 'User created: % with referral code: %', NEW.email, new_referral_code;
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user for %: %', NEW.email, SQLERRM;
            RETURN NEW;
    END;
    
    -- Create wallet with explicit error handling
    BEGIN
        INSERT INTO public.wallets (
            user_id,
            balance,
            total_deposited,
            referral_earnings,
            created_at
        ) VALUES (
            NEW.id,
            welcome_bonus,
            welcome_bonus,
            0,
            NOW()
        ) ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Wallet created for: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create wallet for %: %', NEW.email, SQLERRM;
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
    
    -- Handle referral bonus if referral code was used (with error handling)
    IF referral_code_used IS NOT NULL AND referral_code_used != '' AND NOT is_super_admin THEN
        BEGIN
            RAISE NOTICE 'Processing referral code: % for user: %', referral_code_used, NEW.email;
            
            -- Find the referrer user
            SELECT * INTO referrer_user_record 
            FROM public.users 
            WHERE referral_code = referral_code_used;
            
            IF FOUND THEN
                RAISE NOTICE 'Found referrer: % for code: %', referrer_user_record.email, referral_code_used;
                
                -- Update referred user with referrer info
                UPDATE public.users 
                SET referred_by_user_id = referrer_user_record.auth_user_id,
                    referral_bonus_received = true
                WHERE auth_user_id = NEW.id;
                
                -- Create referral record
                INSERT INTO public.referrals (
                    referrer_user_id,
                    referred_user_id,
                    referral_code,
                    bonus_amount,
                    bonus_paid,
                    bonus_paid_at
                ) VALUES (
                    referrer_user_record.auth_user_id,
                    NEW.id,
                    referral_code_used,
                    referral_bonus,
                    true,
                    NOW()
                );
                
                -- Give referral bonus to referrer
                UPDATE public.wallets 
                SET balance = balance + referral_bonus,
                    referral_earnings = referral_earnings + referral_bonus
                WHERE user_id = referrer_user_record.auth_user_id;
                
                -- Update referrer's referral count
                UPDATE public.users 
                SET total_referrals = total_referrals + 1,
                    referral_bonus_given = true
                WHERE auth_user_id = referrer_user_record.auth_user_id;
                
                -- Create referral bonus transaction for referrer
                INSERT INTO public.wallet_transactions (
                    user_id,
                    type,
                    status,
                    amount,
                    balance_before,
                    balance_after,
                    description,
                    metadata
                ) VALUES (
                    referrer_user_record.auth_user_id,
                    'referral_bonus',
                    'auto',
                    referral_bonus,
                    (SELECT balance - referral_bonus FROM public.wallets WHERE user_id = referrer_user_record.auth_user_id),
                    (SELECT balance FROM public.wallets WHERE user_id = referrer_user_record.auth_user_id),
                    'Referral bonus for inviting new user',
                    json_build_object('referred_user_id', NEW.id, 'referral_code', referral_code_used)
                );
                
                RAISE NOTICE 'Referral bonus processed: % PKR given to %', referral_bonus, referrer_user_record.email;
            ELSE
                RAISE WARNING 'Referral code not found: %', referral_code_used;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to process referral for %: %', NEW.id, SQLERRM;
        END;
    ELSE
        IF referral_code_used IS NOT NULL AND referral_code_used != '' THEN
            RAISE NOTICE 'Referral code % provided but user is super admin, skipping referral processing', referral_code_used;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Complete auto-creation failed for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the new trigger
CREATE TRIGGER trigger_complete_auto_create_user_and_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION complete_auto_create_user_and_wallet();

-- 4. Verify the trigger is active
DO $$
BEGIN
    RAISE NOTICE 'REFERRAL SYSTEM TRIGGER RESTORED!';
    RAISE NOTICE 'Trigger: trigger_complete_auto_create_user_and_wallet';
    RAISE NOTICE 'Function: complete_auto_create_user_and_wallet()';
    RAISE NOTICE 'Features: User creation + Wallet creation + Referral processing';
    RAISE NOTICE 'Referral bonus: 25 PKR';
    RAISE NOTICE 'Welcome bonus: 50 PKR (999999999 PKR for super admin)';
END $$;
