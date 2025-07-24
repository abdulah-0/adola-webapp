// Enhanced Dice Game for Adola App
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';
import { AdvancedGameLogicService } from '../../services/advancedGameLogicService';
import { CustomNotificationService } from '../../services/customNotificationService';

const { width } = Dimensions.get('window');

export default function DiceGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [selectedNumber, setSelectedNumber] = useState(3);
  const [prediction, setPrediction] = useState<'over' | 'under'>('over');
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const gameLogicService = AdvancedGameLogicService.getInstance();
  const customNotificationService = CustomNotificationService.getInstance();

  // Game session tracking
  useEffect(() => {
    if (user?.id) {
      // Start game session when component mounts
      customNotificationService.startGameSession(user.id, 'dice');

      return () => {
        // End game session when component unmounts
        customNotificationService.endGameSession(user.id, 'dice');
      };
    }
  }, [user?.id]);

  // Update game session activity during gameplay
  const updateGameActivity = () => {
    if (user?.id) {
      customNotificationService.updateGameSessionActivity(user.id, 'dice');
    }
  };

  const playDiceGame = async (targetNumber: number, betType: 'over' | 'under', betAmount: number) => {
    if (!user?.id) {
      return {
        win: false,
        amount: 0,
        multiplier: 0,
        details: { diceResult: 1, targetNumber, betType }
      };
    }

    // Update game session activity
    updateGameActivity();

    // Calculate base multiplier based on bet type
    let baseMultiplier = 1;
    if (betType === 'over') {
      baseMultiplier = 6 / (6 - targetNumber); // Higher multiplier for harder bets
    } else {
      baseMultiplier = 6 / (targetNumber - 1); // Higher multiplier for harder bets
    }

    // Use advanced game logic service to determine win/loss
    const gameResult = await gameLogicService.calculateAdvancedGameResult({
      betAmount,
      basePayout: baseMultiplier,
      gameType: 'dice',
      userId: user.id,
      currentBalance: balance || 0,
      gameSpecificData: { targetNumber, betType }
    });

    // Generate dice result based on game result
    let diceResult: number;
    if (gameResult.won) {
      // Player won - generate favorable dice result
      if (betType === 'over') {
        // Need dice result > targetNumber
        const validResults = [];
        for (let i = targetNumber + 1; i <= 6; i++) {
          validResults.push(i);
        }
        diceResult = validResults.length > 0 ?
          validResults[Math.floor(Math.random() * validResults.length)] :
          Math.floor(Math.random() * 6) + 1;
      } else {
        // Need dice result < targetNumber
        const validResults = [];
        for (let i = 1; i < targetNumber; i++) {
          validResults.push(i);
        }
        diceResult = validResults.length > 0 ?
          validResults[Math.floor(Math.random() * validResults.length)] :
          Math.floor(Math.random() * 6) + 1;
      }
    } else {
      // Player lost - generate unfavorable dice result
      if (betType === 'over') {
        // Need dice result <= targetNumber
        const validResults = [];
        for (let i = 1; i <= targetNumber; i++) {
          validResults.push(i);
        }
        diceResult = validResults.length > 0 ?
          validResults[Math.floor(Math.random() * validResults.length)] :
          Math.floor(Math.random() * 6) + 1;
      } else {
        // Need dice result >= targetNumber
        const validResults = [];
        for (let i = targetNumber; i <= 6; i++) {
          validResults.push(i);
        }
        diceResult = validResults.length > 0 ?
          validResults[Math.floor(Math.random() * validResults.length)] :
          Math.floor(Math.random() * 6) + 1;
      }
    }

    // Log the game result for analytics
    await gameLogicService.logGameResult(user.id, 'dice', gameResult, {
      diceResult,
      targetNumber,
      betType,
      adjustedProbability: gameResult.adjustedProbability,
      houseEdge: gameResult.houseEdge
    });

    console.log(`🎲 Dice Game: Target ${targetNumber} ${betType}, Result: ${diceResult}, Won: ${gameResult.won}, Amount: PKR ${gameResult.winAmount}`);
    console.log(`📊 Adjusted probability: ${((gameResult.adjustedProbability || 0) * 100).toFixed(1)}%, House edge: ${((gameResult.houseEdge || 0) * 100).toFixed(1)}%`);

    return {
      win: gameResult.won,
      amount: gameResult.winAmount,
      multiplier: gameResult.multiplier,
      details: { diceResult, targetNumber, betType },
      engagementBonus: gameResult.engagementBonus
    };
  };

  const handleBet = async (betAmount: number) => {
    // Check if user has sufficient balance using advanced game logic
    if (!gameLogicService.canPlayGame(betAmount, balance || 0, 'dice')) {
      const message = gameLogicService.getBalanceValidationMessage(betAmount, balance || 0, 'dice');
      Alert.alert('Cannot Place Bet', message);
      return;
    }

    setIsPlaying(true);

    // Step 1: Deduct bet amount immediately
    const betPlaced = await placeBet(betAmount, 'dice', `Dice game bet - ${prediction} ${selectedNumber}`);
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      setIsPlaying(false);
      return;
    }

    // Force balance refresh to ensure UI updates
    setTimeout(() => refreshBalance(), 500);

    // Simulate dice roll delay
    setTimeout(async () => {
      try {
        const gameResult = await playDiceGame(selectedNumber, prediction, betAmount);

        // Step 2: Add winnings if player won
        if (gameResult.win && gameResult.amount > 0) {
          await addWinnings(
            gameResult.amount,
            'dice',
            `Dice game win - rolled ${gameResult.details.diceResult}`
          );

          // Force balance refresh to ensure UI updates
          setTimeout(() => refreshBalance(), 500);
        }

        setLastResult(gameResult);
        setIsPlaying(false);

        // Show result alert with engagement bonus if applicable
        if (gameResult.win) {
          let message = `Dice rolled ${gameResult.details.diceResult}!\nYou won PKR ${(gameResult.amount || 0).toLocaleString()}!`;
          if (gameResult.engagementBonus) {
            message += `\n\n🎯 ${gameResult.engagementBonus}`;
          }
          Alert.alert('You Won!', message, [{ text: 'OK' }]);
        } else {
          Alert.alert(
            'You Lost',
            `Dice rolled ${gameResult.details.diceResult}.\nBetter luck next time!`,
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('❌ Error in dice game:', error);
        setIsPlaying(false);
        Alert.alert('Error', 'An error occurred while playing the game. Please try again.');
      }
    }, 2000);
  };

  const getDiceEmoji = (number: number) => {
    const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return diceEmojis[number] || '🎲';
  };

  const getMultiplier = () => {
    if (prediction === 'over') {
      return (6 / (6 - selectedNumber)).toFixed(2);
    } else {
      return (6 / (selectedNumber - 1)).toFixed(2);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>🎲 Dice Game</Text>
      <Text style={styles.subtitle}>Predict if the dice will roll over or under your number</Text>

      {/* Number Selection */}
      <View style={styles.numberSelection}>
        <Text style={styles.sectionTitle}>Select Number (1-6):</Text>
        <View style={styles.numbersRow}>
          {[1, 2, 3, 4, 5, 6].map((number) => (
            <TouchableOpacity
              key={number}
              style={[
                styles.numberButton,
                selectedNumber === number && styles.selectedNumber
              ]}
              onPress={() => setSelectedNumber(number)}
            >
              <Text style={[
                styles.numberText,
                selectedNumber === number && styles.selectedNumberText
              ]}>
                {number}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Prediction Selection */}
      <View style={styles.predictionSelection}>
        <Text style={styles.sectionTitle}>Prediction:</Text>
        <View style={styles.predictionRow}>
          <TouchableOpacity
            style={[
              styles.predictionButton,
              prediction === 'over' && styles.selectedPrediction
            ]}
            onPress={() => setPrediction('over')}
          >
            <Text style={[
              styles.predictionText,
              prediction === 'over' && styles.selectedPredictionText
            ]}>
              Over {selectedNumber}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.predictionButton,
              prediction === 'under' && styles.selectedPrediction
            ]}
            onPress={() => setPrediction('under')}
          >
            <Text style={[
              styles.predictionText,
              prediction === 'under' && styles.selectedPredictionText
            ]}>
              Under {selectedNumber}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dice Display */}
      <View style={styles.diceContainer}>
        {isPlaying ? (
          <View style={styles.rollingDice}>
            <Text style={styles.rollingDiceEmoji}>🎲</Text>
            <Text style={styles.rollingText}>Rolling...</Text>
          </View>
        ) : lastResult ? (
          <View style={styles.diceResult}>
            <Text style={[
              styles.diceEmoji,
              { color: lastResult.win ? Colors.primary.neonCyan : Colors.primary.hotPink }
            ]}>
              {getDiceEmoji(lastResult.details.diceResult)}
            </Text>
            <Text style={[
              styles.resultText,
              { color: lastResult.win ? Colors.primary.neonCyan : Colors.primary.hotPink }
            ]}>
              {lastResult.win ? 'WIN!' : 'LOSE'} - Rolled {lastResult.details.diceResult}
            </Text>
            {lastResult.win && (
              <Text style={styles.winAmount}>+Rs {lastResult.amount.toLocaleString()}</Text>
            )}
          </View>
        ) : (
          <View style={styles.diceResult}>
            <Text style={styles.diceEmoji}>🎲</Text>
            <Text style={styles.waitingText}>Ready to roll!</Text>
          </View>
        )}
      </View>

      {/* Prediction Info */}
      <View style={styles.predictionInfo}>
        <Text style={styles.predictionInfoText}>
          Betting: {prediction.toUpperCase()} {selectedNumber}
        </Text>
        <Text style={styles.multiplierInfoText}>
          Multiplier: {getMultiplier()}x
        </Text>
      </View>

      {/* Betting Panel */}
      <BettingPanel
        balance={balance}
        minBet={10}
        maxBet={balance || 1000}
        onBet={handleBet}
        disabled={isPlaying}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  numberSelection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 12,
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numberButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  selectedNumber: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  numberText: {
    fontSize: 18,
    color: '#ffffff',
  },
  selectedNumberText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  predictionSelection: {
    margin: 16,
  },
  predictionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  predictionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  selectedPrediction: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  predictionText: {
    fontSize: 16,
    color: '#ffffff',
  },
  selectedPredictionText: {
    fontWeight: 'bold',
  },
  diceContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  rollingDice: {
    alignItems: 'center',
  },
  rollingText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 8,
  },
  diceResult: {
    alignItems: 'center',
  },
  resultText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  waitingText: {
    fontSize: 16,
    color: Colors.primary.textMuted,
    marginTop: 8,
  },
  rollingDiceEmoji: {
    fontSize: 60,
  },
  diceEmoji: {
    fontSize: 60,
  },
  winAmount: {
    fontSize: 16,
    color: Colors.primary.gold,
    fontWeight: 'bold',
    marginTop: 4,
  },
  predictionInfo: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
  },
  predictionInfoText: {
    fontSize: 16,
    color: Colors.primary.text,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  multiplierInfoText: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
});
