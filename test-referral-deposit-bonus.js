// Test script to verify the referral deposit bonus system
// This tests that when a referred user makes a deposit, the referrer gets 5% bonus

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://mvgxptxzzjpyyugqnsrd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12Z3hwdHh6emp5eXVncW5zcmQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0NzE5MSwiZXhwIjoyMDUwMTIzMTkxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferralDepositBonus() {
  console.log('🧪 Testing Referral Deposit Bonus System...\n');

  try {
    // Step 1: Create a referrer user
    console.log('1️⃣ Creating referrer user...');
    const referrerEmail = `referrer_${Date.now()}@test.com`;
    const referrerPassword = 'TestPassword123!';
    const referrerUsername = `referrer_${Date.now()}`;

    const { data: referrerAuth, error: referrerError } = await supabase.auth.signUp({
      email: referrerEmail,
      password: referrerPassword,
      options: {
        data: {
          username: referrerUsername,
          display_name: referrerUsername
        }
      }
    });

    if (referrerError) {
      console.error('❌ Failed to create referrer:', referrerError.message);
      return;
    }

    console.log('✅ Referrer created:', referrerAuth.user.id);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get referrer's referral code and initial balance
    const { data: referrerData, error: referrerFetchError } = await supabase
      .from('users')
      .select('referral_code')
      .eq('auth_user_id', referrerAuth.user.id)
      .single();

    if (referrerFetchError || !referrerData) {
      console.error('❌ Failed to fetch referrer data:', referrerFetchError);
      return;
    }

    const { data: referrerWallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance, referral_earnings')
      .eq('user_id', referrerAuth.user.id)
      .single();

    if (walletError) {
      console.error('❌ Failed to fetch referrer wallet:', walletError);
      return;
    }

    console.log('✅ Referrer referral code:', referrerData.referral_code);
    console.log('✅ Referrer initial balance:', referrerWallet.balance);
    console.log('✅ Referrer initial referral earnings:', referrerWallet.referral_earnings);

    // Step 2: Create a referred user with the referral code
    console.log('\n2️⃣ Creating referred user with referral code...');
    const referredEmail = `referred_${Date.now()}@test.com`;
    const referredPassword = 'TestPassword123!';
    const referredUsername = `referred_${Date.now()}`;

    const { data: referredAuth, error: referredError } = await supabase.auth.signUp({
      email: referredEmail,
      password: referredPassword,
      options: {
        data: {
          username: referredUsername,
          display_name: referredUsername,
          referral_code: referrerData.referral_code
        }
      }
    });

    if (referredError) {
      console.error('❌ Failed to create referred user:', referredError.message);
      return;
    }

    console.log('✅ Referred user created:', referredAuth.user.id);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify referral relationship was established
    const { data: referredData, error: referredFetchError } = await supabase
      .from('users')
      .select('referred_by_user_id, username')
      .eq('auth_user_id', referredAuth.user.id)
      .single();

    if (referredFetchError || !referredData || !referredData.referred_by_user_id) {
      console.error('❌ Referral relationship not established properly');
      return;
    }

    console.log('✅ Referral relationship confirmed');

    // Step 3: Create a deposit request for the referred user
    console.log('\n3️⃣ Creating deposit request for referred user...');
    const depositAmount = 1000; // PKR 1000

    const { data: depositData, error: depositError } = await supabase
      .from('deposit_requests')
      .insert({
        user_id: referredAuth.user.id,
        amount: depositAmount,
        bank_account_id: 'zarbonics',
        transaction_id: `TEST_${Date.now()}`,
        status: 'pending',
        metadata: { test: true }
      })
      .select()
      .single();

    if (depositError) {
      console.error('❌ Failed to create deposit request:', depositError);
      return;
    }

    console.log('✅ Deposit request created:', depositData.id);

    // Step 4: Simulate admin approval (this should trigger referral bonus)
    console.log('\n4️⃣ Simulating admin approval...');
    
    // We'll simulate the approval process by calling the NewAdminService function
    // Note: In a real test, you'd need proper admin authentication
    console.log('📝 Manual approval required in production');
    console.log('   - Go to admin panel');
    console.log('   - Approve the deposit request');
    console.log('   - This should trigger both:');
    console.log('     * 5% deposit bonus for the referred user');
    console.log('     * 5% referral bonus for the referrer');

    // Step 5: Instructions for manual verification
    console.log('\n5️⃣ Manual Verification Steps:');
    console.log('After approving the deposit in admin panel, check:');
    console.log(`   - Referred user (${referredUsername}) should receive:`);
    console.log(`     * PKR ${depositAmount} deposit`);
    console.log(`     * PKR ${Math.floor(depositAmount * 0.05)} (5%) deposit bonus`);
    console.log(`     * Total: PKR ${depositAmount + Math.floor(depositAmount * 0.05)}`);
    console.log(`   - Referrer (${referrerUsername}) should receive:`);
    console.log(`     * PKR ${Math.floor(depositAmount * 0.05)} (5%) referral bonus`);
    console.log(`     * Updated referral_earnings in wallet`);

    // Provide query to check results
    console.log('\n📊 Database Queries to Verify:');
    console.log('-- Check referred user wallet:');
    console.log(`SELECT balance FROM wallets WHERE user_id = '${referredAuth.user.id}';`);
    console.log('-- Check referrer wallet:');
    console.log(`SELECT balance, referral_earnings FROM wallets WHERE user_id = '${referrerAuth.user.id}';`);
    console.log('-- Check referral bonus transaction:');
    console.log(`SELECT * FROM wallet_transactions WHERE user_id = '${referrerAuth.user.id}' AND type = 'referral_deposit_bonus';`);

    console.log('\n✅ Test setup completed successfully!');
    console.log('🔧 Now approve the deposit in the admin panel to test the referral bonus system.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testReferralDepositBonus().then(() => {
  console.log('\n🏁 Test setup completed');
}).catch(error => {
  console.error('❌ Test setup failed:', error);
});
