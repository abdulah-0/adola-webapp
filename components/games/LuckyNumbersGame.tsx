// Lucky Numbers Game for Adola App (5-Number Lottery)
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';
import { AdvancedGameLogicService } from '../../services/advancedGameLogicService';

const { width } = Dimensions.get('window');
const GAME_WIDTH = Math.min(width - 40, 350);

export default function LuckyNumbersGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [drawHistory, setDrawHistory] = useState<number[][]>([]);
  const [gameWinProbability, setGameWinProbability] = useState(0);
  const [engagementBonus, setEngagementBonus] = useState<string>('');

  const gameLogicService = AdvancedGameLogicService.getInstance();

  const TOTAL_NUMBERS = 35;
  const REQUIRED_PICKS = 5;

  const toggleNumber = (number: number) => {
    if (isDrawing) return;

    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      } else if (prev.length < REQUIRED_PICKS) {
        return [...prev, number].sort((a, b) => a - b);
      } else {
        Alert.alert('Maximum Numbers', `You can only select ${REQUIRED_PICKS} numbers`);
        return prev;
      }
    });
  };

  const quickPick = () => {
    if (isDrawing) return;

    const numbers: number[] = [];
    while (numbers.length < REQUIRED_PICKS) {
      const randomNumber = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
      if (!numbers.includes(randomNumber)) {
        numbers.push(randomNumber);
      }
    }
    setSelectedNumbers(numbers.sort((a, b) => a - b));
  };

  const clearNumbers = () => {
    if (isDrawing) return;
    setSelectedNumbers([]);
  };

  const calculatePayout = (matches: number, betAmount: number) => {
    const payouts = {
      5: 5000,   // Jackpot
      4: 2500,   // Second prize
      3: 250,    // Third prize
      2: 10,     // Fourth prize
    };

    const multiplier = payouts[matches as keyof typeof payouts] || 0;
    return multiplier > 0 ? Math.min(betAmount * multiplier, 5000) : 0; // Cap at 5K
  };

  const generateStrategicNumbers = (playerNumbers: number[], shouldWin: boolean): number[] => {
    const winningNumbers: number[] = [];

    if (shouldWin) {
      // Player should win - include some of their numbers
      const targetMatches = Math.floor(Math.random() * 3) + 2; // 2-4 matches for decent win
      const matchingNumbers = playerNumbers.slice(0, targetMatches);
      winningNumbers.push(...matchingNumbers);

      console.log(`🍀 Strategic win: Including ${targetMatches} player numbers: [${matchingNumbers.join(', ')}]`);

      // Fill remaining slots with random numbers not in player's selection
      while (winningNumbers.length < REQUIRED_PICKS) {
        const randomNumber = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
        if (!winningNumbers.includes(randomNumber) && !playerNumbers.includes(randomNumber)) {
          winningNumbers.push(randomNumber);
        }
      }
    } else {
      // Player should lose - minimize matches
      const maxMatches = Math.random() < 0.4 ? 1 : 0; // 40% chance of 1 match, 60% chance of 0 matches

      if (maxMatches === 1) {
        // Give 1 match (small consolation)
        const matchingNumber = playerNumbers[Math.floor(Math.random() * playerNumbers.length)];
        winningNumbers.push(matchingNumber);
        console.log(`🍀 Strategic loss with 1 match: [${matchingNumber}]`);
      } else {
        console.log(`🍀 Strategic loss with 0 matches`);
      }

      // Fill remaining slots with numbers not in player's selection
      while (winningNumbers.length < REQUIRED_PICKS) {
        const randomNumber = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
        if (!winningNumbers.includes(randomNumber) && !playerNumbers.includes(randomNumber)) {
          winningNumbers.push(randomNumber);
        }
      }
    }

    return winningNumbers.sort((a, b) => a - b);
  };

  const playLottery = async (betAmount: number) => {
    if (selectedNumbers.length !== REQUIRED_PICKS) {
      Alert.alert('Incomplete Selection', `Please select exactly ${REQUIRED_PICKS} numbers`);
      return;
    }

    try {
      // Check if user can place bet using advanced game logic
      if (!gameLogicService.canPlayGame(betAmount, balance || 0, 'luckynumbers')) {
        const message = gameLogicService.getBalanceValidationMessage(betAmount, balance || 0, 'luckynumbers');
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
        basePayout: 500, // Max jackpot multiplier
        gameType: 'luckynumbers',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { selectedNumbers, requiredPicks: REQUIRED_PICKS }
      });

      setGameWinProbability(probability);
      setEngagementBonus(bonus);

      console.log(`🎯 Lucky Numbers: Win probability ${(probability * 100).toFixed(1)}%, Numbers: [${selectedNumbers.join(', ')}]`);
      if (bonus) {
        console.log(`🎯 Engagement bonus: ${bonus}`);
      }

      // Step 1: Deduct bet amount immediately
      console.log(`Placing Lucky Numbers bet: PKR ${betAmount} with numbers [${selectedNumbers.join(', ')}]`);
      const betPlaced = await placeBet(betAmount, 'luckynumbers', `Lucky Numbers bet - ${selectedNumbers.join(', ')}`);
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }
      console.log(`Bet placed successfully: PKR ${betAmount} deducted`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);

      setIsDrawing(true);

      // Simulate drawing delay
      setTimeout(async () => {
        try {
          // Use advanced game logic to determine win/loss
          const gameResult = await gameLogicService.calculateAdvancedGameResult({
            betAmount,
            basePayout: 500, // Max jackpot multiplier
            gameType: 'luckynumbers',
            userId: user.id,
            currentBalance: balance || 0,
            gameSpecificData: { selectedNumbers, requiredPicks: REQUIRED_PICKS }
          });

          // Generate winning numbers based on game result
          const winningNumbers = generateStrategicNumbers(selectedNumbers, gameResult.won);

          console.log(`Lucky Numbers: Win probability: ${(probability * 100).toFixed(1)}%, Player numbers: [${selectedNumbers.join(', ')}], Winning numbers: [${winningNumbers.join(', ')}], Won: ${gameResult.won}`);
          console.log(`📊 Adjusted probability: ${((gameResult.adjustedProbability || 0) * 100).toFixed(1)}%, House edge: ${((gameResult.houseEdge || 0) * 100).toFixed(1)}%`);

          // Calculate matches
          const matches = selectedNumbers.filter(num => winningNumbers.includes(num));
          const matchCount = matches.length;
          const basePayout = calculatePayout(matchCount, betAmount);
          const finalWinAmount = gameResult.won && basePayout > 0 ? gameResult.winAmount : 0;
          const isWin = finalWinAmount > 0;

          // Add to history
          setDrawHistory(prev => [winningNumbers, ...prev.slice(0, 4)]);

          // Log the game result for analytics
          await gameLogicService.logGameResult(user.id, 'luckynumbers', {
            ...gameResult,
            won: isWin,
            winAmount: finalWinAmount
          }, {
            selectedNumbers,
            winningNumbers,
            matchCount,
            requiredPicks: REQUIRED_PICKS,
            adjustedProbability: gameResult.adjustedProbability,
            houseEdge: gameResult.houseEdge
          });

          // Step 2: Add winnings if player won
          if (isWin && finalWinAmount > 0) {
            console.log(`Adding Lucky Numbers winnings: PKR ${finalWinAmount} for ${matchCount} matches`);
            const winningsAdded = await addWinnings(
              finalWinAmount,
              'luckynumbers',
              `Lucky Numbers win - ${matchCount} matches`
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
            playerNumbers: selectedNumbers,
            winningNumbers,
            matches,
            matchCount,
            winAmount: finalWinAmount,
            isWin,
            betAmount,
            engagementBonus: gameResult.engagementBonus
          });

          setIsDrawing(false);

          // Show result
          let prizeLevel = '';
          switch (matchCount) {
            case 5: prizeLevel = 'JACKPOT!'; break;
            case 4: prizeLevel = '2nd Prize!'; break;
            case 3: prizeLevel = '3rd Prize!'; break;
            case 2: prizeLevel = '4th Prize!'; break;
            default: prizeLevel = 'No Prize'; break;
          }

          let message = `${prizeLevel}\nMatches: ${matchCount}/5\nYour numbers: ${selectedNumbers.join(', ')}\nWinning numbers: ${winningNumbers.join(', ')}`;
          if (isWin) {
            message += `\nYou won PKR ${finalWinAmount.toLocaleString()}!`;
          }
          if (gameResult.engagementBonus) {
            message += `\n\n🎯 ${gameResult.engagementBonus}`;
          }

          Alert.alert('Lucky Numbers Result', message, [{ text: 'OK' }]);
        } catch (error) {
          console.error('❌ Error in Lucky Numbers game logic:', error);
          setIsDrawing(false);
          Alert.alert('Error', 'An error occurred while drawing numbers. Please try again.');
        }
      }, 2500);
    } catch (error) {
      console.error('❌ Error in Lucky Numbers playLottery:', error);
      Alert.alert('Error', 'Failed to start lottery. Please try again.');
    }
  };

  const renderNumberGrid = () => {
    const rows = [];
    const numbersPerRow = Math.ceil(TOTAL_NUMBERS / 3); // Divide into 3 rows

    for (let row = 0; row < 3; row++) {
      const rowNumbers = [];
      const startNum = row * numbersPerRow + 1;
      const endNum = Math.min((row + 1) * numbersPerRow, TOTAL_NUMBERS);

      for (let i = startNum; i <= endNum; i++) {
        const isSelected = selectedNumbers.includes(i);
        const isWinning = lastResult && lastResult.winningNumbers.includes(i);
        const isMatching = lastResult && lastResult.matches.includes(i);

        rowNumbers.push(
          <TouchableOpacity
            key={i}
            style={[
              styles.numberButton,
              isSelected && styles.selectedNumber,
              isWinning && styles.winningNumber,
              isMatching && styles.matchingNumber,
            ]}
            onPress={() => toggleNumber(i)}
            disabled={isDrawing}
          >
            <Text style={[
              styles.numberText,
              isSelected && styles.selectedNumberText,
              isWinning && styles.winningNumberText,
            ]}>
              {i}
            </Text>
          </TouchableOpacity>
        );
      }

      rows.push(
        <ScrollView
          key={row}
          horizontal
          style={styles.numberRow}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.numberRowContent}
        >
          {rowNumbers}
        </ScrollView>
      );
    }

    return rows;
  };

  const getPrizeTable = () => {
    return [
      { matches: 5, prize: 'PKR 5,000', odds: '1 in 324,632' },
      { matches: 4, prize: 'PKR 2,500', odds: '1 in 2,164' },
      { matches: 3, prize: 'PKR 250', odds: '1 in 75' },
      { matches: 2, prize: 'PKR 10', odds: '1 in 7' },
    ];
  };

  const getLuckyNumber = () => {
    return Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍀 Lucky Numbers</Text>
      <Text style={styles.subtitle}>Pick 5 lucky numbers from 1-35!</Text>

      {/* Lucky Number of the Day */}
      <View style={styles.luckyContainer}>
        <Text style={styles.luckyLabel}>🍀 Lucky Number Today:</Text>
        <Text style={styles.luckyNumber}>{getLuckyNumber()}</Text>
      </View>

      {/* Selection Info */}
      <View style={styles.selectionInfo}>
        <Text style={styles.selectionText}>
          Selected: {selectedNumbers.length}/{REQUIRED_PICKS}
        </Text>
        <Text style={styles.selectedNumbers}>
          {selectedNumbers.length > 0 ? selectedNumbers.join(', ') : 'None selected'}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickButton} onPress={quickPick} disabled={isDrawing}>
          <Text style={styles.quickButtonText}>Quick Pick</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton} onPress={clearNumbers} disabled={isDrawing}>
          <Text style={styles.quickButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Number Grid */}
      <View style={styles.numberGridContainer}>
        <Text style={styles.sectionTitle}>Choose Your Lucky Numbers:</Text>
        <View style={styles.numberGrid}>
          {renderNumberGrid()}
        </View>
      </View>

      {/* Drawing Status */}
      {isDrawing && (
        <View style={styles.drawingContainer}>
          <Text style={styles.drawingText}>🍀 Drawing lucky numbers...</Text>
          <Text style={styles.drawingSubtext}>May luck be with you!</Text>
        </View>
      )}

      {/* Last Result */}
      {lastResult && !isDrawing && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Draw Result:</Text>
          <Text style={styles.resultMatches}>
            Matches: {lastResult.matchCount}/5
          </Text>
          <Text style={styles.resultNumbers}>
            Winning: {lastResult.winningNumbers.join(', ')}
          </Text>
          {lastResult.isWin && (
            <Text style={styles.resultWin}>Won: PKR {lastResult.winAmount}</Text>
          )}
        </View>
      )}

      {/* Draw History */}
      {drawHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent Draws:</Text>
          {drawHistory.slice(0, 3).map((draw, index) => (
            <Text key={index} style={styles.historyDraw}>
              {draw.join(', ')}
            </Text>
          ))}
        </View>
      )}

      {/* Prize Table */}
      {!isDrawing && (
        <View style={styles.prizeTableContainer}>
          <Text style={styles.prizeTableTitle}>Prize Table:</Text>
          {getPrizeTable().map((prize, index) => (
            <View key={index} style={styles.prizeRow}>
              <Text style={styles.prizeMatches}>{prize.matches} matches</Text>
              <Text style={styles.prizePayout}>{prize.prize}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Betting Panel */}
      <BettingPanel
        balance={balance}
        minBet={10}
        maxBet={balance || 1000}
        onBet={playLottery}
        disabled={isDrawing || selectedNumbers.length !== REQUIRED_PICKS}
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
  luckyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.gold,
    gap: 12,
    shadowColor: Colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  luckyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  luckyNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    backgroundColor: Colors.primary.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 50,
    textAlign: 'center',
  },
  selectionInfo: {
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
  selectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  selectedNumbers: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  quickButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  numberGridContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
    height: 180,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  numberGrid: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    padding: 8,
    height: 150,
  },
  numberRow: {
    height: 45,
    marginBottom: 5,
  },
  numberRowContent: {
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.background,
    borderWidth: 2,
    borderColor: Colors.primary.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedNumber: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  winningNumber: {
    backgroundColor: Colors.primary.gold,
    borderColor: Colors.primary.gold,
  },
  matchingNumber: {
    backgroundColor: Colors.primary.hotPink,
    borderColor: Colors.primary.hotPink,
  },
  numberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  selectedNumberText: {
    color: Colors.primary.background,
  },
  winningNumberText: {
    color: Colors.primary.background,
  },
  drawingContainer: {
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
  drawingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 8,
  },
  drawingSubtext: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
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
  resultMatches: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultNumbers: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 4,
  },
  resultWin: {
    fontSize: 16,
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
  },
  historyContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    width: '90%',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  historyDraw: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  prizeTableContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    width: '90%',
  },
  prizeTableTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  prizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  prizeMatches: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  prizePayout: {
    fontSize: 12,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
});
