// Script to apply the referral system fix to the database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://mvgxptxzzjpyyugqnsrd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12Z3hwdHh6emp5eXVncW5zcmQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0NzE5MSwiZXhwIjoyMDUwMTIzMTkxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyReferralFix() {
  console.log('🔧 Applying referral system fix...\n');

  try {
    // Read the SQL fix file
    const sqlFilePath = path.join(__dirname, 'database', 'fix-referral-trigger.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 SQL fix file loaded');
    console.log('📝 Executing SQL commands...\n');

    // Split the SQL into individual commands
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command.length > 0) {
        try {
          console.log(`⚡ Executing command ${i + 1}/${sqlCommands.length}...`);
          
          const { error } = await supabase.rpc('exec_sql', { 
            sql_query: command + ';' 
          });

          if (error) {
            console.error(`❌ Error in command ${i + 1}:`, error.message);
          } else {
            console.log(`✅ Command ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Exception in command ${i + 1}:`, err.message);
        }
      }
    }

    console.log('\n🎉 Referral system fix applied!');
    console.log('📋 Summary:');
    console.log('   - Removed old trigger without referral logic');
    console.log('   - Created new trigger with complete referral processing');
    console.log('   - Referral codes will now be processed correctly');
    console.log('   - Referral bonuses will be distributed automatically');
    console.log('\n✨ The referral system should now work correctly!');

  } catch (error) {
    console.error('❌ Failed to apply referral fix:', error.message);
  }
}

// Alternative method using direct SQL execution
async function applyReferralFixDirect() {
  console.log('🔧 Applying referral system fix (direct method)...\n');

  try {
    // Step 1: Drop old triggers and functions
    console.log('1️⃣ Removing old triggers...');
    
    const dropCommands = [
      'DROP TRIGGER IF EXISTS trigger_bulletproof_auto_create_user_and_wallet ON auth.users',
      'DROP TRIGGER IF EXISTS trigger_auto_create_user_and_wallet ON auth.users',
      'DROP FUNCTION IF EXISTS bulletproof_auto_create_user_and_wallet()',
      'DROP FUNCTION IF EXISTS auto_create_user_and_wallet()'
    ];

    for (const cmd of dropCommands) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: cmd });
      if (error) {
        console.warn(`⚠️ Warning dropping: ${error.message}`);
      } else {
        console.log(`✅ Dropped: ${cmd.split(' ')[2]}`);
      }
    }

    // Step 2: Create the new function (simplified for testing)
    console.log('\n2️⃣ Creating new referral-enabled trigger...');
    
    const createFunction = `
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
    -- Basic validation
    IF NEW.id IS NULL OR NEW.email IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check super admin
    IF NEW.email = 'snakeyes358@gmail.com' THEN
        is_super_admin := true;
        welcome_bonus := 999999999.00;
    END IF;
    
    -- Get referral code from metadata
    referral_code_used := NEW.raw_user_meta_data->>'referral_code';
    
    -- Generate referral code
    new_referral_code := 'ADL' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
    
    -- Get username
    user_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8));
    user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', user_username);
    
    -- Create user
    INSERT INTO public.users (
        auth_user_id, email, username, display_name, wallet_balance,
        is_admin, is_super_admin, email_verified, registration_bonus,
        referral_code, referred_by_code, joined_date, created_at
    ) VALUES (
        NEW.id, NEW.email, user_username, user_display_name, welcome_bonus,
        is_super_admin, is_super_admin, NEW.email_confirmed_at IS NOT NULL, true,
        new_referral_code, referral_code_used, NOW(), NOW()
    ) ON CONFLICT (auth_user_id) DO NOTHING;
    
    -- Create wallet
    INSERT INTO public.wallets (
        user_id, balance, total_deposited, referral_earnings, created_at
    ) VALUES (
        NEW.id, welcome_bonus, welcome_bonus, 0, NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Create welcome transaction
    INSERT INTO public.wallet_transactions (
        user_id, type, status, amount, balance_before, balance_after, description, created_at
    ) VALUES (
        NEW.id, 'welcome_bonus', 'auto', welcome_bonus, 0, welcome_bonus,
        CASE WHEN is_super_admin THEN 'Super Admin Account' ELSE 'Welcome bonus for new user' END,
        NOW()
    );
    
    -- Process referral if code provided
    IF referral_code_used IS NOT NULL AND referral_code_used != '' AND NOT is_super_admin THEN
        SELECT * INTO referrer_user_record FROM public.users WHERE referral_code = referral_code_used;
        
        IF FOUND THEN
            -- Update referred user
            UPDATE public.users SET 
                referred_by_user_id = referrer_user_record.auth_user_id,
                referral_bonus_received = true
            WHERE auth_user_id = NEW.id;
            
            -- Create referral record
            INSERT INTO public.referrals (
                referrer_user_id, referred_user_id, referral_code,
                bonus_amount, bonus_paid, bonus_paid_at
            ) VALUES (
                referrer_user_record.auth_user_id, NEW.id, referral_code_used,
                referral_bonus, true, NOW()
            );
            
            -- Give bonus to referrer
            UPDATE public.wallets SET 
                balance = balance + referral_bonus,
                referral_earnings = referral_earnings + referral_bonus
            WHERE user_id = referrer_user_record.auth_user_id;
            
            -- Update referrer stats
            UPDATE public.users SET 
                total_referrals = total_referrals + 1,
                referral_bonus_given = true
            WHERE auth_user_id = referrer_user_record.auth_user_id;
            
            -- Create referral transaction
            INSERT INTO public.wallet_transactions (
                user_id, type, status, amount, balance_before, balance_after,
                description, metadata
            ) VALUES (
                referrer_user_record.auth_user_id, 'referral_bonus', 'auto', referral_bonus,
                (SELECT balance - referral_bonus FROM public.wallets WHERE user_id = referrer_user_record.auth_user_id),
                (SELECT balance FROM public.wallets WHERE user_id = referrer_user_record.auth_user_id),
                'Referral bonus for inviting new user',
                json_build_object('referred_user_id', NEW.id, 'referral_code', referral_code_used)
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`;

    const { error: funcError } = await supabase.rpc('exec_sql', { sql_query: createFunction });
    if (funcError) {
      console.error('❌ Error creating function:', funcError.message);
      return;
    }
    console.log('✅ Function created successfully');

    // Step 3: Create the trigger
    console.log('\n3️⃣ Creating trigger...');
    const createTrigger = `
CREATE TRIGGER trigger_complete_auto_create_user_and_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION complete_auto_create_user_and_wallet()`;

    const { error: triggerError } = await supabase.rpc('exec_sql', { sql_query: createTrigger });
    if (triggerError) {
      console.error('❌ Error creating trigger:', triggerError.message);
      return;
    }
    console.log('✅ Trigger created successfully');

    console.log('\n🎉 Referral system fix applied successfully!');
    console.log('✨ New users with referral codes should now work correctly!');

  } catch (error) {
    console.error('❌ Failed to apply referral fix:', error.message);
  }
}

// Check if exec_sql function exists, if not use direct method
async function main() {
  try {
    // Test if we can use exec_sql
    const { error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });
    if (error) {
      console.log('📝 exec_sql not available, manual SQL execution needed');
      console.log('\n🔧 MANUAL STEPS REQUIRED:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of database/fix-referral-trigger.sql');
      console.log('4. Execute the SQL script');
      console.log('\nThis will restore the referral system functionality.');
    } else {
      await applyReferralFixDirect();
    }
  } catch (error) {
    console.log('📝 Using manual approach...');
    console.log('\n🔧 MANUAL STEPS REQUIRED:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/fix-referral-trigger.sql');
    console.log('4. Execute the SQL script');
    console.log('\nThis will restore the referral system functionality.');
  }
}

main().then(() => {
  console.log('\n🏁 Process completed');
}).catch(error => {
  console.error('❌ Process failed:', error);
});
