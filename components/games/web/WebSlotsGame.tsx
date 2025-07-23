// Web-specific Slots Game - Vertically Scrollable Layout
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useApp } from '../../../contexts/AppContext';
import { useWallet } from '../../../contexts/WalletContext';
import BettingPanel from '../../BettingPanel';

const { width } = Dimensions.get('window');

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];
const REELS = 3;

export default function WebSlotsGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [lastResult, setLastResult] = useState<any>(null);
  
  // Animation refs for each reel
  const reel1Anim = useRef(new Animated.Value(0)).current;
  const reel2Anim = useRef(new Animated.Value(0)).current;
  const reel3Anim = useRef(new Animated.Value(0)).current;

  const getRandomSymbol = () => {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  };

  const calculateWin = (symbols: string[], betAmount: number) => {
    // Three of a kind
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
      switch (symbols[0]) {
        case '7️⃣': return betAmount * 50; // Jackpot
        case '💎': return betAmount * 25;
        case '⭐': return betAmount * 15;
        case '🔔': return betAmount * 10;
        case '🍇': return betAmount * 8;
        case '🍊': return betAmount * 6;
        case '🍋': return betAmount * 4;
        case '🍒': return betAmount * 3;
        default: return betAmount * 2;
      }
    }
    
    // Two cherries
    if (symbols.filter(s => s === '🍒').length === 2) {
      return betAmount * 2;
    }
    
    return 0;
  };

  const getPaytable = () => {
    return [
      { symbols: '7️⃣ 7️⃣ 7️⃣', multiplier: '50x' },
      { symbols: '💎 💎 💎', multiplier: '25x' },
      { symbols: '⭐ ⭐ ⭐', multiplier: '15x' },
      { symbols: '🔔 🔔 🔔', multiplier: '10x' },
      { symbols: '🍇 🍇 🍇', multiplier: '8x' },
      { symbols: '🍊 🍊 🍊', multiplier: '6x' },
      { symbols: '🍋 🍋 🍋', multiplier: '4x' },
      { symbols: '🍒 🍒 🍒', multiplier: '3x' },
      { symbols: '🍒 🍒 *', multiplier: '2x' },
    ];
  };

  // Generate result based on 20% win rate
  const generateSlotsResult = (shouldWin: boolean, betAmount: number) => {
    if (shouldWin) {
      // Player should win - generate winning combination
      const winningSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      return [winningSymbol, winningSymbol, winningSymbol];
    } else {
      // Player should lose - generate non-matching combination
      let symbols: string[];
      do {
        symbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
      } while (calculateWin(symbols, betAmount) > 0); // Ensure no win

      return symbols;
    }
  };

  const spinReels = async (betAmount: number) => {
    if (isSpinning) return;

    if (!canPlaceBet(betAmount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    // Step 1: Deduct bet amount immediately
    const betPlaced = await placeBet(betAmount, 'slots', 'Slots game bet placed');
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      return;
    }

    // Force balance refresh to ensure UI updates
    setTimeout(() => refreshBalance(), 500);

    setIsSpinning(true);
    setLastResult(null);

    // Determine win/loss (20% win rate)
    const shouldWin = Math.random() < 0.2;
    const finalSymbols = generateSlotsResult(shouldWin, betAmount);

    // Animate reels
    const animateReel = (animValue: Animated.Value, duration: number) => {
      return Animated.timing(animValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      });
    };

    // Start all reel animations
    Animated.stagger(200, [
      animateReel(reel1Anim, 1000),
      animateReel(reel2Anim, 1200),
      animateReel(reel3Anim, 1400),
    ]).start(() => {
      // Reset animations
      reel1Anim.setValue(0);
      reel2Anim.setValue(0);
      reel3Anim.setValue(0);
      
      // Set final result
      setReels(finalSymbols);
      
      // Process result after a short delay
      setTimeout(() => {
        processSpinResult(finalSymbols, betAmount);
      }, 500);
    });

    // Show spinning symbols during animation
    const spinInterval = setInterval(() => {
      setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
    }, 100);

    setTimeout(() => {
      clearInterval(spinInterval);
    }, 1400);
  };

  const processSpinResult = async (symbols: string[], betAmount: number) => {
    const winAmount = calculateWin(symbols, betAmount);
    const isWin = winAmount > 0;

    // Step 2: Add winnings if player won
    if (isWin && winAmount > 0) {
      await addWinnings(
        winAmount,
        'slots',
        `Slots game win - ${symbols.join(' ')}`
      );

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
    }

    setLastResult({ symbols, winAmount, isWin, betAmount });
    setIsSpinning(false);

    if (isWin) {
      const multiplier = winAmount / betAmount;
      Alert.alert(
        'You Won!',
        `${symbols.join(' ')} - ${multiplier}x\nYou won PKR ${winAmount}!`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'No Win',
        `${symbols.join(' ')}\nBetter luck next time!`,
        [{ text: 'OK' }]
      );
    }
  };

  const getReelRotation = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Game Title */}
      <View style={styles.section}>
        <Text style={styles.gameTitle}>🎰 Classic Slots</Text>
        <Text style={styles.gameSubtitle}>Match symbols to win big!</Text>
      </View>

      {/* Balance Display */}
      <View style={styles.section}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceAmount}>PKR {balance?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* Slot Machine */}
      <View style={styles.section}>
        <View style={styles.slotMachine}>
          <View style={styles.reelsContainer}>
            {reels.map((symbol, index) => {
              const animValue = index === 0 ? reel1Anim : index === 1 ? reel2Anim : reel3Anim;
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.reel,
                    {
                      transform: [{ rotate: getReelRotation(animValue) }],
                    },
                  ]}
                >
                  <Text style={styles.symbol}>{symbol}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Last Result */}
      {lastResult && (
        <View style={styles.section}>
          <View style={[styles.resultCard, lastResult.isWin ? styles.winCard : styles.loseCard]}>
            <Text style={styles.resultTitle}>
              {lastResult.isWin ? '🎉 You Won!' : '😔 No Win'}
            </Text>
            <Text style={styles.resultSymbols}>
              {lastResult.symbols.join(' ')}
            </Text>
            {lastResult.isWin && (
              <Text style={styles.resultAmount}>
                PKR {lastResult.winAmount.toLocaleString()}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Paytable */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paytable</Text>
        <View style={styles.paytableCard}>
          {getPaytable().slice(0, 5).map((entry, index) => (
            <View key={index} style={styles.paytableRow}>
              <Text style={styles.paytableSymbols}>{entry.symbols}</Text>
              <Text style={styles.paytableMultiplier}>{entry.multiplier}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Betting Panel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Place Your Bet</Text>
        <BettingPanel
          balance={balance}
          minBet={10}
          maxBet={balance || 1000}
          onBet={spinReels}
          disabled={isSpinning}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 15,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    textAlign: 'center',
    marginBottom: 5,
  },
  gameSubtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
  slotMachine: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary.gold,
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 300,
  },
  reel: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primary.background,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary.border,
  },
  symbol: {
    fontSize: 40,
    textAlign: 'center',
  },
  resultCard: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
  },
  winCard: {
    backgroundColor: Colors.success.background,
    borderColor: Colors.success.border,
  },
  loseCard: {
    backgroundColor: Colors.primary.surface,
    borderColor: Colors.primary.border,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 10,
  },
  resultSymbols: {
    fontSize: 24,
    marginBottom: 10,
  },
  resultAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.success.text,
  },
  paytableCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  paytableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  paytableSymbols: {
    fontSize: 16,
    color: Colors.primary.text,
  },
  paytableMultiplier: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
});
