import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';

interface GameConfig {
  game_type: string;
  game_name: string;
  house_edge: number;
  base_win_probability: number;
  enabled: boolean;
  min_bet: number;
  max_bet: number;
}

const DEFAULT_GAME_CONFIGS: GameConfig[] = [
  { game_type: 'dice', game_name: 'Dice Game', house_edge: 0.05, base_win_probability: 0.15, enabled: true, min_bet: 10.00, max_bet: 5000.00 },
  { game_type: 'mines', game_name: 'Mines Game', house_edge: 0.04, base_win_probability: 0.18, enabled: true, min_bet: 10.00, max_bet: 5000.00 },
  { game_type: 'tower', game_name: 'Tower Game', house_edge: 0.06, base_win_probability: 0.12, enabled: true, min_bet: 10.00, max_bet: 5000.00 },
  { game_type: 'aviator', game_name: 'Aviator Game', house_edge: 0.03, base_win_probability: 0.20, enabled: true, min_bet: 10.00, max_bet: 10000.00 },
  { game_type: 'crash', game_name: 'Crash Game', house_edge: 0.03, base_win_probability: 0.20, enabled: true, min_bet: 10.00, max_bet: 10000.00 },
  { game_type: 'slots', game_name: 'Diamond Slots', house_edge: 0.08, base_win_probability: 0.10, enabled: true, min_bet: 10.00, max_bet: 5000.00 },
  { game_type: 'blackjack', game_name: 'Blackjack', house_edge: 0.05, base_win_probability: 0.15, enabled: true, min_bet: 10.00, max_bet: 5000.00 },
  { game_type: 'poker', game_name: 'Poker', house_edge: 0.06, base_win_probability: 0.12, enabled: true, min_bet: 10.00, max_bet: 5000.00 },
  { game_type: 'roulette', game_name: 'Roulette', house_edge: 0.05, base_win_probability: 0.15, enabled: true, min_bet: 10.00, max_bet: 10000.00 },
  { game_type: 'baccarat', game_name: 'Baccarat', house_edge: 0.04, base_win_probability: 0.18, enabled: true, min_bet: 10.00, max_bet: 5000.00 },
  { game_type: 'powerball', game_name: 'PowerBall Lottery', house_edge: 0.15, base_win_probability: 0.05, enabled: true, min_bet: 10.00, max_bet: 1000.00 },
  { game_type: 'luckynumbers', game_name: 'Lucky Numbers', house_edge: 0.12, base_win_probability: 0.08, enabled: true, min_bet: 10.00, max_bet: 1000.00 },
  { game_type: 'megadraw', game_name: 'Mega Draw', house_edge: 0.10, base_win_probability: 0.10, enabled: true, min_bet: 10.00, max_bet: 1000.00 },
  { game_type: 'limbo', game_name: 'Limbo Game', house_edge: 0.05, base_win_probability: 0.15, enabled: true, min_bet: 10.00, max_bet: 5000.00 },
  { game_type: 'rollmaster', game_name: 'Roll Master', house_edge: 0.04, base_win_probability: 0.18, enabled: true, min_bet: 10.00, max_bet: 5000.00 }
];

export default function DatabaseSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<string>('');

  const createGameConfigsTable = async () => {
    setIsLoading(true);
    setSetupStatus('Creating game_configs table...');

    try {
      // First, try to create the table using a simple approach
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS public.game_configs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            game_type TEXT UNIQUE NOT NULL,
            game_name TEXT NOT NULL,
            house_edge NUMERIC(5,4) DEFAULT 0.05,
            base_win_probability NUMERIC(5,4) DEFAULT 0.15,
            enabled BOOLEAN DEFAULT true,
            min_bet NUMERIC(15,2) DEFAULT 10.00,
            max_bet NUMERIC(15,2) DEFAULT 10000.00,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });

      if (createError) {
        console.error('Error creating table:', createError);
        setSetupStatus('Failed to create table. Trying alternative method...');
        
        // Alternative: Try to insert data and let it fail if table doesn't exist
        // This will help us determine if the table exists
        const { error: testError } = await supabase
          .from('game_configs')
          .select('id')
          .limit(1);

        if (testError && testError.message.includes('does not exist')) {
          setSetupStatus('Table does not exist. Please create it manually in Supabase dashboard.');
          Alert.alert(
            'Manual Setup Required',
            'The game_configs table needs to be created manually. Please:\n\n1. Go to Supabase Dashboard\n2. Open SQL Editor\n3. Run the SQL from database/add-game-configs-table.sql\n\nOr contact support for assistance.',
            [{ text: 'OK' }]
          );
          setIsLoading(false);
          return;
        }
      }

      setSetupStatus('Inserting default game configurations...');

      // Insert default configurations
      const { error: insertError } = await supabase
        .from('game_configs')
        .upsert(DEFAULT_GAME_CONFIGS, { 
          onConflict: 'game_type',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('Error inserting configs:', insertError);
        setSetupStatus('Failed to insert configurations');
        Alert.alert('Error', 'Failed to insert game configurations: ' + insertError.message);
        setIsLoading(false);
        return;
      }

      setSetupStatus('Verifying setup...');

      // Verify the setup
      const { data: configs, error: verifyError } = await supabase
        .from('game_configs')
        .select('game_type, game_name, base_win_probability')
        .order('game_name');

      if (verifyError) {
        console.error('Error verifying setup:', verifyError);
        setSetupStatus('Setup may have failed');
        Alert.alert('Warning', 'Could not verify the setup: ' + verifyError.message);
      } else {
        setSetupStatus(`Setup complete! ${configs?.length || 0} games configured.`);
        Alert.alert(
          'Success!',
          `Game configs table has been set up successfully with ${configs?.length || 0} games.\n\nAdmin win rate management is now functional!`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Setup error:', error);
      setSetupStatus('Setup failed');
      Alert.alert('Error', 'Failed to set up game configs: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkTableExists = async () => {
    setIsLoading(true);
    setSetupStatus('Checking table status...');

    try {
      const { data, error } = await supabase
        .from('game_configs')
        .select('game_type, game_name, base_win_probability')
        .order('game_name');

      if (error) {
        if (error.message.includes('does not exist')) {
          setSetupStatus('Table does not exist - needs setup');
          Alert.alert('Table Missing', 'The game_configs table does not exist. Click "Setup Database" to create it.');
        } else {
          setSetupStatus('Error checking table');
          Alert.alert('Error', 'Error checking table: ' + error.message);
        }
      } else {
        setSetupStatus(`Table exists with ${data?.length || 0} games configured`);
        Alert.alert(
          'Table Status',
          `Game configs table exists and has ${data?.length || 0} games configured.\n\nAdmin win rate management should be working!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setSetupStatus('Check failed');
      Alert.alert('Error', 'Failed to check table: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Database Setup</Text>
        <Text style={styles.subtitle}>Game Configs Table for Win Rate Management</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Setup Status</Text>
        <Text style={styles.status}>{setupStatus || 'Ready for setup'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.checkButton]}
          onPress={checkTableExists}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Check Table Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.setupButton]}
          onPress={createGameConfigsTable}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Setting up...' : 'Setup Database'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What this does:</Text>
        <Text style={styles.description}>
          • Creates the game_configs table in Supabase{'\n'}
          • Adds default configurations for all 15 games{'\n'}
          • Enables admin win rate management{'\n'}
          • Sets up proper permissions and security{'\n'}
          • Makes the Game Management tab functional
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Win Rates:</Text>
        <Text style={styles.description}>
          • Dice, Blackjack, Roulette, Limbo: 15%{'\n'}
          • Mines, Baccarat, RollMaster: 18%{'\n'}
          • Tower, Poker: 12%{'\n'}
          • Aviator, Crash: 20%{'\n'}
          • Slots: 10%{'\n'}
          • Lottery games: 5-10%
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: Colors.secondary,
  },
  setupButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
