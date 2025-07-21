// Enhanced Dice Game Screen for Adola App - Exact Original Implementation
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import { useApp } from '../../../contexts/AppContext';
import { useWallet } from '../../../contexts/WalletContext';
import GameLogicService from '../../../services/gameLogicService';
import { NewWalletService } from '../../../services/newWalletService';

export default function DiceScreen() {
  const router = useRouter();
  const { user } = useApp();
  const { balance, canPlaceBet, applyGameResult } = useWallet();
  const [betAmount, setBetAmount] = React.useState(10);
  const [selectedNumber, setSelectedNumber] = React.useState(3);
  const [gameActive, setGameActive] = React.useState(false);
  const [diceResult, setDiceResult] = React.useState(1);

  const rollDice = (amount: number, number: number) => {
    // Check if user can place bet using new wallet system
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough coins to place this bet.');
      return;
    }

    setGameActive(true);
    setBetAmount(amount);
    setSelectedNumber(number);

    // Simulate dice roll
    setTimeout(async () => {
      const gameResult = GameLogicService.calculateGameResult(amount, balance, 'dice');

      // Set dice result based on game outcome
      if (gameResult.won) {
        setDiceResult(number); // Player wins if dice matches their number
      } else {
        // Pick a different number for loss
        let lossNumber = Math.floor(Math.random() * 6) + 1;
        while (lossNumber === number) {
          lossNumber = Math.floor(Math.random() * 6) + 1;
        }
        setDiceResult(lossNumber);
      }

      // Apply game result using NewWalletService directly
      const walletResult = await NewWalletService.applyGameResult(
        user?.id || '',
        gameResult.won ? gameResult.amount : amount,
        gameResult.won,
        'dice',
        `Dice game ${gameResult.won ? 'win' : 'loss'} - rolled ${gameResult.won ? number : diceResult}`
      );

      if (walletResult.success) {
        console.log('🎮 Dice game result applied successfully');
      } else {
        console.error('❌ Failed to apply dice game result:', walletResult.error);
      }

      setGameActive(false);

      Alert.alert(
        gameResult.won ? '🎉 WINNER!' : '😔 Better luck next time!',
        `Dice rolled: ${gameResult.won ? number : diceResult}\n${gameResult.message}`,
        [{ text: gameResult.won ? 'AMAZING!' : 'Try Again' }]
      );
    }, 2000);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎲 Dice</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Text style={styles.headerButtonText}>Leave</Text>
        </TouchableOpacity>
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        <Text style={styles.diceDisplay}>{gameActive ? '🎲' : diceResult}</Text>
        <Text style={styles.balanceText}>Balance: {balance} coins</Text>

        {/* Number Selection */}
        <View style={styles.numberGrid}>
          {[1, 2, 3, 4, 5, 6].map(num => (
            <TouchableOpacity
              key={num}
              style={[styles.numberButton, selectedNumber === num && styles.selectedNumber]}
              onPress={() => setSelectedNumber(num)}
              disabled={gameActive}
            >
              <Text style={styles.numberText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bet Buttons */}
        <View style={styles.betButtons}>
          {[10, 25, 50, 100].map(amount => (
            <TouchableOpacity
              key={amount}
              style={styles.betButton}
              onPress={() => rollDice(amount, selectedNumber)}
              disabled={gameActive || amount > balance}
            >
              <Text style={styles.betButtonText}>Bet {amount}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerButton: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  headerButtonText: {
    color: Colors.primary.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
  gameArea: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  diceDisplay: {
    fontSize: 80,
    marginVertical: 30,
  },
  balanceText: {
    fontSize: 18,
    color: Colors.primary.text,
    marginBottom: 30,
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 30,
  },
  numberButton: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primary.surface,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderWidth: 2,
    borderColor: Colors.primary.border,
  },
  selectedNumber: {
    backgroundColor: Colors.primary.gold,
    borderColor: Colors.primary.gold,
  },
  numberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  betButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  betButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 5,
  },
  betButtonText: {
    color: Colors.primary.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
