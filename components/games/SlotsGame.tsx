// Classic Slots Game for Adola App
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';
import WebSlotsGame from './web/WebSlotsGame';

const { width } = Dimensions.get('window');
const SLOT_WIDTH = Math.min(width - 40, 350);

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];
const REELS = 3;

export default function SlotsGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    console.log('🌐 Loading WebSlotsGame for web platform');
    return <WebSlotsGame />;
  }

  console.log('📱 Loading mobile SlotsGame for platform:', Platform.OS);

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
    const [s1, s2, s3] = symbols;
    
    // Three of a kind
    if (s1 === s2 && s2 === s3) {
      switch (s1) {
        case '7️⃣': return betAmount * 100; // Jackpot
        case '💎': return betAmount * 50;
        case '⭐': return betAmount * 25;
        case '🔔': return betAmount * 15;
        case '🍇': return betAmount * 10;
        case '🍊': return betAmount * 8;
        case '🍋': return betAmount * 5;
        case '🍒': return betAmount * 3;
        default: return betAmount * 2;
      }
    }
    
    // Two cherries
    if ((s1 === '🍒' && s2 === '🍒') || 
        (s1 === '🍒' && s3 === '🍒') || 
        (s2 === '🍒' && s3 === '🍒')) {
      return betAmount * 2;
    }
    
    // One cherry
    if (s1 === '🍒' || s2 === '🍒' || s3 === '🍒') {
      return Math.floor(betAmount * 0.5);
    }
    
    return 0;
  };

  const generateSlotsResult = (shouldWin: boolean, betAmount: number): string[] => {
    if (shouldWin) {
      // Player should win - generate winning combination
      const winType = Math.random();

      if (winType < 0.1) {
        // 10% chance for high value wins (💎, ⭐, 7️⃣)
        const highValueSymbols = ['💎', '⭐', '7️⃣'];
        const symbol = highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];
        return [symbol, symbol, symbol];
      } else if (winType < 0.4) {
        // 30% chance for medium value wins (🔔, 🍇)
        const mediumValueSymbols = ['🔔', '🍇'];
        const symbol = mediumValueSymbols[Math.floor(Math.random() * mediumValueSymbols.length)];
        return [symbol, symbol, symbol];
      } else {
        // 60% chance for low value wins (🍊, 🍋, 🍒)
        const lowValueSymbols = ['🍊', '🍋', '🍒'];
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
    const betPlaced = await placeBet(betAmount, 'slots', 'Slots game bet placed');
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
    const finalSymbols = generateSlotsResult(shouldPlayerWin, betAmount);
    
    // Start spinning animations
    const spinAnimation = (animValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        { iterations: duration / 100 }
      );
    };

    // Start all reels spinning
    const reel1Animation = spinAnimation(reel1Anim, 1000);
    const reel2Animation = spinAnimation(reel2Anim, 1500);
    const reel3Animation = spinAnimation(reel3Anim, 2000);

    reel1Animation.start();
    reel2Animation.start();
    reel3Animation.start();

    // Update symbols during spin
    const spinInterval = setInterval(() => {
      setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
    }, 100);

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

  const getPaytable = () => {
    return [
      { symbols: '7️⃣ 7️⃣ 7️⃣', multiplier: '100x', description: 'JACKPOT!' },
      { symbols: '💎 💎 💎', multiplier: '50x', description: 'Diamond Triple' },
      { symbols: '⭐ ⭐ ⭐', multiplier: '25x', description: 'Star Triple' },
      { symbols: '🔔 🔔 🔔', multiplier: '15x', description: 'Bell Triple' },
      { symbols: '🍇 🍇 🍇', multiplier: '10x', description: 'Grape Triple' },
      { symbols: '🍊 🍊 🍊', multiplier: '8x', description: 'Orange Triple' },
      { symbols: '🍋 🍋 🍋', multiplier: '5x', description: 'Lemon Triple' },
      { symbols: '🍒 🍒 🍒', multiplier: '3x', description: 'Cherry Triple' },
      { symbols: '🍒 🍒 _', multiplier: '2x', description: 'Two Cherries' },
      { symbols: '🍒 _ _', multiplier: '0.5x', description: 'One Cherry' },
    ];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎰 Slots</Text>
      <Text style={styles.subtitle}>Spin the reels and win big!</Text>

      {/* Slot Machine */}
      <View style={[styles.slotMachine, { width: SLOT_WIDTH }]}>
        <View style={styles.reelsContainer}>
          {reels.map((symbol, index) => (
            <Animated.View
              key={index}
              style={[
                styles.reel,
                {
                  transform: [{
                    rotateY: index === 0 ? reel1Anim.interpolate({
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
        
        {/* Win Line */}
        <View style={styles.winLine} />
      </View>

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
        <Text style={styles.paytableTitle}>Paytable</Text>
        <View style={styles.paytable}>
          {getPaytable().slice(0, 5).map((entry, index) => (
            <View key={index} style={styles.paytableRow}>
              <Text style={styles.paytableSymbols}>{entry.symbols}</Text>
              <Text style={styles.paytableMultiplier}>{entry.multiplier}</Text>
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
  slotMachine: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary.border,
    alignItems: 'center',
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
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary.border,
    margin: 5,
  },
  symbol: {
    fontSize: 40,
  },
  winLine: {
    width: '90%',
    height: 2,
    backgroundColor: Colors.primary.gold,
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
    gap: 8,
  },
  paytableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paytableSymbols: {
    fontSize: 16,
    color: Colors.primary.text,
  },
  paytableMultiplier: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
});
