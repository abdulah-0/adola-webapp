// Roll Master Game for Adola App (Bomb Crash Game)
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
import WebRollMasterGame from './web/WebRollMasterGame';

const { width } = Dimensions.get('window');
const GAME_WIDTH = Math.min(width - 40, 350);

export default function RollMasterGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    return <WebRollMasterGame />;
  }

  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings } = useWallet();
  const [gameState, setGameState] = useState<'waiting' | 'rolling' | 'exploded'>('waiting');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [explosionPoint, setExplosionPoint] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(0);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashOutMultiplier, setCashOutMultiplier] = useState<number | null>(null);
  const [gameHistory, setGameHistory] = useState<number[]>([]);
  const [waitingTime, setWaitingTime] = useState(5);

  // Animation refs
  const bombScale = useRef(new Animated.Value(1)).current;
  const bombRotation = useRef(new Animated.Value(0)).current;
  const multiplierPulse = useRef(new Animated.Value(1)).current;

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

  const generateExplosionPoint = (shouldPlayerWin: boolean) => {
    // Generate explosion point based on win rate requirement (20% win rate)
    if (shouldPlayerWin && hasBet) {
      // Player should win - explosion point should be higher to allow cash out
      const random = Math.random();
      if (random < 0.5) return 2.0 + Math.random() * 3.0; // 2.0x - 5.0x (50% chance)
      if (random < 0.8) return 5.0 + Math.random() * 5.0; // 5.0x - 10.0x (30% chance)
      return 10.0 + Math.random() * 15.0; // 10.0x - 25.0x (20% chance)
    } else {
      // Player should lose or no bet - explosion point should be lower
      const random = Math.random();
      if (random < 0.6) return 1.0 + Math.random() * 0.8; // 1.0x - 1.8x (60% chance)
      if (random < 0.9) return 1.8 + Math.random() * 1.2; // 1.8x - 3.0x (30% chance)
      return 3.0 + Math.random() * 2.0; // 3.0x - 5.0x (10% chance)
    }
  };

  const startWaitingPhase = () => {
    setGameState('waiting');
    setCurrentMultiplier(1.0);
    setExplosionPoint(null);
    setHasBet(false);
    setCashedOut(false);
    setCashOutMultiplier(null);
    setWaitingTime(5);

    // Reset animations
    bombScale.setValue(1);
    bombRotation.setValue(0);
    multiplierPulse.setValue(1);

    // Countdown timer
    waitingTimerRef.current = setInterval(() => {
      setWaitingTime(prev => {
        if (prev <= 1) {
          if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
          startRollingPhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRollingPhase = () => {
    setGameState('rolling');

    // Determine if player should win (20% win rate)
    const shouldPlayerWin = Math.random() < 0.2;
    const newExplosionPoint = generateExplosionPoint(shouldPlayerWin);
    setExplosionPoint(newExplosionPoint);

    // Start bomb animations
    Animated.loop(
      Animated.timing(bombRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bombScale, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(bombScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Start multiplier counter
    let multiplier = 1.0;
    const increment = 0.01;
    const intervalTime = 100;

    gameLoopRef.current = setInterval(() => {
      multiplier += increment;
      setCurrentMultiplier(multiplier);

      // Animate multiplier pulse
      Animated.sequence([
        Animated.timing(multiplierPulse, {
          toValue: 1.1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(multiplierPulse, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Check if exploded
      if (multiplier >= newExplosionPoint) {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        explodeGame(newExplosionPoint);
      }
    }, intervalTime);
  };

  const explodeGame = (finalMultiplier: number) => {
    setGameState('exploded');
    setCurrentMultiplier(finalMultiplier);
    
    // Stop animations
    bombRotation.stopAnimation();
    bombScale.stopAnimation();
    
    // Explosion animation
    Animated.sequence([
      Animated.timing(bombScale, {
        toValue: 2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bombScale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Add to history
    setGameHistory(prev => [finalMultiplier, ...prev.slice(0, 9)]);

    // Process game result if user had a bet
    if (hasBet && !cashedOut) {
      // User lost - bet was already deducted when placed
      Alert.alert(
        'BOOM! 💥',
        `The bomb exploded at ${finalMultiplier.toFixed(2)}x\nYou lost PKR ${betAmount}`,
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
    const betPlaced = await placeBet(amount, 'rollmaster', 'Roll Master bet placed');
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      return;
    }

    setBetAmount(amount);
    setHasBet(true);
  };

  const handleCashOut = async () => {
    if (gameState !== 'rolling' || !hasBet || cashedOut) return;

    setCashedOut(true);
    setCashOutMultiplier(currentMultiplier);

    const winAmount = Math.floor(betAmount * currentMultiplier);

    // Add winnings to balance
    await addWinnings(winAmount, 'rollmaster', `Roll Master cash out at ${currentMultiplier.toFixed(2)}x`);

    Alert.alert(
      'Cashed Out! 💰',
      `You cashed out at ${currentMultiplier.toFixed(2)}x\nYou won PKR ${winAmount}!`,
      [{ text: 'OK' }]
    );
  };

  const getBombEmoji = () => {
    if (gameState === 'exploded') return '💥';
    if (gameState === 'rolling') {
      return currentMultiplier > 5 ? '💣' : '🧨';
    }
    return '💣';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💣 Roll Master</Text>
      <Text style={styles.subtitle}>Cash out before the bomb explodes!</Text>

      {/* Game History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Explosions:</Text>
        <View style={styles.historyList}>
          {gameHistory.map((explosion, index) => (
            <View
              key={index}
              style={[
                styles.historyItem,
                { backgroundColor: explosion >= 5 ? Colors.primary.gold : 
                                  explosion >= 2 ? Colors.primary.neonCyan : Colors.primary.hotPink }
              ]}
            >
              <Text style={styles.historyText}>{explosion.toFixed(2)}x</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Game Canvas */}
      <View style={[styles.gameCanvas, { width: GAME_WIDTH, height: 250 }]}>
        {/* Background */}
        <View style={styles.canvasBackground} />

        {/* Bomb */}
        <View style={styles.bombContainer}>
          <Animated.View
            style={[
              styles.bomb,
              {
                transform: [
                  { scale: bombScale },
                  { rotate: bombRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  })}
                ]
              }
            ]}
          >
            <Text style={styles.bombEmoji}>{getBombEmoji()}</Text>
          </Animated.View>
        </View>

        {/* Multiplier Display */}
        <View style={styles.multiplierContainer}>
          {gameState === 'waiting' ? (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>Next Round in</Text>
              <Text style={styles.waitingTime}>{waitingTime}s</Text>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ scale: multiplierPulse }] }}>
              <Text style={[
                styles.multiplierText,
                {
                  color: gameState === 'exploded' ? Colors.primary.hotPink : 
                        currentMultiplier > 5 ? Colors.primary.gold : Colors.primary.neonCyan,
                  fontSize: gameState === 'exploded' ? 28 : 
                           currentMultiplier > 10 ? 40 : 36,
                }
              ]}>
                {currentMultiplier.toFixed(2)}x
              </Text>
              {gameState === 'exploded' && (
                <Text style={styles.explodedText}>EXPLODED!</Text>
              )}
            </Animated.View>
          )}
        </View>

        {/* Cash Out Button */}
        {gameState === 'rolling' && hasBet && !cashedOut && (
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
  bombContainer: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  bomb: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bombEmoji: {
    fontSize: 48,
  },
  multiplierContainer: {
    position: 'absolute',
    bottom: '30%',
    left: '50%',
    transform: [{ translateX: -50 }],
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
  explodedText: {
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
