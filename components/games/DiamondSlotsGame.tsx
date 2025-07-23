// Diamond Slots Game for Adola App (Premium Version)
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
import { AdvancedGameLogicService } from '../../services/advancedGameLogicService';
import WebDiamondSlotsGame from './web/WebDiamondSlotsGame';

const { width } = Dimensions.get('window');
const SLOT_WIDTH = Math.min(width - 40, 350);

const SYMBOLS = ['💎', '💍', '👑', '⭐', '🔔', '🍀', '🎰', '7️⃣'];
const REELS = 3;

export default function DiamondSlotsGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    return <WebDiamondSlotsGame />;
  }

  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['💎', '💎', '💎']);
  const [lastResult, setLastResult] = useState<any>(null);
  const [jackpotAmount, setJackpotAmount] = useState(50000);
  const [gameWinProbability, setGameWinProbability] = useState(0);
  const [engagementBonus, setEngagementBonus] = useState<string>('');

  const gameLogicService = AdvancedGameLogicService.getInstance();
  
  // Animation refs for each reel
  const reel1Anim = useRef(new Animated.Value(0)).current;
  const reel2Anim = useRef(new Animated.Value(0)).current;
  const reel3Anim = useRef(new Animated.Value(0)).current;
  const jackpotPulse = useRef(new Animated.Value(1)).current;

  const getRandomSymbol = () => {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  };

  const calculateWin = (symbols: string[], betAmount: number) => {
    const [s1, s2, s3] = symbols;
    
    // Three of a kind
    if (s1 === s2 && s2 === s3) {
      switch (s1) {
        case '💎': return jackpotAmount; // Diamond Jackpot
        case '7️⃣': return betAmount * 500; // Lucky 7s
        case '👑': return betAmount * 200; // Crown Triple
        case '💍': return betAmount * 100; // Ring Triple
        case '⭐': return betAmount * 50; // Star Triple
        case '🔔': return betAmount * 25; // Bell Triple
        case '🍀': return betAmount * 15; // Clover Triple
        case '🎰': return betAmount * 10; // Slot Triple
        default: return betAmount * 5;
      }
    }
    
    // Two diamonds
    if ((s1 === '💎' && s2 === '💎') || 
        (s1 === '💎' && s3 === '💎') || 
        (s2 === '💎' && s3 === '💎')) {
      return betAmount * 10;
    }
    
    // One diamond
    if (s1 === '💎' || s2 === '💎' || s3 === '💎') {
      return betAmount * 2;
    }
    
    // Two 7s
    if ((s1 === '7️⃣' && s2 === '7️⃣') || 
        (s1 === '7️⃣' && s3 === '7️⃣') || 
        (s2 === '7️⃣' && s3 === '7️⃣')) {
      return betAmount * 5;
    }
    
    return 0;
  };

  const generateDiamondSlotsResult = (shouldWin: boolean, betAmount: number, targetWinAmount: number = 0): string[] => {
    if (shouldWin && targetWinAmount > 0) {
      // Player should win - generate winning combination based on target amount
      const multiplier = targetWinAmount / betAmount;

      if (multiplier >= 100) {
        // Diamond jackpot (💎 💎 💎) - 100x+
        return ['💎', '💎', '💎'];
      } else if (multiplier >= 50) {
        // 7s jackpot (7️⃣ 7️⃣ 7️⃣) - 50x
        return ['7️⃣', '7️⃣', '7️⃣'];
      } else if (multiplier >= 20) {
        // High value wins (👑, 💍) - 20x
        const highValueSymbols = ['👑', '💍'];
        const symbol = highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];
        return [symbol, symbol, symbol];
      } else if (multiplier >= 10) {
        // Medium value wins (⭐, 🔔) - 10x
        const mediumValueSymbols = ['⭐', '🔔'];
        const symbol = mediumValueSymbols[Math.floor(Math.random() * mediumValueSymbols.length)];
        return [symbol, symbol, symbol];
      } else if (multiplier >= 5) {
        // Two 7s - 5x
        const symbols = ['7️⃣', '7️⃣', getRandomSymbol()];
        // Shuffle to randomize position
        for (let i = symbols.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
        }
        return symbols;
      } else if (multiplier >= 2) {
        // One diamond - 2x
        const symbols = ['💎', getRandomSymbol(), getRandomSymbol()];
        // Ensure no other wins
        while (calculateWin(symbols, betAmount) !== betAmount * 2) {
          symbols[1] = getRandomSymbol();
          symbols[2] = getRandomSymbol();
        }
        return symbols;
      } else {
        // Low value wins (🍀, 🎰) - 3x
        const lowValueSymbols = ['🍀', '🎰'];
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

    try {
      // Check if user can place bet using advanced game logic
      if (!gameLogicService.canPlayGame(betAmount, balance || 0, 'slots')) {
        const message = gameLogicService.getBalanceValidationMessage(betAmount, balance || 0, 'slots');
        Alert.alert('Cannot Place Bet', message);
        return;
      }

      if (!user?.id) {
        Alert.alert('Error', 'User not found. Please try again.');
        return;
      }

      // Calculate win probability using advanced game logic
      const { probability, engagementBonus: bonus } = await gameLogicService.calculateWinProbability({
        betAmount,
        basePayout: 10, // Average slots multiplier
        gameType: 'slots',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { jackpotAmount }
      });

      setGameWinProbability(probability);
      setEngagementBonus(bonus);

      console.log(`🎯 Diamond Slots: Win probability ${(probability * 100).toFixed(1)}%, Jackpot: PKR ${jackpotAmount.toLocaleString()}`);
      if (bonus) {
        console.log(`🎯 Engagement bonus: ${bonus}`);
      }

      // Step 1: Deduct bet amount immediately
      const betPlaced = await placeBet(betAmount, 'slots', 'Diamond Slots bet placed');
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);

      setIsSpinning(true);
      setLastResult(null);

      // Increase jackpot slightly
      setJackpotAmount(prev => prev + Math.floor(betAmount * 0.1));

      // Use advanced game logic to determine win/loss
      const gameResult = await gameLogicService.calculateAdvancedGameResult({
        betAmount,
        basePayout: 10, // Average slots multiplier
        gameType: 'slots',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { jackpotAmount }
      });

      // Generate final symbols based on game result
      const finalSymbols = generateDiamondSlotsResult(gameResult.won, betAmount, gameResult.winAmount);
    
    // Start spinning animations with different durations
    const spinAnimation = (animValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        { iterations: duration / 80 }
      );
    };

    // Start all reels spinning
    const reel1Animation = spinAnimation(reel1Anim, 1500);
    const reel2Animation = spinAnimation(reel2Anim, 2000);
    const reel3Animation = spinAnimation(reel3Anim, 2500);

    reel1Animation.start();
    reel2Animation.start();
    reel3Animation.start();

    // Animate jackpot pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(jackpotPulse, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(jackpotPulse, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Update symbols during spin
    const spinInterval = setInterval(() => {
      setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
    }, 80);

    // Stop spinning after delay
    setTimeout(() => {
      clearInterval(spinInterval);
      
      // Stop animations
      reel1Anim.stopAnimation();
      reel2Anim.stopAnimation();
      reel3Anim.stopAnimation();
      jackpotPulse.stopAnimation();
      
      // Reset animation values
      reel1Anim.setValue(0);
      reel2Anim.setValue(0);
      reel3Anim.setValue(0);
      jackpotPulse.setValue(1);
      
      // Set final symbols
      setReels(finalSymbols);
      
      // Calculate result
      processSpinResult(finalSymbols, betAmount);
    }, 2500);
    } catch (error) {
      console.error('❌ Error in Diamond Slots spinReels:', error);
      setIsSpinning(false);
      Alert.alert('Error', 'Failed to spin reels. Please try again.');
    }
  };

  const processSpinResult = async (symbols: string[], betAmount: number) => {
    const winAmount = calculateWin(symbols, betAmount);
    const isWin = winAmount > 0;
    const isJackpot = symbols.every(s => s === '💎');

    if (!user?.id) {
      console.error('❌ User ID not found for Diamond Slots result processing');
      return;
    }

    try {
      // If jackpot won, reset it
      if (isJackpot) {
        setJackpotAmount(50000);
      }

      console.log(`🎰 Diamond Slots: Win probability: ${(gameWinProbability * 100).toFixed(1)}%, Symbols: ${symbols.join(' ')}, Won: ${isWin}, Amount: PKR ${winAmount}`);
      console.log(`📊 Adjusted probability: ${(gameWinProbability * 100).toFixed(1)}%, House edge: ${(gameLogicService.getGameConfig('slots').houseEdge * 100).toFixed(1)}%`);

      // Log the game result for analytics
      await gameLogicService.logGameResult(user.id, 'slots', {
        won: isWin,
        multiplier: isWin ? winAmount / betAmount : 0,
        winAmount: isWin ? winAmount : 0,
        betAmount,
        newBalance: isWin ? (balance || 0) + winAmount - betAmount : (balance || 0) - betAmount,
        adjustedProbability: gameWinProbability,
        houseEdge: gameLogicService.getGameConfig('slots').houseEdge,
        engagementBonus
      }, {
        symbols,
        isJackpot,
        jackpotAmount: isJackpot ? jackpotAmount : undefined,
        adjustedProbability: gameWinProbability
      });

      // Step 2: Add winnings if player won
      if (isWin && winAmount > 0) {
        await addWinnings(
          winAmount,
          'slots',
          `Diamond Slots win - ${symbols.join(' ')}`
        );

        // Force balance refresh to ensure UI updates
        setTimeout(() => refreshBalance(), 500);
      }

      setLastResult({ symbols, winAmount, isWin, betAmount, isJackpot, engagementBonus });
      setIsSpinning(false);

      if (isJackpot) {
        let message = `${symbols.join(' ')}\nYou won the JACKPOT of PKR ${winAmount.toLocaleString()}!`;
        if (engagementBonus) {
          message += `\n\n🎯 ${engagementBonus}`;
        }
        Alert.alert('💎 DIAMOND JACKPOT! 💎', message, [{ text: 'AMAZING!' }]);
      } else if (isWin) {
        const multiplier = winAmount / betAmount;
        let message = `${symbols.join(' ')} - ${multiplier}x\nYou won PKR ${winAmount.toLocaleString()}!`;
        if (engagementBonus) {
          message += `\n\n🎯 ${engagementBonus}`;
        }
        Alert.alert('Diamond Win! 💎', message, [{ text: 'OK' }]);
      } else {
        Alert.alert(
          'No Win',
          `${symbols.join(' ')}\nBetter luck next time!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error in Diamond Slots processSpinResult:', error);
      setLastResult({ symbols, winAmount: 0, isWin: false, betAmount, isJackpot: false });
      setIsSpinning(false);
      Alert.alert('Error', 'An error occurred while processing the spin result.');
    }
  };

  const getPaytable = () => {
    return [
      { symbols: '💎 💎 💎', payout: 'JACKPOT!', description: 'Diamond Jackpot' },
      { symbols: '7️⃣ 7️⃣ 7️⃣', payout: '500x', description: 'Lucky Sevens' },
      { symbols: '👑 👑 👑', payout: '200x', description: 'Royal Crown' },
      { symbols: '💍 💍 💍', payout: '100x', description: 'Diamond Ring' },
      { symbols: '⭐ ⭐ ⭐', payout: '50x', description: 'Star Triple' },
      { symbols: '🔔 🔔 🔔', payout: '25x', description: 'Bell Triple' },
      { symbols: '💎 💎 _', payout: '10x', description: 'Two Diamonds' },
      { symbols: '7️⃣ 7️⃣ _', payout: '5x', description: 'Two Sevens' },
      { symbols: '💎 _ _', payout: '2x', description: 'One Diamond' },
    ];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💎 Diamond Slots</Text>
      <Text style={styles.subtitle}>Premium slots with diamond jackpot!</Text>

      {/* Jackpot Display */}
      <Animated.View style={[styles.jackpotContainer, { transform: [{ scale: jackpotPulse }] }]}>
        <Text style={styles.jackpotLabel}>💎 DIAMOND JACKPOT 💎</Text>
        <Text style={styles.jackpotAmount}>PKR {jackpotAmount.toLocaleString()}</Text>
      </Animated.View>

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
        
        {/* Win Lines */}
        <View style={styles.winLine} />
        <View style={[styles.winLine, styles.winLineTop]} />
        <View style={[styles.winLine, styles.winLineBottom]} />
      </View>

      {/* Result Display */}
      {lastResult && !isSpinning && (
        <View style={[
          styles.resultContainer,
          lastResult.isJackpot && styles.jackpotResult
        ]}>
          <Text style={[
            styles.resultText,
            { 
              color: lastResult.isJackpot ? Colors.primary.gold :
                    lastResult.isWin ? Colors.primary.neonCyan : Colors.primary.textSecondary 
            }
          ]}>
            {lastResult.isJackpot ? '💎 JACKPOT! 💎' :
             lastResult.isWin ? `WIN! +PKR ${lastResult.winAmount.toLocaleString()}` : 'No Win'}
          </Text>
          <Text style={styles.resultSymbols}>
            {lastResult.symbols.join(' ')}
          </Text>
        </View>
      )}

      {/* Paytable */}
      <View style={styles.paytableContainer}>
        <Text style={styles.paytableTitle}>Diamond Paytable</Text>
        <View style={styles.paytable}>
          {getPaytable().slice(0, 6).map((entry, index) => (
            <View key={index} style={styles.paytableRow}>
              <Text style={styles.paytableSymbols}>{entry.symbols}</Text>
              <Text style={[
                styles.paytableMultiplier,
                entry.payout === 'JACKPOT!' && styles.jackpotText
              ]}>
                {entry.payout}
              </Text>
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
  jackpotContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.gold,
    alignItems: 'center',
    shadowColor: Colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  jackpotLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    marginBottom: 4,
  },
  jackpotAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.gold,
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
    position: 'relative',
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  reel: {
    width: 90,
    height: 90,
    backgroundColor: Colors.primary.card,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary.gold,
    margin: 5,
    shadowColor: Colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  symbol: {
    fontSize: 50,
  },
  winLine: {
    width: '90%',
    height: 3,
    backgroundColor: Colors.primary.gold,
    position: 'absolute',
    top: '50%',
    marginTop: -1.5,
  },
  winLineTop: {
    top: '35%',
  },
  winLineBottom: {
    top: '65%',
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
  jackpotResult: {
    borderColor: Colors.primary.gold,
    borderWidth: 3,
    shadowColor: Colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
  resultText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultSymbols: {
    fontSize: 28,
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
  jackpotText: {
    color: Colors.primary.gold,
    fontSize: 16,
    textShadowColor: Colors.primary.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
});
