// Limbo Game for Adola App
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';
import { AdvancedGameLogicService } from '../../services/advancedGameLogicService';

const { width } = Dimensions.get('window');
const GAME_WIDTH = Math.min(width - 40, 350);

export default function LimboGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [targetMultiplier, setTargetMultiplier] = useState('2.00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [gameHistory, setGameHistory] = useState<number[]>([]);
  const [gameWinProbability, setGameWinProbability] = useState(0);
  const [engagementBonus, setEngagementBonus] = useState<string>('');

  const gameLogicService = AdvancedGameLogicService.getInstance();

  const generateRandomMultiplier = () => {
    // Generate a random multiplier between 1.00 and 1000.00
    // Using exponential distribution to make higher multipliers rarer
    const random = Math.random();
    const exponential = -Math.log(1 - random);
    const multiplier = 1 + exponential * 10; // Scale the exponential
    return Math.min(multiplier, 1000); // Cap at 1000x
  };

  const generateStrategicMultiplier = (target: number, shouldWin: boolean): number => {
    if (shouldWin) {
      // Player should win - generate multiplier >= target
      // Add some randomness but ensure it's above target
      const minWin = target;
      const maxWin = Math.min(target * 2, 1000); // Up to 2x the target or 1000x max
      const winMultiplier = minWin + Math.random() * (maxWin - minWin);

      console.log(`🎯 Strategic win: Target ${target.toFixed(2)}x, Generated ${winMultiplier.toFixed(2)}x`);
      return winMultiplier;
    } else {
      // Player should lose - generate multiplier < target
      // Generate between 1.00 and just below target
      const maxLoss = Math.max(target - 0.01, 1.00);
      const lossMultiplier = 1.00 + Math.random() * (maxLoss - 1.00);

      console.log(`🎯 Strategic loss: Target ${target.toFixed(2)}x, Generated ${lossMultiplier.toFixed(2)}x`);
      return lossMultiplier;
    }
  };

  const calculateWinChance = (target: number) => {
    // Win chance = 98% / target multiplier (2% house edge)
    return Math.min(98 / target, 98);
  };

  const calculatePayout = (betAmount: number, target: number) => {
    return Math.floor(betAmount * target);
  };

  const playGame = async (betAmount: number) => {
    const target = parseFloat(targetMultiplier);

    if (isNaN(target) || target < 1.01) {
      Alert.alert('Invalid Target', 'Target multiplier must be at least 1.01x');
      return;
    }

    if (target > 1000) {
      Alert.alert('Invalid Target', 'Target multiplier cannot exceed 1000x');
      return;
    }

    try {
      // Check if user can place bet using advanced game logic
      if (!gameLogicService.canPlayGame(betAmount, balance || 0, 'limbo')) {
        const message = gameLogicService.getBalanceValidationMessage(betAmount, balance || 0, 'limbo');
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
        basePayout: target,
        gameType: 'limbo',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { targetMultiplier: target }
      });

      setGameWinProbability(probability);
      setEngagementBonus(bonus);

      console.log(`🎯 Limbo Game: Win probability ${(probability * 100).toFixed(1)}%, Target: ${target.toFixed(2)}x`);
      if (bonus) {
        console.log(`🎯 Engagement bonus: ${bonus}`);
      }

      // Step 1: Deduct bet amount immediately
      console.log(`Placing Limbo bet: PKR ${betAmount} with target ${target.toFixed(2)}x`);
      const betPlaced = await placeBet(betAmount, 'limbo', `Limbo bet - target ${target.toFixed(2)}x`);
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }
      console.log(`Bet placed successfully: PKR ${betAmount} deducted`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);

      setIsPlaying(true);

      // Simulate game delay
      setTimeout(async () => {
        try {
          // Use advanced game logic to determine win/loss
          const gameResult = await gameLogicService.calculateAdvancedGameResult({
            betAmount,
            basePayout: target,
            gameType: 'limbo',
            userId: user.id,
            currentBalance: balance || 0,
            gameSpecificData: { targetMultiplier: target }
          });

          // Generate strategic multiplier based on game result
          const randomMultiplier = generateStrategicMultiplier(target, gameResult.won);
          const isWin = gameResult.won && randomMultiplier >= target;
          const finalWinAmount = isWin ? gameResult.winAmount : 0;

          console.log(`Limbo: Win probability: ${(probability * 100).toFixed(1)}%, Target: ${target.toFixed(2)}x, Result: ${randomMultiplier.toFixed(2)}x, Won: ${isWin}`);
          console.log(`📊 Adjusted probability: ${((gameResult.adjustedProbability || 0) * 100).toFixed(1)}%, House edge: ${((gameResult.houseEdge || 0) * 100).toFixed(1)}%`);

          // Add to history
          setGameHistory(prev => [randomMultiplier, ...prev.slice(0, 9)]);

          // Log the game result for analytics
          await gameLogicService.logGameResult(user.id, 'limbo', {
            ...gameResult,
            won: isWin,
            winAmount: finalWinAmount
          }, {
            targetMultiplier: target,
            resultMultiplier: randomMultiplier,
            adjustedProbability: gameResult.adjustedProbability,
            houseEdge: gameResult.houseEdge
          });

          // Step 2: Add winnings if player won
          if (isWin && finalWinAmount > 0) {
            console.log(`Adding Limbo winnings: PKR ${finalWinAmount} for target ${target.toFixed(2)}x, result ${randomMultiplier.toFixed(2)}x`);
            const winningsAdded = await addWinnings(
              finalWinAmount,
              'limbo',
              `Limbo game win - target: ${target.toFixed(2)}x, result: ${randomMultiplier.toFixed(2)}x`
            );

            if (winningsAdded) {
              console.log(`Winnings added successfully: PKR ${finalWinAmount}`);
            } else {
              console.log('Failed to add winnings');
            }

            // Force balance refresh to ensure UI updates
            setTimeout(() => refreshBalance(), 500);
          }

          setLastResult({
            target,
            result: randomMultiplier,
            isWin,
            winAmount: finalWinAmount,
            betAmount,
            engagementBonus: gameResult.engagementBonus
          });

          setIsPlaying(false);

          if (isWin) {
            let message = `Target: ${target.toFixed(2)}x\nResult: ${randomMultiplier.toFixed(2)}x\nYou won PKR ${finalWinAmount.toLocaleString()}!`;
            if (gameResult.engagementBonus) {
              message += `\n\n🎯 ${gameResult.engagementBonus}`;
            }
            Alert.alert('You Won!', message, [{ text: 'OK' }]);
          } else {
            Alert.alert(
              'You Lost',
              `Target: ${target.toFixed(2)}x\nResult: ${randomMultiplier.toFixed(2)}x\nBetter luck next time!`,
              [{ text: 'OK' }]
            );
          }
        } catch (error) {
          console.error('❌ Error in Limbo game logic:', error);
          setIsPlaying(false);
          Alert.alert('Error', 'An error occurred while playing the game. Please try again.');
        }
      }, 2000);
    } catch (error) {
      console.error('❌ Error in Limbo playGame:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  const getQuickTargets = () => {
    return [
      { multiplier: 1.5, chance: calculateWinChance(1.5) },
      { multiplier: 2.0, chance: calculateWinChance(2.0) },
      { multiplier: 3.0, chance: calculateWinChance(3.0) },
      { multiplier: 5.0, chance: calculateWinChance(5.0) },
      { multiplier: 10.0, chance: calculateWinChance(10.0) },
      { multiplier: 100.0, chance: calculateWinChance(100.0) },
    ];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎲 Limbo</Text>
      <Text style={styles.subtitle}>Go under the target multiplier to win!</Text>

      {/* Game History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Results:</Text>
        <View style={styles.historyList}>
          {gameHistory.map((result, index) => (
            <View
              key={index}
              style={[
                styles.historyItem,
                { backgroundColor: result >= 10 ? Colors.primary.gold : 
                                  result >= 2 ? Colors.primary.neonCyan : Colors.primary.hotPink }
              ]}
            >
              <Text style={styles.historyText}>{result.toFixed(2)}x</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Target Multiplier Input */}
      <View style={styles.targetContainer}>
        <Text style={styles.sectionTitle}>Target Multiplier:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.targetInput}
            value={targetMultiplier}
            onChangeText={setTargetMultiplier}
            keyboardType="decimal-pad"
            placeholder="2.00"
            placeholderTextColor={Colors.primary.textMuted}
          />
          <Text style={styles.inputSuffix}>x</Text>
        </View>
        
        {/* Win Chance Display */}
        {!isNaN(parseFloat(targetMultiplier)) && parseFloat(targetMultiplier) >= 1.01 && (
          <View style={styles.chanceContainer}>
            <Text style={styles.chanceText}>
              Win Chance: {calculateWinChance(parseFloat(targetMultiplier)).toFixed(2)}%
            </Text>
            <Text style={styles.payoutText}>
              Payout: {parseFloat(targetMultiplier).toFixed(2)}x
            </Text>
          </View>
        )}
      </View>

      {/* Quick Target Buttons */}
      <View style={styles.quickTargetsContainer}>
        <Text style={styles.sectionTitle}>Quick Targets:</Text>
        <View style={styles.quickTargets}>
          {getQuickTargets().map((target, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.quickTargetButton,
                parseFloat(targetMultiplier) === target.multiplier && styles.selectedQuickTarget
              ]}
              onPress={() => setTargetMultiplier(target.multiplier.toFixed(2))}
            >
              <Text style={styles.quickTargetText}>{target.multiplier}x</Text>
              <Text style={styles.quickTargetChance}>{target.chance.toFixed(1)}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Game Result */}
      {lastResult && !isPlaying && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Game:</Text>
          <Text style={styles.resultTarget}>Target: {lastResult.target.toFixed(2)}x</Text>
          <Text style={[
            styles.resultValue,
            { color: lastResult.isWin ? Colors.primary.neonCyan : Colors.primary.hotPink }
          ]}>
            Result: {lastResult.result.toFixed(2)}x
          </Text>
          <Text style={[
            styles.resultOutcome,
            { color: lastResult.isWin ? Colors.primary.neonCyan : Colors.primary.hotPink }
          ]}>
            {lastResult.isWin ? `WIN! +PKR ${lastResult.winAmount}` : 'LOSE'}
          </Text>
        </View>
      )}

      {/* Game Status */}
      {isPlaying && (
        <View style={styles.playingContainer}>
          <Text style={styles.playingText}>🎲 Rolling...</Text>
          <Text style={styles.playingSubtext}>
            Target: {parseFloat(targetMultiplier).toFixed(2)}x
          </Text>
        </View>
      )}

      {/* Betting Panel */}
      <BettingPanel
        balance={balance}
        minBet={10}
        maxBet={balance || 1000}
        onBet={playGame}
        disabled={isPlaying}
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
  targetContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    width: '90%',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  targetInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    paddingVertical: 12,
    minWidth: 80,
  },
  inputSuffix: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.textSecondary,
    marginLeft: 8,
  },
  chanceContainer: {
    alignItems: 'center',
  },
  chanceText: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  payoutText: {
    fontSize: 14,
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
  },
  quickTargetsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
  },
  quickTargets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickTargetButton: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
    minWidth: 60,
  },
  selectedQuickTarget: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  quickTargetText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 2,
  },
  quickTargetChance: {
    fontSize: 10,
    color: Colors.primary.textMuted,
  },
  resultContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
    width: '90%',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  resultTarget: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultOutcome: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playingContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
    width: '90%',
  },
  playingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 8,
  },
  playingSubtext: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
});
