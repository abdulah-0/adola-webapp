// Aviator Crash Game for Adola App
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';
import { AdvancedGameLogicService } from '../../services/advancedGameLogicService';

const { width } = Dimensions.get('window');
const GAME_WIDTH = Math.min(width - 40, 400);
const GAME_HEIGHT = 300;

export default function AviatorGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings } = useWallet();
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

  const gameLogicService = AdvancedGameLogicService.getInstance();

  // Enhanced crash point generation with REDUCED maximum multipliers
  const generateHighMultiplierCrashPoint = (): number => {
    const random = Math.random();

    // Probability distribution for crash points - REDUCED MAX OUTPUTS
    if (random < 0.60) {
      // 60% chance: Low multipliers (1.0x - 2.5x) - INCREASED LOW RANGE
      return 1.0 + Math.random() * 1.5;
    } else if (random < 0.85) {
      // 25% chance: Medium multipliers (2.5x - 5.0x) - REDUCED
      return 2.5 + Math.random() * 2.5;
    } else if (random < 0.96) {
      // 11% chance: High multipliers (5.0x - 10.0x) - REDUCED
      return 5.0 + Math.random() * 5.0;
    } else if (random < 0.99) {
      // 3% chance: Very high multipliers (10.0x - 20.0x) - REDUCED FROM 200x
      return 10.0 + Math.random() * 10.0;
    } else {
      // 1% chance: Maximum multipliers (20.0x - 30.0x) - REDUCED FROM 1000x
      return 20.0 + Math.random() * 10.0;
    }
  };

  // Animation refs
  const planeX = useRef(new Animated.Value(50)).current;
  const planeY = useRef(new Animated.Value(250)).current;
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

  const generateCrashPoint = async (betAmount: number = 0): Promise<number> => {
    if (!user?.id || betAmount === 0) {
      // Enhanced fallback logic with higher multipliers
      return generateHighMultiplierCrashPoint();
    }

    try {
      // Use advanced game logic to determine crash point
      const gameResult = await gameLogicService.calculateAdvancedGameResult({
        betAmount,
        basePayout: 10, // Average aviator multiplier
        gameType: 'aviator',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { gameHistory }
      });

      let crashPoint: number;

      if (gameResult.won) {
        // Player should win - generate crash point higher than their likely cash out
        // Use enhanced distribution but ensure player can win
        const baseMultiplier = generateHighMultiplierCrashPoint();

        // Ensure crash point is high enough for player to cash out profitably
        const minCrashPoint = 2.0 + Math.random() * 3; // 2.0x - 5.0x minimum
        crashPoint = Math.max(minCrashPoint, baseMultiplier);

        // Occasionally give higher wins (2% chance for 15x+ when player should win) - REDUCED
        if (Math.random() < 0.02) {
          crashPoint = 15.0 + Math.random() * 15.0; // 15x - 30x - REDUCED FROM 1000x
        }
      } else {
        // Player should lose - but still use enhanced distribution for excitement
        // Just make it more likely to be lower
        const random = Math.random();
        if (random < 0.70) {
          crashPoint = 1.0 + Math.random() * 1.5; // 1.0x - 2.5x (70% chance)
        } else if (random < 0.90) {
          crashPoint = 1.5 + Math.random() * 2.5; // 1.5x - 4.0x (20% chance)
        } else {
          // Even when player should lose, occasionally show high multipliers for excitement
          crashPoint = generateHighMultiplierCrashPoint();
        }
      }

      // Ensure crash point is within reasonable bounds (now up to 1000x!)
      crashPoint = Math.max(1.01, Math.min(1000.0, crashPoint));

      console.log(`✈️ Aviator: Win probability: ${(gameWinProbability * 100).toFixed(1)}%, Crash point: ${crashPoint.toFixed(2)}x, Should win: ${gameResult.won}`);
      console.log(`📊 Adjusted probability: ${((gameResult.adjustedProbability || 0) * 100).toFixed(1)}%, House edge: ${((gameResult.houseEdge || 0) * 100).toFixed(1)}%`);

      // Log the game result for analytics
      await gameLogicService.logGameResult(user.id, 'aviator', {
        ...gameResult,
        won: false, // Will be updated when player cashes out or crashes
        winAmount: 0, // Will be updated when player cashes out
        multiplier: crashPoint
      }, {
        crashPoint,
        gameHistory: gameHistory.slice(-5), // Last 5 games
        adjustedProbability: gameResult.adjustedProbability,
        houseEdge: gameResult.houseEdge
      });

      return crashPoint;
    } catch (error) {
      console.error('❌ Error generating Aviator crash point:', error);
      // Fallback to enhanced distribution
      return generateHighMultiplierCrashPoint();
    }
  };

  const startWaitingPhase = () => {
    setGameState('waiting');
    setCurrentMultiplier(1.0);
    setCrashPoint(null);
    setHasBet(false);
    setCashedOut(false);
    setCashOutMultiplier(null);
    setWaitingTime(5);

    // Reset plane position
    planeX.setValue(50);
    planeY.setValue(250);
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

  const startFlyingPhase = async () => {
    setGameState('flying');
    const newCrashPoint = await generateCrashPoint(betAmount);
    setCrashPoint(newCrashPoint);

    // Start plane animation with capped duration for very high multipliers
    const animationDuration = Math.min(newCrashPoint * 2000, 60000); // Cap at 60 seconds max
    Animated.parallel([
      Animated.timing(planeX, {
        toValue: GAME_WIDTH - 50,
        duration: animationDuration,
        useNativeDriver: false,
      }),
      Animated.timing(planeY, {
        toValue: 50,
        duration: animationDuration,
        useNativeDriver: false,
      }),
    ]).start();

    // Start multiplier counter with dynamic increment speed
    let multiplier = 1.0;
    gameLoopRef.current = setInterval(() => {
      // Dynamic increment based on current multiplier for faster progression at higher levels
      let increment = 0.01;
      if (multiplier > 100) {
        increment = 0.5; // Much faster increment for 100x+
      } else if (multiplier > 50) {
        increment = 0.2; // Faster increment for 50x+
      } else if (multiplier > 20) {
        increment = 0.05; // Slightly faster for 20x+
      } else if (multiplier > 10) {
        increment = 0.02; // Slightly faster for 10x+
      }

      multiplier += increment;
      setCurrentMultiplier(multiplier);

      // Animate multiplier scale
      Animated.sequence([
        Animated.timing(multiplierScale, {
          toValue: 1.1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(multiplierScale, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Check if crashed
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
      // Special messages for very high multipliers
      let crashMessage = `The plane crashed at ${finalMultiplier.toFixed(2)}x\nYou lost PKR ${betAmount.toLocaleString()}`;

      if (finalMultiplier >= 500) {
        crashMessage = `🚀 INCREDIBLE! The plane reached ${finalMultiplier.toFixed(2)}x before crashing!\n💸 You lost PKR ${betAmount.toLocaleString()} but witnessed history!`;
      } else if (finalMultiplier >= 100) {
        crashMessage = `🔥 AMAZING! The plane soared to ${finalMultiplier.toFixed(2)}x!\n💸 You lost PKR ${betAmount.toLocaleString()} but what a ride!`;
      } else if (finalMultiplier >= 50) {
        crashMessage = `⭐ WOW! The plane reached ${finalMultiplier.toFixed(2)}x!\n💸 You lost PKR ${betAmount.toLocaleString()}`;
      }

      Alert.alert('Crashed!', crashMessage, [{ text: 'OK' }]);
    } else if (finalMultiplier >= 100) {
      // Show excitement even if no bet was placed
      Alert.alert(
        '🚀 INCREDIBLE FLIGHT!',
        `The plane reached an amazing ${finalMultiplier.toFixed(2)}x multiplier!`,
        [{ text: 'WOW!' }]
      );
    }

    // Start next round after delay
    setTimeout(() => {
      startWaitingPhase();
    }, 3000);
  };

  const handleBet = async (amount: number) => {
    if (gameState !== 'waiting' || hasBet) return;

    try {
      // Check if user can place bet using advanced game logic
      if (!gameLogicService.canPlayGame(amount, balance || 0, 'aviator')) {
        const message = gameLogicService.getBalanceValidationMessage(amount, balance || 0, 'aviator');
        Alert.alert('Cannot Place Bet', message);
        return;
      }

      if (!user?.id) {
        Alert.alert('Error', 'User not found. Please try again.');
        return;
      }

      // Calculate win probability using advanced game logic
      const { probability, engagementBonus: bonus } = await gameLogicService.calculateWinProbability({
        betAmount: amount,
        basePayout: 10, // Average aviator multiplier
        gameType: 'aviator',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { gameHistory }
      });

      setGameWinProbability(probability);
      setEngagementBonus(bonus);

      console.log(`🎯 Aviator Game: Win probability ${(probability * 100).toFixed(1)}%, Bet: PKR ${amount}`);
      if (bonus) {
        console.log(`🎯 Engagement bonus: ${bonus}`);
      }

      // Deduct bet amount immediately
      const betPlaced = await placeBet(amount, 'aviator', 'Aviator bet placed');
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      setBetAmount(amount);
      setHasBet(true);
    } catch (error) {
      console.error('❌ Error placing Aviator bet:', error);
      Alert.alert('Error', 'Failed to place bet. Please try again.');
    }
  };

  const handleCashOut = async () => {
    if (gameState !== 'flying' || !hasBet || cashedOut) return;

    try {
      setCashedOut(true);
      setCashOutMultiplier(currentMultiplier);

      const winAmount = Math.floor(betAmount * currentMultiplier);

      // Add winnings to balance
      await addWinnings(winAmount, 'aviator', `Aviator cash out at ${currentMultiplier.toFixed(2)}x`);

      // Update game result analytics for successful cash out
      if (user?.id) {
        await gameLogicService.logGameResult(user.id, 'aviator', {
          won: true,
          multiplier: currentMultiplier,
          winAmount,
          betAmount,
          newBalance: (balance || 0) + winAmount - betAmount,
          adjustedProbability: gameWinProbability,
          houseEdge: gameLogicService.getGameConfig('aviator').houseEdge,
          engagementBonus
        }, {
          crashPoint: crashPoint || 0,
          cashOutMultiplier: currentMultiplier,
          gameHistory: gameHistory.slice(-5),
          adjustedProbability: gameWinProbability
        });
      }

      let message = `You cashed out at ${currentMultiplier.toFixed(2)}x\nYou won PKR ${winAmount.toLocaleString()}!`;
      if (engagementBonus) {
        message += `\n\n🎯 ${engagementBonus}`;
      }

      Alert.alert('Cashed Out!', message, [{ text: 'OK' }]);
    } catch (error) {
      console.error('❌ Error in Aviator cash out:', error);
      Alert.alert('Error', 'An error occurred while cashing out.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✈️ Aviator</Text>
      <Text style={styles.subtitle}>Cash out before the plane crashes!</Text>

      {/* Game History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Crashes:</Text>
        <View style={styles.historyList}>
          {gameHistory.map((crash, index) => {
            // Dynamic colors based on multiplier ranges
            let backgroundColor = Colors.primary.hotPink; // Default for < 2x
            if (crash >= 500) {
              backgroundColor = '#FFD700'; // Gold for 500x+
            } else if (crash >= 100) {
              backgroundColor = '#FF6B35'; // Orange-red for 100x+
            } else if (crash >= 50) {
              backgroundColor = '#FF1744'; // Red for 50x+
            } else if (crash >= 10) {
              backgroundColor = '#9C27B0'; // Purple for 10x+
            } else if (crash >= 2) {
              backgroundColor = Colors.primary.neonCyan; // Cyan for 2x+
            }

            return (
              <View
                key={index}
                style={[
                  styles.historyItem,
                  { backgroundColor }
                ]}
              >
                <Text style={[
                  styles.historyText,
                  { fontSize: crash >= 100 ? 10 : 12 } // Smaller font for very high multipliers
                ]}>
                  {crash >= 100 ? crash.toFixed(0) : crash.toFixed(2)}x
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Game Canvas */}
      <View style={[styles.gameCanvas, { width: GAME_WIDTH, height: GAME_HEIGHT }]}>
        {/* Background */}
        <View style={styles.canvasBackground} />

        {/* Plane */}
        {gameState !== 'waiting' && (
          <Animated.View
            style={[
              styles.plane,
              {
                left: planeX,
                top: planeY,
                transform: [
                  { rotate: gameState === 'flying' ? '-15deg' : '45deg' },
                  { scale: gameState === 'crashed' ? 0.5 : 1 },
                ],
              }
            ]}
          >
            <Text style={styles.planeIcon}>✈️</Text>
          </Animated.View>
        )}

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
                  fontSize: gameState === 'crashed' ? 32 : 48,
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
              CASH OUT Rs {Math.floor((betAmount || 0) * (currentMultiplier || 1)).toLocaleString()}
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
            Bet: Rs {(betAmount || 0).toLocaleString()} {cashedOut ? `(Cashed out at ${(cashOutMultiplier || 0).toFixed(2)}x)` : ''}
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
  plane: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planeIcon: {
    fontSize: 24,
  },
  multiplierContainer: {
    position: 'absolute',
    top: '50%',
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
