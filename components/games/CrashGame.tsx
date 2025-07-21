// Crash Game for Adola App
import React, { useState, useEffect, useRef } from 'react';
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
import WebCrashGame from './web/WebCrashGame';

const { width } = Dimensions.get('window');
const GAME_WIDTH = Math.min(width - 40, 350);

export default function CrashGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    return <WebCrashGame />;
  }

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

  // Animation refs
  const rocketY = useRef(new Animated.Value(200)).current;
  const multiplierScale = useRef(new Animated.Value(1)).current;

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
    // Generate crash point with realistic distribution
    const random = Math.random();
    if (random < 0.33) return 1.0 + Math.random() * 1.5; // 1.0x - 2.5x (33% chance)
    if (random < 0.66) return 2.5 + Math.random() * 2.5; // 2.5x - 5.0x (33% chance)
    if (random < 0.9) return 5.0 + Math.random() * 10; // 5.0x - 15.0x (24% chance)
    return 15.0 + Math.random() * 85; // 15.0x - 100.0x (10% chance)
  };

  const startWaitingPhase = () => {
    setGameState('waiting');
    setCurrentMultiplier(1.0);
    setCrashPoint(null);
    setHasBet(false);
    setCashedOut(false);
    setCashOutMultiplier(null);
    setWaitingTime(5);

    // Reset rocket position
    rocketY.setValue(200);
    multiplierScale.setValue(1);

    // Countdown timer
    waitingTimerRef.current = setInterval(() => {
      setWaitingTime(prev => {
        if (prev <= 1) {
          if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
          startFlyingPhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startFlyingPhase = () => {
    setGameState('flying');
    const newCrashPoint = generateCrashPoint();
    setCrashPoint(newCrashPoint);

    console.log(`🚀 Crash game flying phase started - hasBet: ${hasBet}, cashedOut: ${cashedOut}, crashPoint: ${newCrashPoint.toFixed(2)}x`);

    // Start rocket animation
    Animated.timing(rocketY, {
      toValue: 50,
      duration: newCrashPoint * 3000, // Longer flight for higher multipliers
      useNativeDriver: false,
    }).start();

    // Start multiplier counter
    let multiplier = 1.0;
    const increment = 0.01;
    const intervalTime = 50;

    gameLoopRef.current = setInterval(() => {
      multiplier += increment;
      setCurrentMultiplier(multiplier);

      // Animate multiplier scale
      Animated.sequence([
        Animated.timing(multiplierScale, {
          toValue: 1.05,
          duration: 25,
          useNativeDriver: true,
        }),
        Animated.timing(multiplierScale, {
          toValue: 1,
          duration: 25,
          useNativeDriver: true,
        }),
      ]).start();

      // Check if crashed
      if (multiplier >= newCrashPoint) {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        crashGame(newCrashPoint);
      }
    }, intervalTime);
  };

  const crashGame = (finalMultiplier: number) => {
    setGameState('crashed');
    setCurrentMultiplier(finalMultiplier);
    
    // Add to history
    setGameHistory(prev => [finalMultiplier, ...prev.slice(0, 9)]);

    // Animate rocket crash
    Animated.timing(rocketY, {
      toValue: 300,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Process game result if user had a bet
    if (hasBet && !cashedOut) {
      // User lost - bet was already deducted when placed
      Alert.alert(
        'Crashed!',
        `The rocket crashed at ${finalMultiplier.toFixed(2)}x\nYou lost PKR ${betAmount}`,
        [{ text: 'OK' }]
      );
    }

    // Start next round after delay
    setTimeout(() => {
      startWaitingPhase();
    }, 3000);
  };

  const handleBet = async (amount: number) => {
    if (gameState !== 'waiting' || hasBet) return;

    // Check if user can place bet
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    // Deduct bet amount immediately
    console.log(`Placing Crash bet: PKR ${amount}`);
    const betPlaced = await placeBet(amount, 'crash', 'Crash game bet placed');
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      return;
    }
    console.log(`Bet placed successfully: PKR ${amount} deducted`);

    // Force balance refresh to ensure UI updates
    setTimeout(() => refreshBalance(), 500);

    setBetAmount(amount);
    setHasBet(true);
  };

  const handleCashOut = async () => {
    if (gameState !== 'flying' || !hasBet || cashedOut) return;

    setCashedOut(true);
    setCashOutMultiplier(currentMultiplier);

    const winAmount = Math.floor(betAmount * currentMultiplier);

    // Add winnings to balance
    console.log(`Adding Crash winnings: PKR ${winAmount} for cash out at ${currentMultiplier.toFixed(2)}x`);
    const winningsAdded = await addWinnings(winAmount, 'crash', `Crash game cash out at ${currentMultiplier.toFixed(2)}x`);

    if (winningsAdded) {
      console.log(`Winnings added successfully: PKR ${winAmount}`);
    } else {
      console.log('Failed to add winnings');
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
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Crash</Text>
      <Text style={styles.subtitle}>Cash out before the rocket crashes!</Text>

      {/* Game History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Crashes:</Text>
        <View style={styles.historyList}>
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

      {/* Game Canvas */}
      <View style={[styles.gameCanvas, { width: GAME_WIDTH, height: 250 }]}>
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
        {(() => {
          const shouldShowButton = gameState === 'flying' && hasBet && !cashedOut;
          console.log(`💰 Cash out button check - gameState: ${gameState}, hasBet: ${hasBet}, cashedOut: ${cashedOut}, shouldShow: ${shouldShowButton}`);
          return shouldShowButton;
        })() && (
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

      {/* Betting Panel */}
      {gameState === 'waiting' && !hasBet && (
        <BettingPanel
          balance={balance}
          minBet={10}
          maxBet={balance || 1000}
          onBet={handleBet}
          disabled={gameState !== 'waiting'}
        />
      )}

      {/* Bet Status */}
      {hasBet && (
        <View style={styles.betStatus}>
          <Text style={styles.betStatusText}>
            Bet: PKR {betAmount} {cashedOut ? `(Cashed out at ${cashOutMultiplier?.toFixed(2)}x)` : ''}
          </Text>
        </View>
      )}
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
  historyContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 8,
  },
  historyList: {
    flexDirection: 'row',
    gap: 8,
  },
  historyItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  historyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  gameCanvas: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
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
    fontSize: 16,
    color: Colors.primary.textSecondary,
    marginBottom: 8,
  },
  waitingTime: {
    fontSize: 32,
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
    fontSize: 16,
    color: Colors.primary.hotPink,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  cashOutButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -75 }],
    backgroundColor: Colors.primary.gold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    width: 150,
    alignItems: 'center',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cashedOutText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  betStatus: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  betStatusText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
});
