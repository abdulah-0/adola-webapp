// Web-specific Roll Master Game - Vertically Scrollable Layout
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

const { width } = Dimensions.get('window');

export default function WebRollMasterGame() {
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
    if (shouldPlayerWin) {
      // Higher chance of good multipliers for winning players - REDUCED MAX OUTPUTS
      const random = Math.random();
      if (random < 0.5) return 1.5 + Math.random() * 1.5; // 50%: 1.5-3x - REDUCED
      if (random < 0.8) return 3.0 + Math.random() * 2.0; // 30%: 3-5x - REDUCED
      if (random < 0.95) return 5.0 + Math.random() * 3.0; // 15%: 5-8x - REDUCED
      return 8.0 + Math.random() * 2.0; // 5%: 8-10x - REDUCED FROM 50x
    } else {
      // More likely to explode early for losing players
      const random = Math.random();
      if (random < 0.75) return 1.0 + Math.random() * 0.5; // 75%: 1-1.5x - REDUCED
      if (random < 0.95) return 1.5 + Math.random() * 1.0; // 20%: 1.5-2.5x - REDUCED
      return 2.5 + Math.random() * 1.0; // 5%: 2.5-3.5x - REDUCED
    }
  };

  const startWaitingPhase = () => {
    console.log('💣 Starting waiting phase');
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
    console.log('💣 Starting Roll Master game');
    
    // Simple explosion point generation for demo
    const shouldPlayerWin = Math.random() < 0.3; // 30% win rate
    const newExplosionPoint = generateExplosionPoint(shouldPlayerWin);
    setExplosionPoint(newExplosionPoint);
    setGameState('rolling');

    // Start bomb animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(bombScale, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(bombScale, {
          toValue: 1.0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(bombRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start();

    // Start multiplier counter
    let multiplier = 1.0;
    gameLoopRef.current = setInterval(() => {
      multiplier += 0.01;
      setCurrentMultiplier(multiplier);

      // Animate multiplier pulse
      Animated.sequence([
        Animated.timing(multiplierPulse, {
          toValue: 1.1,
          duration: 50,
          useNativeDriver: false,
        }),
        Animated.timing(multiplierPulse, {
          toValue: 1.0,
          duration: 50,
          useNativeDriver: false,
        }),
      ]).start();

      if (multiplier >= newExplosionPoint) {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        explodeGame(newExplosionPoint);
      }
    }, 100);
  };

  const explodeGame = (finalMultiplier: number) => {
    setGameState('exploded');
    setCurrentMultiplier(finalMultiplier);
    
    // Add to history
    setGameHistory(prev => [finalMultiplier, ...prev.slice(0, 9)]);

    // Stop animations
    bombScale.stopAnimation();
    bombRotation.stopAnimation();

    // Process game result if user had a bet
    if (hasBet && !cashedOut) {
      Alert.alert(
        'Exploded!',
        `The bomb exploded at ${finalMultiplier.toFixed(2)}x\nYou lost PKR ${betAmount}`,
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
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

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

  const getRiskLevel = () => {
    if (currentMultiplier < 2) return { level: 'Low', color: Colors.primary.neonCyan };
    if (currentMultiplier < 5) return { level: 'Medium', color: Colors.primary.gold };
    if (currentMultiplier < 10) return { level: 'High', color: Colors.primary.hotPink };
    return { level: 'Extreme', color: '#FF1744' };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>💣 Roll Master</Text>
        <Text style={styles.subtitle}>Cash out before the bomb explodes!</Text>
      </View>

      {/* Game History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Explosions</Text>
        <View style={styles.historyGrid}>
          {gameHistory.map((explosion, index) => (
            <View
              key={index}
              style={[
                styles.historyItem,
                {
                  backgroundColor: explosion >= 5 ? Colors.primary.gold :
                                  explosion >= 2 ? Colors.primary.neonCyan : Colors.primary.hotPink
                }
              ]}
            >
              <Text style={styles.historyText}>{explosion.toFixed(2)}x</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Game Statistics Section */}
      {gameState !== 'waiting' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Game</Text>
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current Multiplier:</Text>
              <Text style={[styles.multiplierValue, { color: getRiskLevel().color }]}>
                {currentMultiplier.toFixed(2)}x
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Risk Level:</Text>
              <Text style={[styles.riskValue, { color: getRiskLevel().color }]}>
                {getRiskLevel().level}
              </Text>
            </View>
            {hasBet && (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Bet Amount:</Text>
                  <Text style={styles.statValue}>PKR {betAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Potential Win:</Text>
                  <Text style={styles.winValue}>
                    PKR {Math.floor(betAmount * currentMultiplier).toLocaleString()}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* Game Canvas Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Area</Text>
        <View style={styles.gameCanvas}>
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
                    color: gameState === 'exploded' ? Colors.primary.hotPink : getRiskLevel().color,
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
                💰 CASH OUT PKR {Math.floor(betAmount * currentMultiplier).toLocaleString()}
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
                  Bet: PKR {betAmount.toLocaleString()}
                  {cashedOut ? ` (Cashed out at ${cashOutMultiplier?.toFixed(2)}x)` : ''}
                </Text>
              </View>
            )}
            {gameState === 'rolling' && (
              <View style={styles.gameActiveCard}>
                <Text style={styles.gameActiveText}>🎮 Game in Progress</Text>
                <Text style={styles.gameActiveSubtext}>
                  {hasBet ? 'Cash out anytime to secure your winnings!' : 'Watch the multiplier grow!'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Game Instructions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Play</Text>
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionText}>• Place your bet before the round starts</Text>
          <Text style={styles.instructionText}>• Watch the bomb and multiplier grow</Text>
          <Text style={styles.instructionText}>• Cash out before the bomb explodes</Text>
          <Text style={styles.instructionText}>• The longer you wait, the higher the multiplier</Text>
          <Text style={styles.instructionText}>• But be careful - the bomb can explode anytime!</Text>
          <Text style={styles.instructionText}>• Higher multipliers = higher risk of explosion</Text>
        </View>
      </View>

      {/* Strategy Tips Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strategy Tips</Text>
        <View style={styles.tipsCard}>
          <Text style={styles.tipText}>🎯 <Text style={styles.tipBold}>Conservative:</Text> Cash out at 2-3x for steady wins</Text>
          <Text style={styles.tipText}>⚡ <Text style={styles.tipBold}>Aggressive:</Text> Wait for 5-10x for bigger payouts</Text>
          <Text style={styles.tipText}>💡 <Text style={styles.tipBold}>Smart:</Text> Watch the risk level indicator</Text>
          <Text style={styles.tipText}>🎲 <Text style={styles.tipBold}>Risk Management:</Text> Set a target and stick to it</Text>
          <Text style={styles.tipText}>⏰ <Text style={styles.tipBold}>Timing:</Text> Early explosions are more common</Text>
        </View>
      </View>

      {/* Risk Levels Guide Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Risk Levels Guide</Text>
        <View style={styles.riskGuideCard}>
          <View style={styles.riskItem}>
            <View style={[styles.riskDot, { backgroundColor: Colors.primary.neonCyan }]} />
            <Text style={styles.riskLabel}>Low Risk (1.0x - 2.0x)</Text>
            <Text style={styles.riskDescription}>Safe zone, low explosion chance</Text>
          </View>
          <View style={styles.riskItem}>
            <View style={[styles.riskDot, { backgroundColor: Colors.primary.gold }]} />
            <Text style={styles.riskLabel}>Medium Risk (2.0x - 5.0x)</Text>
            <Text style={styles.riskDescription}>Moderate risk, good rewards</Text>
          </View>
          <View style={styles.riskItem}>
            <View style={[styles.riskDot, { backgroundColor: Colors.primary.hotPink }]} />
            <Text style={styles.riskLabel}>High Risk (5.0x - 10.0x)</Text>
            <Text style={styles.riskDescription}>Dangerous zone, high rewards</Text>
          </View>
          <View style={styles.riskItem}>
            <View style={[styles.riskDot, { backgroundColor: '#FF1744' }]} />
            <Text style={styles.riskLabel}>Extreme Risk (10.0x+)</Text>
            <Text style={styles.riskDescription}>Maximum danger, maximum rewards</Text>
          </View>
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
  statsCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  statValue: {
    fontSize: 14,
    color: Colors.primary.text,
    fontWeight: '600',
  },
  multiplierValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  riskValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  winValue: {
    fontSize: 14,
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
  },
  gameCanvas: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    height: 300,
    position: 'relative',
    borderWidth: 2,
    borderColor: Colors.primary.border,
    overflow: 'hidden',
    marginBottom: 20,
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
  explodedText: {
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
    marginBottom: 15,
  },
  betStatusText: {
    fontSize: 16,
    color: Colors.primary.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  gameActiveCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
    alignItems: 'center',
  },
  gameActiveText: {
    fontSize: 16,
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gameActiveSubtext: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  instructionsCard: {
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
  tipsCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  tipText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  riskGuideCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    flex: 1,
  },
  riskDescription: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  bottomPadding: {
    height: 40,
  },
});
