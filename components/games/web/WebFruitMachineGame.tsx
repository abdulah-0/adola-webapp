// Web-specific Fruit Machine Game - Vertically Scrollable Layout
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

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🍉', '🍓', '🥝', '🍍'];
const REELS = 3;

export default function WebFruitMachineGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [lastResult, setLastResult] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  
  // Animation refs for each reel
  const reel1Anim = useRef(new Animated.Value(0)).current;
  const reel2Anim = useRef(new Animated.Value(0)).current;
  const reel3Anim = useRef(new Animated.Value(0)).current;
  const machineShake = useRef(new Animated.Value(0)).current;

  const getRandomSymbol = () => {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  };

  const calculateWin = (symbols: string[], betAmount: number) => {
    const [s1, s2, s3] = symbols;
    
    // Three of a kind
    if (s1 === s2 && s2 === s3) {
      switch (s1) {
        case '🍒': return betAmount * 100; // Cherry Jackpot
        case '🍋': return betAmount * 50;  // Lemon Triple
        case '🍊': return betAmount * 40;  // Orange Triple
        case '🍇': return betAmount * 30;  // Grape Triple
        case '🍉': return betAmount * 25;  // Watermelon Triple
        case '🍓': return betAmount * 20;  // Strawberry Triple
        case '🥝': return betAmount * 15;  // Kiwi Triple
        case '🍍': return betAmount * 10;  // Pineapple Triple
        default: return betAmount * 5;
      }
    }
    
    // Two cherries (any position)
    const cherryCount = symbols.filter(s => s === '🍒').length;
    if (cherryCount === 2) {
      return betAmount * 3;
    }
    
    // Mixed fruit combinations
    const uniqueFruits = new Set(symbols);
    if (uniqueFruits.size === 3) {
      // All different fruits
      return betAmount * 1.5;
    }
    
    return 0;
  };

  const getPaytable = () => {
    return [
      { symbols: '🍒 🍒 🍒', multiplier: '100x', description: 'Cherry Jackpot' },
      { symbols: '🍋 🍋 🍋', multiplier: '50x', description: 'Lemon Triple' },
      { symbols: '🍊 🍊 🍊', multiplier: '40x', description: 'Orange Triple' },
      { symbols: '🍇 🍇 🍇', multiplier: '30x', description: 'Grape Triple' },
      { symbols: '🍉 🍉 🍉', multiplier: '25x', description: 'Watermelon Triple' },
      { symbols: '🍓 🍓 🍓', multiplier: '20x', description: 'Strawberry Triple' },
      { symbols: '🥝 🥝 🥝', multiplier: '15x', description: 'Kiwi Triple' },
      { symbols: '🍍 🍍 🍍', multiplier: '10x', description: 'Pineapple Triple' },
      { symbols: '🍒 🍒 *', multiplier: '3x', description: 'Two Cherries' },
      { symbols: '* * *', multiplier: '1.5x', description: 'Mixed Fruits' },
    ];
  };

  // Generate result based on 20% win rate
  const generateFruitResult = (shouldWin: boolean, betAmount: number) => {
    if (shouldWin) {
      // Player should win - generate winning combination
      const winType = Math.random();
      
      if (winType < 0.05) {
        // 5% chance for cherry jackpot
        return ['🍒', '🍒', '🍒'];
      } else if (winType < 0.15) {
        // 10% chance for other triples
        const symbol = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1)) + 1];
        return [symbol, symbol, symbol];
      } else if (winType < 0.4) {
        // 25% chance for two cherries
        const otherSymbol = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1)) + 1];
        const positions = [0, 1, 2].sort(() => Math.random() - 0.5);
        const result = ['', '', ''];
        result[positions[0]] = '🍒';
        result[positions[1]] = '🍒';
        result[positions[2]] = otherSymbol;
        return result;
      } else {
        // Mixed fruits win
        const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
      }
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
    const betPlaced = await placeBet(betAmount, 'fruitMachine', 'Fruit Machine game bet placed');
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
    const finalSymbols = generateFruitResult(shouldWin, betAmount);

    // Animate reels with classic fruit machine effect
    const animateReel = (animValue: Animated.Value, duration: number) => {
      return Animated.timing(animValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      });
    };

    // Machine shake animation for excitement
    const shakeAnimation = Animated.sequence([
      Animated.timing(machineShake, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(machineShake, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(machineShake, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]);

    // Start shake animation
    Animated.loop(shakeAnimation, { iterations: 3 }).start();

    // Start all reel animations with staggered timing
    Animated.stagger(300, [
      animateReel(reel1Anim, 1000),
      animateReel(reel2Anim, 1300),
      animateReel(reel3Anim, 1600),
    ]).start(() => {
      // Reset animations
      reel1Anim.setValue(0);
      reel2Anim.setValue(0);
      reel3Anim.setValue(0);
      machineShake.setValue(0);
      
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
    }, 1600);
  };

  const processSpinResult = async (symbols: string[], betAmount: number) => {
    const winAmount = calculateWin(symbols, betAmount);
    const isWin = winAmount > 0;
    const isJackpot = symbols.every(s => s === '🍒');

    // Step 2: Add winnings if player won
    if (isWin && winAmount > 0) {
      await addWinnings(
        winAmount,
        'fruitMachine',
        `Fruit Machine game win - ${symbols.join(' ')}`
      );

      // Add to credits display
      setCredits(prev => prev + winAmount);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
    }

    setLastResult({ symbols, winAmount, isWin, betAmount, isJackpot });
    setIsSpinning(false);

    if (isWin) {
      if (isJackpot) {
        Alert.alert(
          '🍒 CHERRY JACKPOT! 🍒',
          `${symbols.join(' ')}\nYou hit the CHERRY JACKPOT!\nYou won PKR ${winAmount.toLocaleString()}!`,
          [{ text: 'Fantastic!' }]
        );
      } else {
        const multiplier = winAmount / betAmount;
        Alert.alert(
          'Fruit Win!',
          `${symbols.join(' ')} - ${multiplier}x\nYou won PKR ${winAmount.toLocaleString()}!`,
          [{ text: 'Sweet!' }]
        );
      }
    } else {
      Alert.alert(
        'No Win',
        `${symbols.join(' ')}\nTry again for the fruit jackpot!`,
        [{ text: 'Spin Again' }]
      );
    }
  };

  const getReelRotation = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '1080deg'], // 3 full rotations
    });
  };

  const getMachineShake = () => {
    return machineShake.interpolate({
      inputRange: [-10, 10],
      outputRange: [-10, 10],
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Game Title */}
      <View style={styles.section}>
        <Text style={styles.gameTitle}>🍒 Fruit Machine</Text>
        <Text style={styles.gameSubtitle}>Classic fruit slots with juicy wins!</Text>
      </View>

      {/* Balance & Credits Display */}
      <View style={styles.section}>
        <View style={styles.statsContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Text style={styles.balanceAmount}>PKR {balance?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.creditsCard}>
            <Text style={styles.creditsLabel}>🎰 Credits Won</Text>
            <Text style={styles.creditsAmount}>PKR {credits.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Fruit Machine */}
      <View style={styles.section}>
        <Animated.View style={[
          styles.fruitMachine,
          { transform: [{ translateX: getMachineShake() }] }
        ]}>
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
          <View style={styles.machineDetails}>
            <Text style={styles.machineLabel}>🎰 FRUIT MACHINE 🎰</Text>
          </View>
        </Animated.View>
      </View>

      {/* Last Result */}
      {lastResult && (
        <View style={styles.section}>
          <View style={[
            styles.resultCard, 
            lastResult.isJackpot ? styles.jackpotResultCard : 
            lastResult.isWin ? styles.winCard : styles.loseCard
          ]}>
            <Text style={styles.resultTitle}>
              {lastResult.isJackpot ? '🍒 CHERRY JACKPOT! 🍒' :
               lastResult.isWin ? '🎉 Fruit Win!' : '😔 No Win'}
            </Text>
            <Text style={styles.resultSymbols}>
              {lastResult.symbols.join(' ')}
            </Text>
            {lastResult.isWin && (
              <Text style={[
                styles.resultAmount,
                lastResult.isJackpot && styles.jackpotResultAmount
              ]}>
                PKR {lastResult.winAmount.toLocaleString()}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Paytable */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fruit Paytable</Text>
        <View style={styles.paytableCard}>
          {getPaytable().slice(0, 6).map((entry, index) => (
            <View key={index} style={styles.paytableRow}>
              <Text style={styles.paytableSymbols}>{entry.symbols}</Text>
              <Text style={[
                styles.paytableMultiplier,
                entry.multiplier === '100x' && styles.jackpotText
              ]}>
                {entry.multiplier}
              </Text>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: Colors.primary.surface,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  balanceLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
  creditsCard: {
    flex: 1,
    backgroundColor: Colors.success.background,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success.border,
  },
  creditsLabel: {
    fontSize: 12,
    color: Colors.success.text,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  creditsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success.text,
  },
  fruitMachine: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF6B35', // Orange border for fruit theme
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 300,
    marginBottom: 15,
  },
  reel: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primary.background,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  symbol: {
    fontSize: 40,
    textAlign: 'center',
  },
  machineDetails: {
    alignItems: 'center',
  },
  machineLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
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
  jackpotResultCard: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 10,
    textAlign: 'center',
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
  jackpotResultAmount: {
    fontSize: 24,
    color: Colors.primary.background,
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
    color: '#FF6B35',
  },
  jackpotText: {
    color: '#FF6B35',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
