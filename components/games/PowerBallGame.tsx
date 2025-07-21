// Power Ball Game for Adola App (Lottery with Power Ball)
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

const { width } = Dimensions.get('window');
const GAME_WIDTH = Math.min(width - 40, 350);

export default function PowerBallGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedPowerBall, setSelectedPowerBall] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [drawHistory, setDrawHistory] = useState<any[]>([]);

  const TOTAL_NUMBERS = 30;
  const TOTAL_POWER_BALLS = 10;
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

  const selectPowerBall = (number: number) => {
    if (isDrawing) return;
    setSelectedPowerBall(selectedPowerBall === number ? null : number);
  };

  const quickPick = () => {
    if (isDrawing) return;

    // Pick 5 regular numbers
    const numbers: number[] = [];
    while (numbers.length < REQUIRED_PICKS) {
      const randomNumber = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
      if (!numbers.includes(randomNumber)) {
        numbers.push(randomNumber);
      }
    }
    setSelectedNumbers(numbers.sort((a, b) => a - b));

    // Pick power ball
    const powerBall = Math.floor(Math.random() * TOTAL_POWER_BALLS) + 1;
    setSelectedPowerBall(powerBall);
  };

  const clearNumbers = () => {
    if (isDrawing) return;
    setSelectedNumbers([]);
    setSelectedPowerBall(null);
  };

  const calculatePayout = (matches: number, powerBallMatch: boolean, betAmount: number) => {
    // Power Ball prize structure
    if (matches === 5 && powerBallMatch) return 1000000; // Grand Prize
    if (matches === 5) return 50000; // Match 5
    if (matches === 4 && powerBallMatch) return 5000; // Match 4 + PB
    if (matches === 4) return 500; // Match 4
    if (matches === 3 && powerBallMatch) return 100; // Match 3 + PB
    if (matches === 3) return 25; // Match 3
    if (matches === 2 && powerBallMatch) return 10; // Match 2 + PB
    if (matches === 1 && powerBallMatch) return 5; // Match 1 + PB
    if (powerBallMatch) return 2; // Power Ball only

    return 0;
  };

  const generateStrategicNumbers = (playerNumbers: number[], playerPowerBall: number, shouldWin: boolean): { winningNumbers: number[], winningPowerBall: number } => {
    const winningNumbers: number[] = [];
    let winningPowerBall: number;

    if (shouldWin) {
      // Player should win - include some of their numbers and possibly power ball
      const targetMatches = Math.floor(Math.random() * 3) + 1; // 1-3 matches for decent win
      const shouldMatchPowerBall = Math.random() < 0.5; // 50% chance to match power ball when winning

      // Include some player numbers
      const matchingNumbers = playerNumbers.slice(0, targetMatches);
      winningNumbers.push(...matchingNumbers);

      // Set power ball
      winningPowerBall = shouldMatchPowerBall ? playerPowerBall : Math.floor(Math.random() * TOTAL_POWER_BALLS) + 1;

      console.log(`⚡ Strategic win: Including ${targetMatches} player numbers: [${matchingNumbers.join(', ')}], PowerBall match: ${shouldMatchPowerBall}`);

      // Fill remaining slots with random numbers not in player's selection
      while (winningNumbers.length < REQUIRED_PICKS) {
        const randomNumber = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
        if (!winningNumbers.includes(randomNumber) && !playerNumbers.includes(randomNumber)) {
          winningNumbers.push(randomNumber);
        }
      }
    } else {
      // Player should lose - minimize matches
      const maxMatches = Math.random() < 0.3 ? 1 : 0; // 30% chance of 1 match, 70% chance of 0 matches
      const shouldMatchPowerBall = Math.random() < 0.1; // 10% chance to match power ball when losing

      if (maxMatches === 1) {
        // Give 1 match (small consolation)
        const matchingNumber = playerNumbers[Math.floor(Math.random() * playerNumbers.length)];
        winningNumbers.push(matchingNumber);
        console.log(`⚡ Strategic loss with 1 match: [${matchingNumber}], PowerBall match: ${shouldMatchPowerBall}`);
      } else {
        console.log(`⚡ Strategic loss with 0 matches, PowerBall match: ${shouldMatchPowerBall}`);
      }

      // Set power ball
      winningPowerBall = shouldMatchPowerBall ? playerPowerBall : Math.floor(Math.random() * TOTAL_POWER_BALLS) + 1;

      // Fill remaining slots with numbers not in player's selection
      while (winningNumbers.length < REQUIRED_PICKS) {
        const randomNumber = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
        if (!winningNumbers.includes(randomNumber) && !playerNumbers.includes(randomNumber)) {
          winningNumbers.push(randomNumber);
        }
      }
    }

    return {
      winningNumbers: winningNumbers.sort((a, b) => a - b),
      winningPowerBall
    };
  };

  const playLottery = async (betAmount: number) => {
    if (selectedNumbers.length !== REQUIRED_PICKS || selectedPowerBall === null) {
      Alert.alert('Incomplete Selection', `Please select ${REQUIRED_PICKS} numbers and 1 Power Ball`);
      return;
    }

    // Check if user can place bet
    if (!canPlaceBet(betAmount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    // Step 1: Deduct bet amount immediately
    console.log(`Placing PowerBall bet: PKR ${betAmount} with numbers [${selectedNumbers.join(', ')}] + PB${selectedPowerBall}`);
    const betPlaced = await placeBet(betAmount, 'powerball', `PowerBall bet - ${selectedNumbers.join(', ')} + PB${selectedPowerBall}`);
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
      // Determine if player should win (20% win rate)
      const shouldPlayerWin = Math.random() < 0.2;

      // Generate winning numbers and power ball based on win rate requirement
      const { winningNumbers, winningPowerBall } = generateStrategicNumbers(selectedNumbers, selectedPowerBall, shouldPlayerWin);

      console.log(`PowerBall: Should win: ${shouldPlayerWin}, Player numbers: [${selectedNumbers.join(', ')}] + PB${selectedPowerBall}, Winning: [${winningNumbers.join(', ')}] + PB${winningPowerBall}`);

      // Calculate matches
      const matches = selectedNumbers.filter(num => winningNumbers.includes(num));
      const matchCount = matches.length;
      const powerBallMatch = selectedPowerBall === winningPowerBall;
      const winAmount = calculatePayout(matchCount, powerBallMatch, betAmount);
      const isWin = winAmount > 0;

      // Add to history
      setDrawHistory(prev => [
        { numbers: winningNumbers, powerBall: winningPowerBall },
        ...prev.slice(0, 4)
      ]);

      // Step 2: Add winnings if player won
      if (isWin && winAmount > 0) {
        console.log(`Adding PowerBall winnings: PKR ${winAmount} for ${matchCount} matches${powerBallMatch ? ' + PowerBall' : ''}`);
        const winningsAdded = await addWinnings(
          winAmount,
          'powerball',
          `PowerBall win - ${matchCount} matches${powerBallMatch ? ' + PowerBall' : ''}`
        );

        if (winningsAdded) {
          console.log(`Winnings added successfully: PKR ${winAmount}`);
        } else {
          console.log('Failed to add winnings');
        }

        // Force balance refresh to ensure UI updates
        setTimeout(() => refreshBalance(), 500);
      }

      setLastResult({
        playerNumbers: selectedNumbers,
        playerPowerBall: selectedPowerBall,
        winningNumbers,
        winningPowerBall,
        matches,
        matchCount,
        powerBallMatch,
        winAmount,
        isWin,
        betAmount
      });

      setIsDrawing(false);

      // Show result
      let prizeLevel = '';
      if (matchCount === 5 && powerBallMatch) prizeLevel = 'GRAND PRIZE!';
      else if (matchCount === 5) prizeLevel = 'Match 5!';
      else if (matchCount === 4 && powerBallMatch) prizeLevel = 'Match 4 + Power Ball!';
      else if (matchCount === 4) prizeLevel = 'Match 4!';
      else if (matchCount === 3 && powerBallMatch) prizeLevel = 'Match 3 + Power Ball!';
      else if (matchCount === 3) prizeLevel = 'Match 3!';
      else if (matchCount === 2 && powerBallMatch) prizeLevel = 'Match 2 + Power Ball!';
      else if (matchCount === 1 && powerBallMatch) prizeLevel = 'Match 1 + Power Ball!';
      else if (powerBallMatch) prizeLevel = 'Power Ball Match!';
      else prizeLevel = 'No Prize';

      Alert.alert(
        'Power Ball Result',
        `${prizeLevel}\nMatches: ${matchCount}/5 ${powerBallMatch ? '+ Power Ball' : ''}\nYour numbers: ${selectedNumbers.join(', ')} | PB: ${selectedPowerBall}\nWinning: ${winningNumbers.join(', ')} | PB: ${winningPowerBall}${isWin ? `\nYou won PKR ${winAmount}!` : ''}`,
        [{ text: 'OK' }]
      );
    }, 3000);
  };

  const renderNumberGrid = () => {
    const rows = [];
    const numbersPerRow = Math.ceil(TOTAL_NUMBERS / 2); // Divide into 2 rows

    for (let row = 0; row < 2; row++) {
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

  const renderPowerBallGrid = () => {
    const powerBalls = [];
    for (let i = 1; i <= TOTAL_POWER_BALLS; i++) {
      const isSelected = selectedPowerBall === i;
      const isWinning = lastResult && lastResult.winningPowerBall === i;
      const isMatching = lastResult && lastResult.powerBallMatch && selectedPowerBall === i;

      powerBalls.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.powerBallButton,
            isSelected && styles.selectedPowerBall,
            isWinning && styles.winningPowerBall,
            isMatching && styles.matchingPowerBall,
          ]}
          onPress={() => selectPowerBall(i)}
          disabled={isDrawing}
        >
          <Text style={[
            styles.powerBallText,
            isSelected && styles.selectedPowerBallText,
            isWinning && styles.winningPowerBallText,
          ]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return powerBalls;
  };

  const getPrizeTable = () => {
    return [
      { matches: '5 + PB', prize: 'PKR 1,000,000', description: 'Grand Prize' },
      { matches: '5', prize: 'PKR 50,000', description: 'Match 5' },
      { matches: '4 + PB', prize: 'PKR 5,000', description: 'Match 4 + Power Ball' },
      { matches: '4', prize: 'PKR 500', description: 'Match 4' },
      { matches: '3 + PB', prize: 'PKR 100', description: 'Match 3 + Power Ball' },
      { matches: '3', prize: 'PKR 25', description: 'Match 3' },
      { matches: '2 + PB', prize: 'PKR 10', description: 'Match 2 + Power Ball' },
      { matches: '1 + PB', prize: 'PKR 5', description: 'Match 1 + Power Ball' },
      { matches: 'PB', prize: 'PKR 2', description: 'Power Ball Only' },
    ];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚡ Power Ball</Text>
      <Text style={styles.subtitle}>Pick 5 numbers + 1 Power Ball for the grand prize!</Text>

      {/* Selection Info */}
      <View style={styles.selectionInfo}>
        <Text style={styles.selectionText}>
          Numbers: {selectedNumbers.length}/{REQUIRED_PICKS} | Power Ball: {selectedPowerBall || 'None'}
        </Text>
        <Text style={styles.selectedNumbers}>
          {selectedNumbers.length > 0 ? selectedNumbers.join(', ') : 'None selected'}
          {selectedPowerBall && ` | PB: ${selectedPowerBall}`}
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
        <Text style={styles.sectionTitle}>Choose 5 Numbers (1-30):</Text>
        <View style={styles.numberGrid}>
          {renderNumberGrid()}
        </View>
      </View>

      {/* Power Ball Grid */}
      <View style={styles.powerBallContainer}>
        <Text style={styles.sectionTitle}>Choose Power Ball (1-10):</Text>
        <View style={styles.powerBallGrid}>
          {renderPowerBallGrid()}
        </View>
      </View>

      {/* Drawing Status */}
      {isDrawing && (
        <View style={styles.drawingContainer}>
          <Text style={styles.drawingText}>⚡ Drawing Power Ball...</Text>
          <Text style={styles.drawingSubtext}>Feel the power!</Text>
        </View>
      )}

      {/* Last Result */}
      {lastResult && !isDrawing && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Draw Result:</Text>
          <Text style={styles.resultMatches}>
            Matches: {lastResult.matchCount}/5 {lastResult.powerBallMatch ? '+ PB' : ''}
          </Text>
          <Text style={styles.resultNumbers}>
            Winning: {lastResult.winningNumbers.join(', ')} | PB: {lastResult.winningPowerBall}
          </Text>
          {lastResult.isWin && (
            <Text style={styles.resultWin}>Won: PKR {lastResult.winAmount}</Text>
          )}
        </View>
      )}

      {/* Betting Panel */}
      <BettingPanel
        balance={balance}
        minBet={10}
        maxBet={balance || 1000}
        onBet={playLottery}
        disabled={isDrawing || selectedNumbers.length !== REQUIRED_PICKS || selectedPowerBall === null}
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
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  selectedNumbers: {
    fontSize: 12,
    color: Colors.primary.gold,
    fontWeight: 'bold',
    textAlign: 'center',
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
    height: 120,
  },
  sectionTitle: {
    fontSize: 14,
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
    height: 100,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  selectedNumberText: {
    color: Colors.primary.background,
  },
  winningNumberText: {
    color: Colors.primary.background,
  },
  powerBallContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
  },
  powerBallGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  powerBallButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: Colors.primary.hotPink,
    borderWidth: 2,
    borderColor: Colors.primary.hotPink,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    shadowColor: Colors.primary.hotPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  selectedPowerBall: {
    backgroundColor: Colors.primary.gold,
    borderColor: Colors.primary.gold,
    shadowColor: Colors.primary.gold,
  },
  winningPowerBall: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  matchingPowerBall: {
    backgroundColor: Colors.primary.gold,
    borderColor: Colors.primary.gold,
  },
  powerBallText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  selectedPowerBallText: {
    color: Colors.primary.background,
  },
  winningPowerBallText: {
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
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  resultWin: {
    fontSize: 16,
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
  },
});
