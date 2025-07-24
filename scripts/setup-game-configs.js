#!/usr/bin/env node

/**
 * Setup Game Configs Table
 * This script creates the game_configs table and populates it with default values
 * Run this script to enable admin win rate management functionality
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'https://mvgxptxzzjpyyugqnsrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12Z3hwdHh6emp5eXl1Z3Fuc3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI4NzQsImV4cCI6MjA1MDU0ODg3NH0.YJJhzJhZJhZJhZJhZJhZJhZJhZJhZJhZJhZJhZJhZJhZ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupGameConfigsTable() {
  console.log('🚀 Setting up game_configs table...');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'add-game-configs-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }

    // Verify the table was created by checking if we can query it
    console.log('🔍 Verifying table creation...');
    const { data, error } = await supabase
      .from('game_configs')
      .select('game_type, game_name, base_win_probability')
      .limit(5);

    if (error) {
      console.error('❌ Error verifying table:', error);
      console.log('💡 You may need to run the SQL manually in Supabase dashboard');
    } else {
      console.log('✅ Table verification successful!');
      console.log('📊 Sample game configs:');
      data.forEach(config => {
        console.log(`   - ${config.game_name}: ${(config.base_win_probability * 100).toFixed(1)}% win rate`);
      });
    }

    console.log('\n🎉 Game configs table setup complete!');
    console.log('🎮 Admin panel win rate management should now work properly.');

  } catch (error) {
    console.error('❌ Error setting up game configs table:', error);
    console.log('\n💡 Manual setup instructions:');
    console.log('1. Go to Supabase dashboard > SQL Editor');
    console.log('2. Copy and paste the contents of database/add-game-configs-table.sql');
    console.log('3. Execute the SQL script');
  }
}

// Run the setup
setupGameConfigsTable();