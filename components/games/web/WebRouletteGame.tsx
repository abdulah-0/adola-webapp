// Web-specific Roulette Game - Vertically Scrollable Layout
import React, { useState, useRef } from 'react';
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
const WHEEL_SIZE = Math.min(width - 80, 300);

interface Bet {
  type: string;
  numbers: number[];
  multiplier: number;
  amount: number;
}

export default function WebRouletteGame() {
  console.log('🎡 WebRouletteGame component loaded');
  
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [selectedBetType, setSelectedBetType] = useState<string>('number');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  
  const wheelRotation = useRef(new Animated.Value(0)).current;

  // American Roulette numbers (0, 00, 1-36)
  const rouletteNumbers = [
    0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
    '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
  ];

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

  const betTypes = [
    { id: 'number', name: 'Single Number', multiplier: 35 },
    { id: 'red', name: 'Red', multiplier: 1 },
    { id: 'black', name: 'Black', multiplier: 1 },
    { id: 'even', name: 'Even', multiplier: 1 },
    { id: 'odd', name: 'Odd', multiplier: 1 },
    { id: 'low', name: '1-18', multiplier: 1 },
    { id: 'high', name: '19-36', multiplier: 1 },
  ];

  const placeRouletteBet = async (betAmount: number) => {
    console.log(`🎡 Placing roulette bet: PKR ${betAmount} on ${selectedBetType}`);
    
    if (selectedBetType === 'number' && selectedNumbers.length === 0) {
      Alert.alert('Error', 'Please select a number first!');
      return;
    }

    if (!canPlaceBet(betAmount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    try {
      // Step 1: Deduct bet amount immediately
      const betPlaced = await placeBet(betAmount, 'roulette', `Roulette bet - ${selectedBetType}`);
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      console.log(`✅ Bet placed successfully: PKR ${betAmount} deducted`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);

      const betType = betTypes.find(bt => bt.id === selectedBetType);
      if (!betType) return;

      let numbers: number[] = [];
      
      switch (selectedBetType) {
        case 'number':
          numbers = selectedNumbers;
          break;
        case 'red':
          numbers = redNumbers;
          break;
        case 'black':
          numbers = blackNumbers;
          break;
        case 'even':
          numbers = Array.from({length: 18}, (_, i) => (i + 1) * 2);
          break;
        case 'odd':
          numbers = Array.from({length: 18}, (_, i) => (i * 2) + 1);
          break;
        case 'low':
          numbers = Array.from({length: 18}, (_, i) => i + 1);
          break;
        case 'high':
          numbers = Array.from({length: 18}, (_, i) => i + 19);
          break;
      }

      const newBet: Bet = {
        type: selectedBetType,
        numbers,
        multiplier: betType.multiplier,
        amount: betAmount
      };

      setBets(prev => {
        const updatedBets = [...prev, newBet];
        // Start spin with the updated bets array
        setTimeout(() => spinWheelWithBets(updatedBets), 100);
        return updatedBets;
      });
    } catch (error) {
      console.error('❌ Error placing roulette bet:', error);
      Alert.alert('Error', 'Failed to place bet. Please try again.');
    }
  };

  const generateNaturalResult = (): number | string => {
    const randomIndex = Math.floor(Math.random() * rouletteNumbers.length);
    return rouletteNumbers[randomIndex];
  };

  const checkIfNaturalWin = (result: number | string, currentBets: Bet[]): boolean => {
    const numResult = typeof result === 'string' ? (result === '00' ? -1 : parseInt(result)) : result;
    return currentBets.some(bet => bet.numbers.includes(numResult));
  };

  const determineFinalResult = (naturalResult: number | string, wouldNaturallyWin: boolean, currentBets: Bet[]): number | string => {
    // 20% win rate logic
    const shouldForceWin = Math.random() < 0.2;

    console.log(`🎯 Natural result: ${naturalResult}, Would naturally win: ${wouldNaturallyWin}, Should force win: ${shouldForceWin}`);

    // If natural result matches desired outcome, keep it
    if (wouldNaturallyWin && shouldForceWin) {
      console.log(`🎯 Keeping natural win: ${naturalResult}`);
      return naturalResult;
    }

    if (!wouldNaturallyWin && !shouldForceWin) {
      console.log(`🎯 Keeping natural loss: ${naturalResult}`);
      return naturalResult;
    }

    // Override natural result to match desired outcome
    if (shouldForceWin) {
      // Force a win - pick from player's bet numbers
      const allBetNumbers = currentBets.flatMap(bet => bet.numbers);
      if (allBetNumbers.length > 0) {
        const forcedWin = allBetNumbers[Math.floor(Math.random() * allBetNumbers.length)];
        console.log(`🎯 Forcing win: ${forcedWin} (was ${naturalResult})`);
        return forcedWin;
      }
    } else {
      // Force a loss - pick a number not in player's bets
      const allBetNumbers = currentBets.flatMap(bet => bet.numbers);
      const losingNumbers = rouletteNumbers.filter(num => {
        const numValue = typeof num === 'string' ? (num === '00' ? -1 : parseInt(num)) : num;
        return !allBetNumbers.includes(numValue);
      });
      
      if (losingNumbers.length > 0) {
        const forcedLoss = losingNumbers[Math.floor(Math.random() * losingNumbers.length)];
        console.log(`🎯 Forcing loss: ${forcedLoss} (was ${naturalResult})`);
        return forcedLoss;
      }
    }

    return naturalResult;
  };

  const spinWheelWithBets = (currentBets: Bet[]) => {
    if (isSpinning) return;

    console.log(`🎲 Starting spin with bets:`, currentBets.map(bet => `${bet.type} PKR ${bet.amount}`));

    setIsSpinning(true);
    setWinningNumber(null);

    // Generate a natural random result first
    const naturalResult = generateNaturalResult();

    // Check if natural result would be a win
    const wouldNaturallyWin = checkIfNaturalWin(naturalResult, currentBets);

    // Determine final result based on win rate and natural outcome
    const winning = determineFinalResult(naturalResult, wouldNaturallyWin, currentBets);

    console.log(`🎲 Natural result: ${naturalResult}, Would win: ${wouldNaturallyWin}, Final result: ${winning}`);

    // Animate wheel spin
    const spinValue = Math.random() * 360 + 1440; // At least 4 full rotations

    Animated.timing(wheelRotation, {
      toValue: spinValue,
      duration: 3000,
      useNativeDriver: true,
    }).start(() => {
      const finalNumber = typeof winning === 'string' ? (winning === '00' ? -1 : parseInt(winning)) : winning;
      setWinningNumber(finalNumber);
      processResultsWithBets(finalNumber, currentBets);
    });
  };

  const processResultsWithBets = async (winning: number, currentBets: Bet[]) => {
    console.log(`🎯 Processing results for winning number: ${winning} with bets:`, currentBets.map(bet => `${bet.type} PKR ${bet.amount}`));
    
    let totalWinAmount = 0;
    let totalBetAmount = 0;
    let winningBets = 0;

    for (const bet of currentBets) {
      totalBetAmount += bet.amount;
      console.log(`🎯 Checking bet: ${bet.type} with numbers [${bet.numbers.join(', ')}] - Amount: PKR ${bet.amount}`);

      const isWinningBet = bet.numbers.includes(winning);
      console.log(`🎯 Does bet include winning number ${winning}? ${isWinningBet}`);

      if (isWinningBet) {
        // Add back original bet + winnings (total payout)
        const payout = bet.amount * (bet.multiplier + 1);
        totalWinAmount += payout;
        winningBets++;
        console.log(`🎯 ✅ WINNING BET! Payout: PKR ${payout} (${bet.amount} × ${bet.multiplier + 1})`);
      } else {
        console.log(`🎯 ❌ Losing bet`);
      }
    }

    console.log(`🎯 Total bet amount: PKR ${totalBetAmount}, Total win amount: PKR ${totalWinAmount}, Winning bets: ${winningBets}`);

    // Step 2: Add winnings if player won
    if (totalWinAmount > 0) {
      const success = await addWinnings(
        totalWinAmount,
        'roulette',
        `Roulette win - Number ${winning}, ${winningBets} winning bet(s)`
      );

      console.log(`💰 Add winnings result: ${success}`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
    }

    // Reset game immediately and show alert
    resetGame();

    const displayNumber = winning === -1 ? '00' : winning.toString();
    const netWin = totalWinAmount - totalBetAmount;
    
    let message = `Winning number: ${displayNumber}`;
    if (totalWinAmount > 0) {
      message += `\nYou won PKR ${totalWinAmount.toLocaleString()}!`;
      if (netWin > 0) {
        message += `\nNet profit: PKR ${netWin.toLocaleString()}`;
      }
    } else {
      message += `\nBetter luck next time!`;
    }

    Alert.alert('Roulette Result', message, [{ text: 'OK' }]);
  };

  const resetGame = () => {
    console.log('🔄 Resetting roulette game...');
    console.log('🔍 Before reset - isSpinning:', isSpinning, 'bets:', bets.length, 'selectedNumbers:', selectedNumbers.length);

    // Force reset all states
    setBets([]);
    setSelectedNumbers([]);
    setWinningNumber(null);
    setIsSpinning(false);
    setSelectedBetType('number');

    // Reset wheel animation
    wheelRotation.stopAnimation();
    wheelRotation.setValue(0);

    console.log('✅ Roulette game reset complete');
    
    // Force a small delay to ensure state updates are processed
    setTimeout(() => {
      console.log('🔍 State check after timeout - isSpinning:', isSpinning, 'bets:', bets.length);
    }, 100);
  };

  const toggleNumber = (num: number) => {
    if (selectedBetType !== 'number') return;
    
    console.log(`🎡 Toggling number ${num} selection`);
    
    setSelectedNumbers(prev => {
      if (prev.includes(num)) {
        return prev.filter(n => n !== num);
      } else {
        return [...prev, num];
      }
    });
  };

  const renderRouletteWheel = () => {
    return (
      <View style={styles.wheelContainer}>
        <Animated.View
          style={[
            styles.wheel,
            {
              transform: [{ rotate: wheelRotation.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg']
              }) }]
            }
          ]}
        >
          {/* Render wheel numbers */}
          {rouletteNumbers.map((number, index) => {
            const angle = (index * 360) / rouletteNumbers.length;
            const radius = WHEEL_SIZE / 2 - 30;
            const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
            const y = Math.sin((angle - 90) * Math.PI / 180) * radius;

            return (
              <View
                key={`${number}-${index}`}
                style={[
                  styles.wheelNumber,
                  {
                    left: WHEEL_SIZE / 2 + x - 15,
                    top: WHEEL_SIZE / 2 + y - 15,
                    backgroundColor: number === 0 || number === '00' ? '#00aa00' :
                                   (typeof number === 'number' && redNumbers.includes(number)) ? '#ff4444' : '#333333'
                  }
                ]}
              >
                <Text style={styles.wheelNumberText}>{number}</Text>
              </View>
            );
          })}

          {/* Center circle */}
          <View style={styles.wheelCenter}>
            <Text style={styles.wheelCenterText}>🎯</Text>
          </View>
        </Animated.View>

        {/* Winning number display */}
        {winningNumber !== null && (
          <View style={styles.winningNumberDisplay}>
            <Text style={styles.winningNumberText}>
              {winningNumber === -1 ? '00' : winningNumber}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderNumberGrid = () => {
    const numbers = [];

    // Add 0 and 00
    numbers.push(
      <TouchableOpacity
        key={0}
        style={[
          styles.numberButton,
          styles.greenNumber,
          selectedNumbers.includes(0) && styles.selectedNumber
        ]}
        onPress={() => toggleNumber(0)}
        disabled={selectedBetType !== 'number'}
      >
        <Text style={styles.numberText}>0</Text>
      </TouchableOpacity>
    );

    numbers.push(
      <TouchableOpacity
        key="00"
        style={[
          styles.numberButton,
          styles.greenNumber,
          selectedNumbers.includes(-1) && styles.selectedNumber
        ]}
        onPress={() => toggleNumber(-1)}
        disabled={selectedBetType !== 'number'}
      >
        <Text style={styles.numberText}>00</Text>
      </TouchableOpacity>
    );

    // Add numbers 1-36
    for (let i = 1; i <= 36; i++) {
      const isRed = redNumbers.includes(i);
      numbers.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.numberButton,
            isRed ? styles.redNumber : styles.blackNumber,
            selectedNumbers.includes(i) && styles.selectedNumber
          ]}
          onPress={() => toggleNumber(i)}
          disabled={selectedBetType !== 'number'}
        >
          <Text style={styles.numberText}>{i}</Text>
        </TouchableOpacity>
      );
    }

    return numbers;
  };

  console.log('🎡 WebRouletteGame rendering with balance:', balance);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Game Title */}
      <View style={styles.section}>
        <Text style={styles.gameTitle}>🎡 Roulette</Text>
        <Text style={styles.gameSubtitle}>Place your bets and spin the wheel!</Text>
      </View>

      {/* Balance Display */}
      <View style={styles.section}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceAmount}>PKR {balance?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* Roulette Wheel */}
      <View style={styles.section}>
        {renderRouletteWheel()}
      </View>

      {/* Current Bets Display */}
      {bets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Bets</Text>
          <View style={styles.betsContainer}>
            {bets.map((bet, index) => (
              <View key={index} style={styles.betCard}>
                <Text style={styles.betText}>
                  {bet.type.toUpperCase()}: PKR {bet.amount} ({bet.multiplier + 1}:1)
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bet Type Selection */}
      {!isSpinning && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Bet Type</Text>
          <View style={styles.betTypesContainer}>
            {betTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.betTypeButton,
                  selectedBetType === type.id && styles.selectedBetType
                ]}
                onPress={() => setSelectedBetType(type.id)}
              >
                <Text style={[styles.betTypeText, selectedBetType === type.id && styles.selectedBetTypeText]}>
                  {type.name}
                </Text>
                <Text style={[styles.betTypeMultiplier, selectedBetType === type.id && styles.selectedBetTypeText]}>
                  {type.multiplier + 1}:1
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Number Selection Grid */}
      {selectedBetType === 'number' && !isSpinning && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Numbers</Text>
          <View style={styles.numberGrid}>
            {renderNumberGrid()}
          </View>
        </View>
      )}

      {/* Betting Panel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Place Your Bet</Text>
        {!isSpinning ? (
          <BettingPanel
            balance={balance}
            minBet={10}
            maxBet={balance || 1000}
            onBet={placeRouletteBet}
            disabled={isSpinning}
          />
        ) : (
          <View style={styles.gameActiveCard}>
            <Text style={styles.gameActiveText}>🎡 Wheel Spinning...</Text>
            <Text style={styles.gameActiveSubtext}>
              {bets.length} bet(s) placed | Waiting for result...
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 15,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    textAlign: 'center',
    marginBottom: 5,
  },
  gameSubtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
  wheelContainer: {
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: '#8B4513',
    borderWidth: 8,
    borderColor: '#DAA520',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  wheelNumber: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  wheelNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  wheelCenter: {
    position: 'absolute',
    top: WHEEL_SIZE / 2 - 20,
    left: WHEEL_SIZE / 2 - 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  wheelCenterText: {
    fontSize: 20,
  },
  winningNumberDisplay: {
    position: 'absolute',
    top: -40,
    backgroundColor: Colors.primary.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary.background,
  },
  winningNumberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  betsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  betCard: {
    backgroundColor: Colors.primary.surface,
    padding: 10,
    borderRadius: 10,
    margin: 5,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  betText: {
    fontSize: 12,
    color: Colors.primary.text,
    fontWeight: 'bold',
  },
  betTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  betTypeButton: {
    backgroundColor: Colors.primary.surface,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
    minWidth: 80,
    margin: 5,
  },
  selectedBetType: {
    backgroundColor: Colors.primary.gold,
    borderColor: Colors.primary.gold,
  },
  betTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  selectedBetTypeText: {
    color: Colors.primary.background,
  },
  betTypeMultiplier: {
    fontSize: 10,
    color: Colors.primary.textSecondary,
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  redNumber: {
    backgroundColor: '#DC143C',
  },
  blackNumber: {
    backgroundColor: '#2F2F2F',
  },
  greenNumber: {
    backgroundColor: '#228B22',
  },
  selectedNumber: {
    borderWidth: 3,
    borderColor: Colors.primary.neonCyan,
    shadowColor: Colors.primary.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gameActiveCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.gold,
  },
  gameActiveText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    marginBottom: 5,
  },
  gameActiveSubtext: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
});
