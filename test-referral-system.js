// Test script to verify the referral system is working correctly
// Run this with: node test-referral-system.js

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://mvgxptxzzjpyyugqnsrd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12Z3hwdHh6emp5eXVncW5zcmQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0NzE5MSwiZXhwIjoyMDUwMTIzMTkxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferralSystem() {
  console.log('🧪 Testing Referral System...\n');

  try {
    // Step 1: Create a referrer user first
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

    // Wait for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get referrer's referral code
    const { data: referrerData, error: referrerFetchError } = await supabase
      .from('users')
      .select('referral_code, total_referrals')
      .eq('auth_user_id', referrerAuth.user.id)
      .single();

    if (referrerFetchError || !referrerData) {
      console.error('❌ Failed to fetch referrer data:', referrerFetchError);
      return;
    }

    console.log('✅ Referrer referral code:', referrerData.referral_code);
    console.log('✅ Referrer initial referrals:', referrerData.total_referrals);

    // Get referrer's initial wallet balance
    const { data: referrerWallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance, referral_earnings')
      .eq('user_id', referrerAuth.user.id)
      .single();

    if (walletError) {
      console.error('❌ Failed to fetch referrer wallet:', walletError);
      return;
    }

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
          referral_code: referrerData.referral_code // Using referrer's code
        }
      }
    });

    if (referredError) {
      console.error('❌ Failed to create referred user:', referredError.message);
      return;
    }

    console.log('✅ Referred user created:', referredAuth.user.id);

    // Wait for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Check if referral was processed correctly
    console.log('\n3️⃣ Checking referral processing...');

    // Check referred user data
    const { data: referredData, error: referredFetchError } = await supabase
      .from('users')
      .select('referred_by_code, referred_by_user_id, referral_bonus_received')
      .eq('auth_user_id', referredAuth.user.id)
      .single();

    if (referredFetchError) {
      console.error('❌ Failed to fetch referred user data:', referredFetchError);
      return;
    }

    console.log('✅ Referred user data:');
    console.log('   - referred_by_code:', referredData.referred_by_code);
    console.log('   - referred_by_user_id:', referredData.referred_by_user_id);
    console.log('   - referral_bonus_received:', referredData.referral_bonus_received);

    // Check referrer's updated data
    const { data: updatedReferrerData, error: updatedReferrerError } = await supabase
      .from('users')
      .select('total_referrals, referral_bonus_given')
      .eq('auth_user_id', referrerAuth.user.id)
      .single();

    if (updatedReferrerError) {
      console.error('❌ Failed to fetch updated referrer data:', updatedReferrerError);
      return;
    }

    console.log('✅ Updated referrer data:');
    console.log('   - total_referrals:', updatedReferrerData.total_referrals);
    console.log('   - referral_bonus_given:', updatedReferrerData.referral_bonus_given);

    // Check referrer's updated wallet
    const { data: updatedReferrerWallet, error: updatedWalletError } = await supabase
      .from('wallets')
      .select('balance, referral_earnings')
      .eq('user_id', referrerAuth.user.id)
      .single();

    if (updatedWalletError) {
      console.error('❌ Failed to fetch updated referrer wallet:', updatedWalletError);
      return;
    }

    console.log('✅ Updated referrer wallet:');
    console.log('   - balance:', updatedReferrerWallet.balance);
    console.log('   - referral_earnings:', updatedReferrerWallet.referral_earnings);

    // Check referrals table
    const { data: referralRecord, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', referrerAuth.user.id)
      .eq('referred_user_id', referredAuth.user.id)
      .single();

    if (referralError) {
      console.error('❌ Failed to fetch referral record:', referralError);
    } else {
      console.log('✅ Referral record created:');
      console.log('   - bonus_amount:', referralRecord.bonus_amount);
      console.log('   - bonus_paid:', referralRecord.bonus_paid);
      console.log('   - created_at:', referralRecord.created_at);
    }

    // Step 4: Verify results
    console.log('\n4️⃣ Test Results:');
    
    const referralWorking = 
      referredData.referred_by_code === referrerData.referral_code &&
      referredData.referred_by_user_id === referrerAuth.user.id &&
      updatedReferrerData.total_referrals > referrerData.total_referrals &&
      updatedReferrerWallet.balance > referrerWallet.balance &&
      referralRecord && referralRecord.bonus_paid;

    if (referralWorking) {
      console.log('🎉 REFERRAL SYSTEM IS WORKING CORRECTLY!');
    } else {
      console.log('❌ REFERRAL SYSTEM HAS ISSUES:');
      console.log('   - Referral code match:', referredData.referred_by_code === referrerData.referral_code);
      console.log('   - Referrer ID match:', referredData.referred_by_user_id === referrerAuth.user.id);
      console.log('   - Referral count increased:', updatedReferrerData.total_referrals > referrerData.total_referrals);
      console.log('   - Referrer balance increased:', updatedReferrerWallet.balance > referrerWallet.balance);
      console.log('   - Referral record exists:', !!referralRecord);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testReferralSystem().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
