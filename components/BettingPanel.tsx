import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../contexts/WalletContext';

interface BettingPanelProps {
  balance: number | undefined;
  minBet: number;
  maxBet: number;
  onBet: (amount: number) => void;
  disabled?: boolean;
}

export default function BettingPanel({ balance, minBet, maxBet, onBet, disabled = false }: BettingPanelProps) {
  const { canPlaceBet } = useWallet();
  const [betAmount, setBetAmount] = useState('10');

  // Standardized quick bet amounts for all games
  const quickBets = [10, 100];

  const handleBetChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue <= maxBet) {
      setBetAmount(value);
    }
  };

  const handleQuickBet = (amount: number) => {
    setBetAmount(amount.toString());
  };

  const handleClearBet = () => {
    setBetAmount('10');
  };

  const handleMaxBet = () => {
    // Use current wallet balance as max bet, but respect game's max limit
    const walletBalance = balance || 0;
    const maxAllowedBet = Math.min(walletBalance, maxBet);
    setBetAmount(maxAllowedBet.toString());
  };

  const handleBet = async () => {
    const amount = parseFloat(betAmount) || 0;

    // Validate bet amount
    if (amount < 10) {
      Alert.alert('Invalid Bet', 'Minimum bet is Rs 10');
      return;
    }

    if (amount > maxBet) {
      Alert.alert('Invalid Bet', `Maximum bet is Rs ${maxBet}`);
      return;
    }

    // Check wallet balance using new system
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough coins to place this bet.');
      return;
    }

    onBet(amount);
  };

  const canBetLocal = () => {
    const amount = parseFloat(betAmount) || 0;
    return amount >= minBet && amount <= maxBet && canPlaceBet(amount) && !disabled;
  };

  return (
    <View style={styles.container}>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Balance:</Text>
        <Text style={styles.balanceAmount}>Rs {(balance || 0).toLocaleString()}</Text>
      </View>

      <View style={styles.betContainer}>
        <Text style={styles.betLabel}>Bet Amount:</Text>
        <View style={styles.betInputContainer}>
          <Text style={styles.currencySign}>Rs</Text>
          <TextInput
            style={styles.betInput}
            value={betAmount}
            onChangeText={handleBetChange}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <View style={styles.quickBetsContainer}>
        <Text style={styles.quickBetsLabel}>Quick Bets:</Text>
        <View style={styles.quickBetsRow}>
          {quickBets.map((amount, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickBetButton}
              onPress={() => handleQuickBet(amount)}
            >
              <Text style={styles.quickBetText}>Rs {amount.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.quickBetButton, styles.maxButton]}
            onPress={handleMaxBet}
          >
            <Text style={[styles.quickBetText, styles.maxButtonText]}>Max</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBetButton, styles.clearButton]}
            onPress={handleClearBet}
          >
            <Text style={[styles.quickBetText, styles.clearButtonText]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.betButton, { opacity: canBetLocal() ? 1 : 0.5 }]}
        onPress={handleBet}
        disabled={!canBetLocal()}
      >
        <Ionicons name="play" size={20} color="#ffffff" />
        <Text style={styles.betButtonText}>Place Bet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#cccccc',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ff00',
  },
  betContainer: {
    marginBottom: 16,
  },
  betLabel: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 8,
  },
  betInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  currencySign: {
    fontSize: 14,
    color: '#ffffff',
    marginRight: 4,
  },
  betInput: {
    flex: 1,
    fontSize: 18,
    color: '#ffffff',
    paddingVertical: 12,
  },
  quickBetsContainer: {
    marginBottom: 16,
  },
  quickBetsLabel: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 8,
  },
  quickBetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickBetButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  quickBetText: {
    color: '#ffffff',
    fontSize: 14,
  },
  maxButton: {
    backgroundColor: '#00aa00',
    borderColor: '#00cc00',
  },
  maxButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#ff4444',
    borderColor: '#ff6666',
  },
  clearButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  betButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  betButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
