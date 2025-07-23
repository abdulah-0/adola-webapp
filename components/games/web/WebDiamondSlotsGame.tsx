// Web-specific Diamond Slots Game - Vertically Scrollable Layout
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
import { AdvancedGameLogicService } from '../../../services/advancedGameLogicService';

const { width } = Dimensions.get('window');

const SYMBOLS = ['💎', '💍', '👑', '⭐', '🔔', '🍀', '🎰', '7️⃣'];
const REELS = 3;

export default function WebDiamondSlotsGame() {
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

  const getRandomSymbol = () => {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  };

  const calculateWin = (symbols: string[], betAmount: number) => {
    // Three of a kind
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
      switch (symbols[0]) {
        case '💎': return jackpotAmount; // Diamond Jackpot
        case '7️⃣': return betAmount * 100;
        case '👑': return betAmount * 50;
        case '💍': return betAmount * 30;
        case '⭐': return betAmount * 20;
        case '🔔': return betAmount * 15;
        case '🍀': return betAmount * 10;
        case '🎰': return betAmount * 8;
        default: return betAmount * 5;
      }
    }
    
    // Two diamonds
    if (symbols.filter(s => s === '💎').length === 2) {
      return betAmount * 5;
    }
    
    return 0;
  };

  const getPaytable = () => {
    return [
      { symbols: '💎 💎 💎', payout: 'JACKPOT!' },
      { symbols: '7️⃣ 7️⃣ 7️⃣', payout: '100x' },
      { symbols: '👑 👑 👑', payout: '50x' },
      { symbols: '💍 💍 💍', payout: '30x' },
      { symbols: '⭐ ⭐ ⭐', payout: '20x' },
      { symbols: '🔔 🔔 🔔', payout: '15x' },
      { symbols: '🍀 🍀 🍀', payout: '10x' },
      { symbols: '🎰 🎰 🎰', payout: '8x' },
      { symbols: '💎 💎 *', payout: '5x' },
    ];
  };

  // Generate result based on advanced game logic
  const generateDiamondSlotsResult = (shouldWin: boolean, betAmount: number, winAmount: number) => {
    if (shouldWin) {
      // Determine if it's a jackpot win
      if (winAmount >= jackpotAmount * 0.8) {
        return ['💎', '💎', '💎']; // Jackpot
      }
      
      // Generate appropriate winning combination based on win amount
      const multiplier = winAmount / betAmount;
      
      if (multiplier >= 100) return ['7️⃣', '7️⃣', '7️⃣'];
      if (multiplier >= 50) return ['👑', '👑', '👑'];
      if (multiplier >= 30) return ['💍', '💍', '💍'];
      if (multiplier >= 20) return ['⭐', '⭐', '⭐'];
      if (multiplier >= 15) return ['🔔', '🔔', '🔔'];
      if (multiplier >= 10) return ['🍀', '🍀', '🍀'];
      if (multiplier >= 8) return ['🎰', '🎰', '🎰'];
      if (multiplier >= 5) {
        // Two diamonds
        const otherSymbol = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1)) + 1];
        return ['💎', '💎', otherSymbol];
      }
      
      // Default win
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
      setEngagementBonus(bonus || '');

      console.log(`🎰 Diamond Slots: Calculated win probability: ${(probability * 100).toFixed(1)}%`);

      // Step 1: Deduct bet amount immediately
      const betPlaced = await placeBet(betAmount, 'diamondSlots', 'Diamond Slots game bet placed');
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
        animateReel(reel1Anim, 1200),
        animateReel(reel2Anim, 1400),
        animateReel(reel3Anim, 1600),
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
      }, 1600);

    } catch (error) {
      console.error('❌ Error in Diamond Slots spin:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
      setIsSpinning(false);
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

      // Step 2: Add winnings if player won
      if (isWin && winAmount > 0) {
        await addWinnings(
          winAmount,
          'diamondSlots',
          `Diamond Slots game win - ${symbols.join(' ')}`
        );

        // Force balance refresh to ensure UI updates
        setTimeout(() => refreshBalance(), 500);
      }

      setLastResult({ symbols, winAmount, isWin, betAmount, isJackpot });
      setIsSpinning(false);

      if (isWin) {
        if (isJackpot) {
          Alert.alert(
            '💎 DIAMOND JACKPOT! 💎',
            `${symbols.join(' ')}\nYou won the JACKPOT of PKR ${winAmount.toLocaleString()}!`,
            [{ text: 'Amazing!' }]
          );
        } else {
          const multiplier = winAmount / betAmount;
          Alert.alert(
            'You Won!',
            `${symbols.join(' ')} - ${multiplier}x\nYou won PKR ${winAmount.toLocaleString()}!`,
            [{ text: 'Great!' }]
          );
        }
      } else {
        Alert.alert(
          'No Win',
          `${symbols.join(' ')}\nBetter luck next time!`,
          [{ text: 'Try Again' }]
        );
      }
    } catch (error) {
      console.error('❌ Error processing Diamond Slots result:', error);
      setIsSpinning(false);
    }
  };

  const getReelRotation = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '720deg'],
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Game Title */}
      <View style={styles.section}>
        <Text style={styles.gameTitle}>💎 Diamond Slots</Text>
        <Text style={styles.gameSubtitle}>Premium slots with massive jackpots!</Text>
      </View>

      {/* Balance & Jackpot Display */}
      <View style={styles.section}>
        <View style={styles.statsContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Text style={styles.balanceAmount}>PKR {balance?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.jackpotCard}>
            <Text style={styles.jackpotLabel}>💎 Jackpot</Text>
            <Text style={styles.jackpotAmount}>PKR {jackpotAmount.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Engagement Bonus Display */}
      {engagementBonus && (
        <View style={styles.section}>
          <View style={styles.bonusCard}>
            <Text style={styles.bonusText}>🎁 {engagementBonus}</Text>
          </View>
        </View>
      )}

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
          <View style={[
            styles.resultCard, 
            lastResult.isJackpot ? styles.jackpotResultCard : 
            lastResult.isWin ? styles.winCard : styles.loseCard
          ]}>
            <Text style={styles.resultTitle}>
              {lastResult.isJackpot ? '💎 DIAMOND JACKPOT! 💎' :
               lastResult.isWin ? '🎉 You Won!' : '😔 No Win'}
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
        <Text style={styles.sectionTitle}>Diamond Paytable</Text>
        <View style={styles.paytableCard}>
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
  jackpotCard: {
    flex: 1,
    backgroundColor: Colors.primary.surface,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary.gold,
  },
  jackpotLabel: {
    fontSize: 12,
    color: Colors.primary.gold,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  jackpotAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
  bonusCard: {
    backgroundColor: Colors.primary.surface,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
  },
  bonusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
  },
  slotMachine: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary.gold,
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
    borderColor: Colors.primary.gold,
    shadowColor: Colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
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
    backgroundColor: Colors.primary.surface,
    borderColor: Colors.primary.neonCyan,
  },
  loseCard: {
    backgroundColor: Colors.primary.surface,
    borderColor: Colors.primary.border,
  },
  jackpotResultCard: {
    backgroundColor: Colors.primary.gold,
    borderColor: Colors.primary.gold,
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
    color: Colors.primary.neonCyan,
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
    color: Colors.primary.gold,
  },
  jackpotText: {
    color: Colors.primary.gold,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
