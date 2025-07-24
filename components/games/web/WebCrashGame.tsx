// Web-specific Crash Game - Vertically Scrollable Layout
import React, { useState, useEffect, useRef } from 'react';
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

export default function WebCrashGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [gameState, setGameState] = useState<'waiting' | 'flying' | 'crashed'>('waiting');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(0);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashOutMultiplier, setCashOutMultiplier] = useState<number | null>(null);
  const [gameHistory, setGameHistory] = useState<number[]>([]);
  const [waitingTime, setWaitingTime] = useState(5);
  const [gameWinProbability, setGameWinProbability] = useState(0);
  const [engagementBonus, setEngagementBonus] = useState<string>('');

  // Animation refs
  const rocketY = useRef(new Animated.Value(200)).current;
  const multiplierScale = useRef(new Animated.Value(1)).current;

  const gameLogicService = AdvancedGameLogicService.getInstance();

  // Game loop ref
  const gameLoopRef = useRef<number | null>(null);
  const waitingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    startWaitingPhase();
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
    };
  }, []);

  const generateCrashPoint = () => {
    // Generate crash point with realistic distribution - REDUCED MAX OUTPUTS
    const random = Math.random();
    if (random < 0.6) return 1.0 + Math.random() * 0.8; // 60%: 1-1.8x - INCREASED LOW RANGE
    if (random < 0.85) return 1.8 + Math.random() * 1.7; // 25%: 1.8-3.5x - REDUCED
    if (random < 0.98) return 3.5 + Math.random() * 2.5; // 13%: 3.5-6.0x - REDUCED
    return 6.0 + Math.random() * 4.0; // 2%: 6.0-10.0x - REDUCED FROM 100x
  };

  const startWaitingPhase = () => {
    console.log('🚀 Starting waiting phase');
    setGameState('waiting');
    setCurrentMultiplier(1.0);
    setCrashPoint(null);
    setHasBet(false);
    setCashedOut(false);
    setCashOutMultiplier(null);
    setWaitingTime(5);

    // Reset animations
    rocketY.setValue(200);
    multiplierScale.setValue(1);

    // Start countdown
    let timeLeft = 5;
    waitingTimerRef.current = setInterval(() => {
      timeLeft--;
      setWaitingTime(timeLeft);
      if (timeLeft <= 0) {
        if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
        startGame();
      }
    }, 1000);
  };

  const startGame = () => {
    console.log('🚀 Starting game');
    const newCrashPoint = generateCrashPoint();
    setCrashPoint(newCrashPoint);
    setGameState('flying');

    // Start rocket animation
    Animated.timing(rocketY, {
      toValue: 50,
      duration: newCrashPoint * 1000,
      useNativeDriver: false,
    }).start();

    // Start multiplier counter
    let multiplier = 1.0;
    gameLoopRef.current = setInterval(() => {
      multiplier += 0.01;
      setCurrentMultiplier(multiplier);

      // Animate multiplier scale
      Animated.sequence([
        Animated.timing(multiplierScale, {
          toValue: 1.1,
          duration: 50,
          useNativeDriver: false,
        }),
        Animated.timing(multiplierScale, {
          toValue: 1.0,
          duration: 50,
          useNativeDriver: false,
        }),
      ]).start();

      if (multiplier >= newCrashPoint) {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        crashGame(newCrashPoint);
      }
    }, 100);
  };

  const crashGame = (finalMultiplier: number) => {
    setGameState('crashed');
    setCurrentMultiplier(finalMultiplier);
    
    // Add to history
    setGameHistory(prev => [finalMultiplier, ...prev.slice(0, 9)]);

    // Process game result if user had a bet
    if (hasBet && !cashedOut) {
      // User lost - bet was already deducted when placed
      Alert.alert(
        'Crashed!',
        `The rocket crashed at ${finalMultiplier.toFixed(2)}x\nYou lost PKR ${betAmount}`,
        [{ text: 'OK' }]
      );
    }

    // Start new round after delay
    setTimeout(() => {
      startWaitingPhase();
    }, 3000);
  };

  const handleBet = async (amount: number) => {
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to place this bet.');
      return;
    }

    console.log(`🎲 Placing bet: PKR ${amount}`);

    try {
      const betPlaced = await placeBet(amount, 'crash', 'Crash game bet placed');
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      console.log(`✅ Bet placed successfully: PKR ${amount} deducted`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);

      setBetAmount(amount);
      setHasBet(true);
    } catch (error) {
      console.error('❌ Error placing bet:', error);
      Alert.alert('Error', 'Failed to place bet. Please try again.');
    }
  };

  const handleCashOut = () => {
    if (!hasBet || cashedOut || gameState !== 'flying') return;

    setCashedOut(true);
    setCashOutMultiplier(currentMultiplier);

    const winAmount = Math.floor(betAmount * currentMultiplier);
    console.log(`💰 Cashing out: PKR ${betAmount} * ${currentMultiplier.toFixed(2)} = PKR ${winAmount}`);

    // Add winnings to balance
    if (winAmount > 0) {
      addWinnings(winAmount);
    }

    // Force balance refresh to ensure UI updates
    setTimeout(() => refreshBalance(), 500);

    Alert.alert(
      'Cashed Out!',
      `You cashed out at ${currentMultiplier.toFixed(2)}x\nYou won PKR ${winAmount}!`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>🚀 Crash</Text>
        <Text style={styles.subtitle}>Cash out before the rocket crashes!</Text>
      </View>

      {/* Game History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Crashes</Text>
        <View style={styles.historyGrid}>
          {gameHistory.map((crash, index) => (
            <View
              key={index}
              style={[
                styles.historyItem,
                { backgroundColor: crash >= 2 ? Colors.primary.neonCyan : Colors.primary.hotPink }
              ]}
            >
              <Text style={styles.historyText}>{crash.toFixed(2)}x</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Game Canvas Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Area</Text>
        <View style={styles.gameCanvas}>
          {/* Background */}
          <View style={styles.canvasBackground} />

          {/* Rocket */}
          <Animated.View
            style={[
              styles.rocket,
              {
                bottom: rocketY,
                left: gameState === 'waiting' ? '50%' : '20%',
                transform: [
                  { translateX: -15 },
                  { rotate: gameState === 'flying' ? '-45deg' : gameState === 'crashed' ? '45deg' : '0deg' },
                ]
              }
            ]}
          >
            <Text style={styles.rocketIcon}>🚀</Text>
          </Animated.View>

          {/* Multiplier Display */}
          <View style={styles.multiplierContainer}>
            {gameState === 'waiting' ? (
              <View style={styles.waitingContainer}>
                <Text style={styles.waitingText}>Next Round in</Text>
                <Text style={styles.waitingTime}>{waitingTime}s</Text>
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: multiplierScale }] }}>
                <Text style={[
                  styles.multiplierText,
                  {
                    color: gameState === 'crashed' ? Colors.primary.hotPink : Colors.primary.neonCyan,
                    fontSize: gameState === 'crashed' ? 28 : 36,
                  }
                ]}>
                  {currentMultiplier.toFixed(2)}x
                </Text>
                {gameState === 'crashed' && (
                  <Text style={styles.crashedText}>CRASHED!</Text>
                )}
              </Animated.View>
            )}
          </View>

          {/* Cash Out Button */}
          {gameState === 'flying' && hasBet && !cashedOut && (
            <TouchableOpacity style={styles.cashOutButton} onPress={handleCashOut}>
              <Text style={styles.cashOutText}>
                CASH OUT PKR {Math.floor(betAmount * currentMultiplier)}
              </Text>
            </TouchableOpacity>
          )}

          {/* Cashed Out Indicator */}
          {cashedOut && cashOutMultiplier && (
            <View style={styles.cashedOutIndicator}>
              <Text style={styles.cashedOutText}>
                Cashed out at {cashOutMultiplier.toFixed(2)}x
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Betting Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Place Your Bet</Text>
        {gameState === 'waiting' && !hasBet ? (
          <BettingPanel
            balance={balance}
            minBet={10}
            maxBet={balance || 1000}
            onBet={handleBet}
            disabled={gameState !== 'waiting'}
          />
        ) : (
          <View style={styles.betStatusContainer}>
            {hasBet && (
              <View style={styles.betStatus}>
                <Text style={styles.betStatusText}>
                  Bet: PKR {betAmount} {cashedOut ? `(Cashed out at ${cashOutMultiplier?.toFixed(2)}x)` : ''}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Game Instructions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Play</Text>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>• Place your bet before the round starts</Text>
          <Text style={styles.instructionText}>• Watch the rocket fly and multiplier increase</Text>
          <Text style={styles.instructionText}>• Cash out before the rocket crashes</Text>
          <Text style={styles.instructionText}>• The longer you wait, the higher the multiplier</Text>
          <Text style={styles.instructionText}>• But be careful - the rocket can crash anytime!</Text>
        </View>
      </View>

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 15,
    paddingLeft: 5,
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  historyItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    minWidth: 50,
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  gameCanvas: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    height: 300,
    position: 'relative',
    borderWidth: 2,
    borderColor: Colors.primary.border,
    overflow: 'hidden',
  },
  canvasBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary.card,
  },
  rocket: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rocketIcon: {
    fontSize: 24,
  },
  multiplierContainer: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
  },
  waitingContainer: {
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 18,
    color: Colors.primary.textSecondary,
    marginBottom: 10,
  },
  waitingTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
  multiplierText: {
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  crashedText: {
    fontSize: 18,
    color: Colors.primary.hotPink,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  cashOutButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -75 }],
    backgroundColor: Colors.primary.gold,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    width: 150,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cashOutText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  cashedOutIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  cashedOutText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  betStatusContainer: {
    alignItems: 'center',
  },
  betStatus: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  betStatusText: {
    fontSize: 16,
    color: Colors.primary.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
