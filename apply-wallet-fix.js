// Script to apply the wallet creation fix to the database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://mvgxptxzzjpyyugqnsrd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12Z3hwdHh6emp5eXVncW5zcmQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0NzE5MSwiZXhwIjoyMDUwMTIzMTkxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyWalletFix() {
  console.log('🔧 Applying wallet creation trigger fix...\n');

  try {
    // Read the SQL fix file
    const sqlFilePath = path.join(__dirname, 'database', 'fix-wallet-creation-trigger.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      return;
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 SQL fix file loaded');
    console.log('📝 This will fix the wallet creation trigger...\n');

    console.log('🔧 MANUAL STEPS REQUIRED:');
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to your project: mvgxptxzzjpyyugqnsrd');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the contents of database/fix-wallet-creation-trigger.sql');
    console.log('5. Execute the SQL script');
    console.log('\n📋 What this will fix:');
    console.log('   ✅ Ensures wallets are created for ALL new users');
    console.log('   ✅ Maintains referral system functionality');
    console.log('   ✅ Creates welcome bonus transactions');
    console.log('   ✅ Bulletproof error handling');
    console.log('   ✅ Proper logging for debugging');

    console.log('\n🧪 After applying the fix, test by:');
    console.log('   1. Creating a new user account');
    console.log('   2. Checking that a wallet record is created');
    console.log('   3. Verifying the welcome bonus is applied');
    console.log('   4. Testing deposit approval (should work without errors)');

    console.log('\n📊 You can verify the fix worked by checking:');
    console.log('   - New users have records in both users AND wallets tables');
    console.log('   - Wallet balance matches welcome bonus (50 PKR)');
    console.log('   - Welcome bonus transaction is created');
    console.log('   - Referral system still works for referred users');

  } catch (error) {
    console.error('❌ Failed to read wallet fix file:', error.message);
  }
}

// Also create a function to check existing users without wallets
async function checkUsersWithoutWallets() {
  console.log('\n🔍 Checking for users without wallets...');

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('auth_user_id, email, username');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`📊 Found ${users.length} total users`);

    // Get all wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('user_id');

    if (walletsError) {
      console.error('❌ Error fetching wallets:', walletsError);
      return;
    }

    console.log(`📊 Found ${wallets.length} total wallets`);

    // Find users without wallets
    const walletUserIds = new Set(wallets.map(w => w.user_id));
    const usersWithoutWallets = users.filter(u => !walletUserIds.has(u.auth_user_id));

    if (usersWithoutWallets.length > 0) {
      console.log(`\n⚠️  Found ${usersWithoutWallets.length} users WITHOUT wallets:`);
      usersWithoutWallets.forEach(user => {
        console.log(`   - ${user.email} (${user.username}) - ID: ${user.auth_user_id}`);
      });

      console.log('\n🔧 These users will get wallets automatically when:');
      console.log('   1. They make a deposit (auto-creation in approval process)');
      console.log('   2. The new trigger is applied and they perform any action');
      console.log('   3. You manually create wallets for them');
    } else {
      console.log('\n✅ All users have wallets!');
    }

  } catch (error) {
    console.error('❌ Error checking users/wallets:', error);
  }
}

// Run both functions
async function main() {
  await applyWalletFix();
  await checkUsersWithoutWallets();
}

main().then(() => {
  console.log('\n🏁 Analysis completed');
}).catch(error => {
  console.error('❌ Analysis failed:', error);
});
