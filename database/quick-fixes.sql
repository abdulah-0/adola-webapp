-- QUICK FIXES FOR CURRENT ISSUES
-- Run this script to fix immediate problems

-- 1. Add missing joined_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'joined_date') THEN
        ALTER TABLE public.users ADD COLUMN joined_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        UPDATE public.users SET joined_date = created_at WHERE joined_date IS NULL;
    END IF;
END $$;

-- 2. Fix the auto-creation trigger to handle all edge cases
CREATE OR REPLACE FUNCTION auto_create_user_and_wallet()
RETURNS TRIGGER AS $$
DECLARE
    is_super_admin BOOLEAN := false;
    referral_code_used TEXT;
    referrer_user_record RECORD;
    welcome_bonus NUMERIC := 50.00;
    referral_bonus NUMERIC := 25.00;
    new_referral_code TEXT;
BEGIN
    -- Check if this is the super admin email
    IF NEW.email = 'snakeyes358@gmail.com' THEN
        is_super_admin := true;
        welcome_bonus := 999999999.00;
    END IF;
    
    -- Get referral code from user metadata
    referral_code_used := NEW.raw_user_meta_data->>'referral_code';
    
    -- Generate unique referral code
    new_referral_code := 'ADL' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
    
    -- Create user record in public.users (with error handling)
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
            referred_by_code,
            referral_code,
            joined_date
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)),
            COALESCE(NEW.raw_user_meta_data->>'display_name', 'User ' || SUBSTRING(NEW.id::text, 1, 8)),
            welcome_bonus,
            is_super_admin,
            is_super_admin,
            NEW.email_confirmed_at IS NOT NULL,
            true,
            referral_code_used,
            new_referral_code,
            NOW()
        ) ON CONFLICT (auth_user_id) DO UPDATE SET
            email_verified = NEW.email_confirmed_at IS NOT NULL,
            last_login_date = NOW();
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user record for %: %', NEW.id, SQLERRM;
    END;
    
    -- Create wallet (with error handling)
    BEGIN
        INSERT INTO public.wallets (
            user_id,
            balance,
            total_deposited
        ) VALUES (
            NEW.id,
            welcome_bonus,
            welcome_bonus
        ) ON CONFLICT (user_id) DO UPDATE SET
            balance = EXCLUDED.balance,
            total_deposited = EXCLUDED.total_deposited;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create wallet for %: %', NEW.id, SQLERRM;
    END;
    
    -- Create welcome bonus transaction (with error handling)
    BEGIN
        INSERT INTO public.wallet_transactions (
            user_id,
            type,
            status,
            amount,
            balance_before,
            balance_after,
            description
        ) VALUES (
            NEW.id,
            'welcome_bonus',
            'auto',
            welcome_bonus,
            0,
            welcome_bonus,
            CASE WHEN is_super_admin THEN 'Super Admin Account' ELSE 'Welcome bonus for new user' END
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create welcome transaction for %: %', NEW.id, SQLERRM;
    END;
    
    -- Handle referral bonus if referral code was used (with error handling)
    IF referral_code_used IS NOT NULL AND referral_code_used != '' AND NOT is_super_admin THEN
        BEGIN
            -- Find the referrer user
            SELECT * INTO referrer_user_record 
            FROM public.users 
            WHERE referral_code = referral_code_used;
            
            IF FOUND THEN
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
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to process referral for %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Failed to auto-create user and wallet for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_create_user_and_wallet ON auth.users;
CREATE TRIGGER trigger_auto_create_user_and_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_user_and_wallet();

-- 4. Fix any existing users without wallets
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
        -- Determine if super admin
        is_super_admin := user_record.email = 'snakeyes358@gmail.com';
        welcome_bonus := CASE WHEN is_super_admin THEN 999999999.00 ELSE 50.00 END;
        new_referral_code := 'ADL' || UPPER(SUBSTRING(user_record.id::text, 1, 6));

        -- Create user record
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
            joined_date
        ) VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'username', 'user_' || SUBSTRING(user_record.id::text, 1, 8)),
            COALESCE(user_record.raw_user_meta_data->>'display_name', 'User ' || SUBSTRING(user_record.id::text, 1, 8)),
            welcome_bonus,
            is_super_admin,
            is_super_admin,
            user_record.email_confirmed_at IS NOT NULL,
            true,
            new_referral_code,
            NOW()
        ) ON CONFLICT (auth_user_id) DO NOTHING;

        -- Create wallet
        INSERT INTO public.wallets (
            user_id,
            balance,
            total_deposited
        ) VALUES (
            user_record.id,
            welcome_bonus,
            welcome_bonus
        ) ON CONFLICT (user_id) DO NOTHING;

        -- Create welcome transaction
        INSERT INTO public.wallet_transactions (
            user_id,
            type,
            status,
            amount,
            balance_before,
            balance_after,
            description
        ) VALUES (
            user_record.id,
            'welcome_bonus',
            'auto',
            welcome_bonus,
            0,
            welcome_bonus,
            CASE WHEN is_super_admin THEN 'Super Admin Account' ELSE 'Welcome bonus for new user' END
        );

        RAISE NOTICE 'Fixed user: % (Super Admin: %)', user_record.email, is_super_admin;
    END LOOP;
END $$;

-- 5. Update RLS policies to be more permissive
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;
CREATE POLICY "Allow all operations on users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on wallets" ON public.wallets;
CREATE POLICY "Allow all operations on wallets" ON public.wallets
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Grant additional permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 7. Final verification
SELECT 'Quick fixes applied successfully!' as status;
SELECT 'Auto-creation trigger updated and existing users fixed' as note;
SELECT 'Email confirmation requirement should be disabled in Supabase Auth settings' as reminder;
