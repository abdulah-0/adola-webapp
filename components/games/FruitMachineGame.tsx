// Fruit Machine Game for Adola App (Classic Version)
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';

const { width } = Dimensions.get('window');
const SLOT_WIDTH = Math.min(width - 40, 350);

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🍉', '🍓', '🥝', '🍍'];
const REELS = 3;

export default function FruitMachineGame() {
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
    
    // Two cherries (classic fruit machine rule)
    if ((s1 === '🍒' && s2 === '🍒') || 
        (s1 === '🍒' && s3 === '🍒') || 
        (s2 === '🍒' && s3 === '🍒')) {
      return betAmount * 5;
    }
    
    // One cherry
    if (s1 === '🍒' || s2 === '🍒' || s3 === '🍒') {
      return Math.floor(betAmount * 1.5);
    }
    
    // Any three fruits (mixed)
    const allFruits = symbols.every(s => SYMBOLS.includes(s));
    if (allFruits && !(s1 === s2 && s2 === s3)) {
      return Math.floor(betAmount * 0.5);
    }
    
    return 0;
  };

  const generateFruitMachineResult = (shouldWin: boolean, betAmount: number): string[] => {
    if (shouldWin) {
      // Player should win - generate winning combination
      const winType = Math.random();

      if (winType < 0.05) {
        // 5% chance for cherry jackpot (🍒 🍒 🍒)
        return ['🍒', '🍒', '🍒'];
      } else if (winType < 0.1) {
        // 5% chance for lemon triple (🍋 🍋 🍋)
        return ['🍋', '🍋', '🍋'];
      } else if (winType < 0.2) {
        // 10% chance for high value wins (🍊, 🍇)
        const highValueSymbols = ['🍊', '🍇'];
        const symbol = highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];
        return [symbol, symbol, symbol];
      } else if (winType < 0.4) {
        // 20% chance for medium value wins (🍉, 🍓)
        const mediumValueSymbols = ['🍉', '🍓'];
        const symbol = mediumValueSymbols[Math.floor(Math.random() * mediumValueSymbols.length)];
        return [symbol, symbol, symbol];
      } else {
        // 60% chance for low value wins (🥝, 🍍)
        const lowValueSymbols = ['🥝', '🍍'];
        const symbol = lowValueSymbols[Math.floor(Math.random() * lowValueSymbols.length)];
        return [symbol, symbol, symbol];
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
    const betPlaced = await placeBet(betAmount, 'fruitmachine', 'Fruit Machine bet placed');
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      return;
    }

    // Force balance refresh to ensure UI updates
    setTimeout(() => refreshBalance(), 500);

    setIsSpinning(true);
    setLastResult(null);

    // Determine if player should win (20% win rate)
    const shouldPlayerWin = Math.random() < 0.2;

    // Generate final symbols based on win rate requirement
    const finalSymbols = generateFruitMachineResult(shouldPlayerWin, betAmount);
    
    // Start machine shake animation
    Animated.sequence([
      Animated.timing(machineShake, {
        toValue: 5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(machineShake, {
        toValue: -5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(machineShake, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Start spinning animations with classic timing
    const spinAnimation = (animValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        { iterations: duration / 150 }
      );
    };

    // Start all reels spinning with staggered stops
    const reel1Animation = spinAnimation(reel1Anim, 1000);
    const reel2Animation = spinAnimation(reel2Anim, 1500);
    const reel3Animation = spinAnimation(reel3Anim, 2000);

    reel1Animation.start();
    reel2Animation.start();
    reel3Animation.start();

    // Update symbols during spin
    const spinInterval = setInterval(() => {
      setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
    }, 150);

    // Stop spinning after delay
    setTimeout(() => {
      clearInterval(spinInterval);
      
      // Stop animations
      reel1Anim.stopAnimation();
      reel2Anim.stopAnimation();
      reel3Anim.stopAnimation();
      
      // Reset animation values
      reel1Anim.setValue(0);
      reel2Anim.setValue(0);
      reel3Anim.setValue(0);
      
      // Set final symbols
      setReels(finalSymbols);
      
      // Calculate result
      processSpinResult(finalSymbols, betAmount);
    }, 2000);
  };

  const processSpinResult = async (symbols: string[], betAmount: number) => {
    const winAmount = calculateWin(symbols, betAmount);
    const isWin = winAmount > 0;

    // Add to credits for classic feel
    if (isWin) {
      setCredits(prev => prev + winAmount);
    }

    // Step 2: Add winnings if player won
    if (isWin && winAmount > 0) {
      await addWinnings(
        winAmount,
        'fruitmachine',
        `Fruit Machine win - ${symbols.join(' ')}`
      );

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
    }

    setLastResult({ symbols, winAmount, isWin, betAmount });
    setIsSpinning(false);

    if (isWin) {
      const multiplier = winAmount / betAmount;
      
      // Special animation for big wins
      if (multiplier >= 50) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(machineShake, {
              toValue: 10,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(machineShake, {
              toValue: -10,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(machineShake, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ).start();
      }

      Alert.alert(
        'Fruit Machine Win! 🍒',
        `${symbols.join(' ')} - ${multiplier}x\nYou won PKR ${winAmount}!\nCredits: ${credits + winAmount}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'No Win',
        `${symbols.join(' ')}\nTry again!`,
        [{ text: 'OK' }]
      );
    }
  };

  const collectCredits = () => {
    if (credits > 0) {
      Alert.alert(
        'Credits Collected! 💰',
        `You collected PKR ${credits} in credits!`,
        [{ text: 'OK' }]
      );
      setCredits(0);
    }
  };

  const getPaytable = () => {
    return [
      { symbols: '🍒 🍒 🍒', payout: '100x', description: 'Cherry Jackpot' },
      { symbols: '🍋 🍋 🍋', payout: '50x', description: 'Lemon Triple' },
      { symbols: '🍊 🍊 🍊', payout: '40x', description: 'Orange Triple' },
      { symbols: '🍇 🍇 🍇', payout: '30x', description: 'Grape Triple' },
      { symbols: '🍉 🍉 🍉', payout: '25x', description: 'Watermelon Triple' },
      { symbols: '🍓 🍓 🍓', payout: '20x', description: 'Strawberry Triple' },
      { symbols: '🍒 🍒 _', payout: '5x', description: 'Two Cherries' },
      { symbols: '🍒 _ _', payout: '1.5x', description: 'One Cherry' },
      { symbols: 'Any 3 Fruits', payout: '0.5x', description: 'Mixed Fruits' },
    ];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍒 Fruit Machine</Text>
      <Text style={styles.subtitle}>Classic fruit slot with traditional symbols!</Text>

      {/* Credits Display */}
      <View style={styles.creditsContainer}>
        <Text style={styles.creditsLabel}>Credits:</Text>
        <Text style={styles.creditsAmount}>PKR {credits}</Text>
        {credits > 0 && (
          <TouchableOpacity style={styles.collectButton} onPress={collectCredits}>
            <Text style={styles.collectText}>Collect</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Fruit Machine */}
      <Animated.View 
        style={[
          styles.slotMachine, 
          { 
            width: SLOT_WIDTH,
            transform: [{ translateX: machineShake }]
          }
        ]}
      >
        <View style={styles.reelsContainer}>
          {reels.map((symbol, index) => (
            <Animated.View
              key={index}
              style={[
                styles.reel,
                {
                  transform: [{
                    rotateX: index === 0 ? reel1Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }) : index === 1 ? reel2Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }) : reel3Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.symbol}>{symbol}</Text>
            </Animated.View>
          ))}
        </View>
        
        {/* Classic fruit machine styling */}
        <View style={styles.machineBorder} />
        <View style={styles.winLine} />
      </Animated.View>

      {/* Result Display */}
      {lastResult && !isSpinning && (
        <View style={styles.resultContainer}>
          <Text style={[
            styles.resultText,
            { color: lastResult.isWin ? Colors.primary.neonCyan : Colors.primary.textSecondary }
          ]}>
            {lastResult.isWin ? `WIN! +PKR ${lastResult.winAmount}` : 'No Win'}
          </Text>
          <Text style={styles.resultSymbols}>
            {lastResult.symbols.join(' ')}
          </Text>
        </View>
      )}

      {/* Paytable */}
      <View style={styles.paytableContainer}>
        <Text style={styles.paytableTitle}>Fruit Paytable</Text>
        <View style={styles.paytable}>
          {getPaytable().slice(0, 6).map((entry, index) => (
            <View key={index} style={styles.paytableRow}>
              <Text style={styles.paytableSymbols}>{entry.symbols}</Text>
              <Text style={styles.paytableMultiplier}>{entry.payout}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Betting Panel */}
      <BettingPanel
        balance={balance}
        minBet={10}
        maxBet={balance || 1000}
        onBet={spinReels}
        disabled={isSpinning}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  creditsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    gap: 12,
  },
  creditsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  creditsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    flex: 1,
  },
  collectButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  collectText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  slotMachine: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: Colors.primary.gold,
    alignItems: 'center',
    position: 'relative',
    shadowColor: Colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  reel: {
    width: 80,
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary.border,
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  symbol: {
    fontSize: 40,
  },
  machineBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary.hotPink,
  },
  winLine: {
    width: '90%',
    height: 2,
    backgroundColor: Colors.primary.hotPink,
    position: 'absolute',
    top: '50%',
    marginTop: -1,
  },
  resultContainer: {
    backgroundColor: Colors.primary.surface,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultSymbols: {
    fontSize: 24,
    color: Colors.primary.text,
  },
  paytableContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    padding: 16,
    width: '90%',
  },
  paytableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  paytable: {
    gap: 6,
  },
  paytableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paytableSymbols: {
    fontSize: 14,
    color: Colors.primary.text,
  },
  paytableMultiplier: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
});
