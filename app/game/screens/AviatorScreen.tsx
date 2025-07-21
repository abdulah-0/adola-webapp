// Enhanced Aviator Game Screen for Adola App - Exact Original Implementation
// Real-time multiplayer crash game with advanced features
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import { useApp } from '../../../contexts/AppContext';
import { useWallet } from '../../../contexts/WalletContext';
import GameLogicService from '../../../services/gameLogicService';

const { width, height } = Dimensions.get('window');

// Aviator Game Types (Original)
interface AviatorPlayer {
  playerId: string;
  username: string;
  betAmount: number;
  cashOutMultiplier: number | null;
  winAmount: number;
  isActive: boolean;
  isCashedOut: boolean;
  position: number;
  totalWins: number;
  totalLosses: number;
  biggestWin: number;
  averageMultiplier: number;
}

interface AviatorRound {
  roundId: string;
  crashMultiplier: number;
  duration: number;
  players: AviatorPlayer[];
  startTime: Date;
  endTime: Date | null;
  status: 'waiting' | 'flying' | 'crashed';
}

interface AviatorGameState {
  gameId: string;
  gameType: 'aviator';
  currentRound: AviatorRound | null;
  roundHistory: AviatorRound[];
  players: AviatorPlayer[];
  gameStatus: 'waiting' | 'betting' | 'flying' | 'crashed';
  currentMultiplier: number;
  nextRoundStartTime: Date | null;
  gameSettings: {
    minBet: number;
    maxBet: number;
    bettingTime: number;
    maxMultiplier: number;
    crashProbability: number;
  };
}

export default function AviatorScreen() {
  const router = useRouter();
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings } = useWallet();

  // Aviator Game State
  const [gameState, setGameState] = useState<AviatorGameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<AviatorPlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [hasBet, setHasBet] = useState(false);
  const [isCashedOut, setIsCashedOut] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'betting' | 'flying' | 'crashed'>('waiting');
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [roundHistory, setRoundHistory] = useState<number[]>([]);

  // Animation refs
  const multiplierAnim = useRef(new Animated.Value(1)).current;
  const planeAnim = useRef(new Animated.Value(0)).current;

  // Initialize Aviator game
  useEffect(() => {
    initializeAviatorGame();
    startGameLoop();
  }, []);

  const initializeAviatorGame = () => {
    const players: AviatorPlayer[] = [
      {
        playerId: 'player1',
        username: 'You',
        betAmount: 0,
        cashOutMultiplier: null,
        winAmount: 0,
        isActive: false,
        isCashedOut: false,
        position: 1,
        totalWins: 0,
        totalLosses: 0,
        biggestWin: 0,
        averageMultiplier: 0,
      },
    ];

    const newGameState: AviatorGameState = {
      gameId: 'aviator_' + Date.now(),
      gameType: 'aviator',
      currentRound: null,
      roundHistory: [],
      players,
      gameStatus: 'waiting',
      currentMultiplier: 1.0,
      nextRoundStartTime: new Date(Date.now() + 10000),
      gameSettings: {
        minBet: 1,
        maxBet: 1000,
        bettingTime: 10,
        maxMultiplier: 100,
        crashProbability: 0.01,
      },
    };

    setGameState(newGameState);
    setCurrentPlayer(players[0]);
    setIsLoading(false);
  };

  const startGameLoop = () => {
    // Betting phase
    setGamePhase('betting');
    setTimeLeft(10);
    setCurrentMultiplier(1.0);
    setHasBet(false);
    setIsCashedOut(false);

    const bettingTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(bettingTimer);
          startFlyingPhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startFlyingPhase = () => {
    setGamePhase('flying');

    // Use centralized game logic to determine if player should win
    const shouldWin = hasBet ? GameLogicService.shouldWin() : true;

    // Generate crash point based on win/loss determination
    let crashPoint: number;
    if (shouldWin && hasBet) {
      // Player should win - crash after a reasonable multiplier
      crashPoint = 2 + Math.random() * 8; // 2x to 10x for wins
    } else {
      // Player should lose or no bet - crash early
      crashPoint = 1.1 + Math.random() * 1.4; // 1.1x to 2.5x for losses
    }

    // Start multiplier animation
    let multiplier = 1.0;
    const increment = 0.01;
    const intervalTime = 100;

    const flyingTimer = setInterval(() => {
      multiplier += increment;
      setCurrentMultiplier(multiplier);

      // Animate multiplier
      Animated.timing(multiplierAnim, {
        toValue: 1.1,
        duration: 50,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(multiplierAnim, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }).start();
      });

      // Check if crashed
      if (multiplier >= crashPoint) {
        clearInterval(flyingTimer);
        crashPlane(crashPoint);
      }
    }, intervalTime);
  };

  const crashPlane = (crashMultiplier: number) => {
    setGamePhase('crashed');
    setCurrentMultiplier(crashMultiplier);
    
    // Add to history
    setRoundHistory(prev => [crashMultiplier, ...prev.slice(0, 9)]);

    // Process results
    if (hasBet && !isCashedOut) {
      // Player lost
      Alert.alert(
        '✈️ CRASHED!',
        `The plane crashed at ${crashMultiplier.toFixed(2)}x\nYou lost PKR ${betAmount}`,
        [{ text: 'Next Round' }]
      );
    }

    // Start next round after delay
    setTimeout(() => {
      startGameLoop();
    }, 5000);
  };

  const handlePlaceBet = async (amount: number) => {
    if (gamePhase !== 'betting') {
      Alert.alert('Betting Closed', 'Betting is not available right now');
      return;
    }

    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    const betValidation = GameLogicService.validateBetAmount(amount, 'aviator');
    if (!betValidation.valid) {
      Alert.alert('Invalid Bet Amount', betValidation.message);
      return;
    }

    try {
      // Step 1: Deduct bet amount immediately
      const betPlaced = await placeBet(amount, 'aviator', 'Aviator bet placed');

      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      setBetAmount(amount);
      setHasBet(true);
    } catch (error) {
      console.error('❌ Error placing bet:', error);
      Alert.alert('Error', 'Failed to place bet. Please try again.');
    }
  };

  const handleCashOut = async () => {
    if (gamePhase !== 'flying' || !hasBet || isCashedOut) return;

    setIsCashedOut(true);
    const winAmount = Math.floor(betAmount * currentMultiplier);

    // Step 2: Add winnings (bet was already deducted when placed)
    await addWinnings(
      winAmount,
      'aviator',
      `Aviator cash out at ${currentMultiplier.toFixed(2)}x`
    );

    setTotalWinnings(prev => prev + (winAmount - betAmount));

    Alert.alert(
      '💰 CASHED OUT!',
      `You cashed out at ${currentMultiplier.toFixed(2)}x\nYou won PKR ${winAmount}!`,
      [{ text: 'NICE!' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Aviator...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>✈️ Aviator</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Text style={styles.headerButtonText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Text style={styles.headerButtonText}>Leave</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Aviator Game Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>✈️ Aviator Game</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Game Phase:</Text>
          <Text style={[styles.statValue, { 
            color: gamePhase === 'flying' ? Colors.primary.neonCyan : 
                  gamePhase === 'betting' ? Colors.primary.gold : Colors.primary.hotPink 
          }]}>
            {gamePhase.toUpperCase()}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Current Balance:</Text>
          <Text style={[styles.statValue, { color: Colors.primary.gold, fontSize: 16, fontWeight: 'bold' }]}>
            PKR {(balance || 0).toLocaleString()}
          </Text>
        </View>
        {gamePhase === 'betting' && (
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Betting Time:</Text>
            <Text style={[styles.statValue, { color: Colors.primary.hotPink }]}>
              {timeLeft}s
            </Text>
          </View>
        )}
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Total Winnings:</Text>
          <Text style={[styles.statValue, { color: Colors.primary.neonCyan, fontSize: 14, fontWeight: 'bold' }]}>
            +{(totalWinnings || 0).toLocaleString()} coins
          </Text>
        </View>
      </View>

      {/* Aviator Game Board */}
      <View style={styles.gameBoard}>
        <Text style={styles.gameBoardTitle}>✈️ Flight Zone</Text>
        
        {/* Multiplier Display */}
        <Animated.View style={[styles.multiplierContainer, { transform: [{ scale: multiplierAnim }] }]}>
          <Text style={[
            styles.multiplierText,
            {
              color: gamePhase === 'crashed' ? Colors.primary.hotPink :
                    currentMultiplier > 5 ? Colors.primary.gold : Colors.primary.neonCyan,
              fontSize: gamePhase === 'crashed' ? 32 : currentMultiplier > 10 ? 48 : 40,
            }
          ]}>
            {currentMultiplier.toFixed(2)}x
          </Text>
          {gamePhase === 'crashed' && (
            <Text style={styles.crashedText}>CRASHED!</Text>
          )}
        </Animated.View>

        {/* Game Status */}
        <View style={styles.gameStatus}>
          {gamePhase === 'betting' && (
            <Text style={styles.statusText}>🎯 Place your bets! ({timeLeft}s)</Text>
          )}
          {gamePhase === 'flying' && (
            <Text style={styles.statusText}>✈️ Plane is flying! Cash out anytime!</Text>
          )}
          {gamePhase === 'crashed' && (
            <Text style={styles.statusText}>💥 Plane crashed! Next round starting...</Text>
          )}
        </View>
      </View>

      {/* Betting Controls */}
      <View style={styles.bettingCard}>
        <Text style={styles.bettingTitle}>✈️ Flight Controls</Text>
        
        {/* Bet Status */}
        {hasBet && (
          <View style={styles.betStatus}>
            <Text style={styles.betStatusText}>
              Bet: {betAmount} coins {isCashedOut ? '(Cashed Out)' : '(Active)'}
            </Text>
          </View>
        )}

        {/* Betting Buttons */}
        {gamePhase === 'betting' && !hasBet && (
          <View style={styles.quickBetsContainer}>
            <Text style={styles.quickBetsLabel}>Quick Bets:</Text>
            <View style={styles.quickBetsButtons}>
              {[10, 25, 50, 100].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickBetButton,
                    amount > balance && styles.quickBetButtonDisabled
                  ]}
                  onPress={() => handlePlaceBet(amount)}
                  disabled={amount > balance}
                >
                  <Text style={[
                    styles.quickBetButtonText,
                    amount > balance && styles.quickBetButtonTextDisabled
                  ]}>PKR {amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Cash Out Button */}
        {gamePhase === 'flying' && hasBet && !isCashedOut && (
          <TouchableOpacity style={styles.cashOutButton} onPress={handleCashOut}>
            <Text style={styles.cashOutButtonText}>
              CASH OUT {Math.floor((betAmount || 0) * (currentMultiplier || 1))} coins
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Game Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>✈️ How to Play Aviator</Text>
        <Text style={styles.infoText}>
          • 🎯 Place your bet before the plane takes off{'\n'}
          • ✈️ Watch the multiplier increase as the plane flies{'\n'}
          • 💰 Cash out anytime to secure your winnings{'\n'}
          • 💥 If the plane crashes before you cash out, you lose{'\n'}
          • 🎮 Higher multipliers = higher risk and reward{'\n'}
          • 🏆 Time your cash out perfectly for maximum wins{'\n'}
          • 🎨 Real-time multiplayer crash game
        </Text>
        <Text style={styles.enhancedNote}>
          ✈️ The higher you fly, the bigger the risk and reward!
        </Text>
      </View>

      {/* Round History */}
      {showHistory && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>📊 Round History</Text>
          <View style={styles.historyList}>
            {roundHistory.map((crash, index) => (
              <View
                key={index}
                style={[
                  styles.historyItem,
                  {
                    backgroundColor: crash >= 10 ? Colors.primary.gold :
                                   crash >= 5 ? Colors.primary.neonCyan :
                                   crash >= 2 ? Colors.primary.hotPink : Colors.primary.textMuted,
                  }
                ]}
              >
                <Text style={styles.historyText}>{crash.toFixed(2)}x</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.primary.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  headerButtonText: {
    color: Colors.primary.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
  },
  statsCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  gameBoard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
    minHeight: 200,
  },
  gameBoardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  multiplierContainer: {
    alignItems: 'center',
    marginVertical: 20,
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
  gameStatus: {
    alignItems: 'center',
    marginTop: 20,
  },
  statusText: {
    fontSize: 16,
    color: Colors.primary.text,
    textAlign: 'center',
  },
  bettingCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  bettingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  betStatus: {
    backgroundColor: Colors.primary.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  betStatusText: {
    fontSize: 16,
    color: Colors.primary.text,
    fontWeight: 'bold',
  },
  quickBetsContainer: {
    marginBottom: 20,
  },
  quickBetsLabel: {
    fontSize: 16,
    color: Colors.primary.text,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  quickBetsButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  quickBetButton: {
    flex: 1,
    backgroundColor: Colors.primary.neonCyan,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickBetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  quickBetButtonDisabled: {
    backgroundColor: Colors.primary.border,
    opacity: 0.5,
  },
  quickBetButtonTextDisabled: {
    color: Colors.primary.textSecondary,
  },
  cashOutButton: {
    backgroundColor: Colors.primary.gold,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  cashOutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  infoCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    lineHeight: 20,
    marginBottom: 15,
  },
  enhancedNote: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    textAlign: 'center',
  },
  historyCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  historyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  historyItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
