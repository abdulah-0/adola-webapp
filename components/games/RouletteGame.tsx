// Roulette Game for Adola App
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';

const { width } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width - 40, 300);

interface Bet {
  type: string;
  numbers: number[];
  multiplier: number;
  amount: number;
}

export default function RouletteGame() {
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

  const getNumberColor = (num: number | string) => {
    if (num === 0 || num === '00') return 'green';
    if (typeof num === 'number' && redNumbers.includes(num)) return 'red';
    return 'black';
  };

  const placeRouletteBet = async (betAmount: number) => {
    if (selectedBetType === 'number' && selectedNumbers.length === 0) {
      Alert.alert('Error', 'Please select a number first!');
      return;
    }

    // Check if user can place bet
    if (!canPlaceBet(betAmount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    // Step 1: Deduct bet amount immediately
    console.log(`Placing roulette bet: PKR ${betAmount} on ${selectedBetType}`);
    const betPlaced = await placeBet(betAmount, 'roulette', `Roulette bet - ${selectedBetType}`);
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      return;
    }
    console.log(`Bet placed successfully: PKR ${betAmount} deducted`);

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
  };

  const generateNaturalResult = (): number | string => {
    // Generate completely natural random result
    const randomIndex = Math.floor(Math.random() * rouletteNumbers.length);
    return rouletteNumbers[randomIndex];
  };

  const checkIfNaturalWin = (result: number | string, currentBets: Bet[]): boolean => {
    // Check if the natural result would be a win for any current bet
    console.log(`🔍 Checking if ${result} is a natural win for bets:`, currentBets.map(bet => `${bet.type} (${bet.numbers.join(',')})`));

    for (const bet of currentBets) {
      console.log(`🔍 Checking bet ${bet.type} with numbers [${bet.numbers.join(', ')}] against result ${result}`);
      if (bet.numbers.includes(result as number)) {
        console.log(`🔍 ✅ NATURAL WIN FOUND! ${result} is in ${bet.type} bet`);
        return true;
      }
    }
    console.log(`🔍 ❌ No natural win found for ${result}`);
    return false;
  };

  const determineFinalResult = (naturalResult: number | string, wouldNaturallyWin: boolean, currentBets: Bet[]): number | string => {
    // 20% win rate logic with respect for natural wins
    const shouldForceWin = Math.random() < 0.2;

    console.log(`🎯 Natural result: ${naturalResult}, Would naturally win: ${wouldNaturallyWin}, Should force win: ${shouldForceWin}`);

    // If natural result is a win and we should win, keep it
    if (wouldNaturallyWin && shouldForceWin) {
      console.log(`🎯 Keeping natural win: ${naturalResult}`);
      return naturalResult;
    }

    // If natural result is a loss and we should lose, keep it
    if (!wouldNaturallyWin && !shouldForceWin) {
      console.log(`🎯 Keeping natural loss: ${naturalResult}`);
      return naturalResult;
    }

    // If natural result doesn't match desired outcome, override it
    if (shouldForceWin) {
      // Force a win - pick from player's bet numbers
      const allBetNumbers = currentBets.flatMap(bet => bet.numbers);
      if (allBetNumbers.length > 0) {
        const forcedWin = allBetNumbers[Math.floor(Math.random() * allBetNumbers.length)];
        console.log(`🎯 Forcing win: ${forcedWin} (was ${naturalResult})`);
        return forcedWin;
      }
    } else {
      // Force a loss - pick number not in player's bets
      const allBetNumbers = currentBets.flatMap(bet => bet.numbers);
      const availableNumbers = rouletteNumbers.filter(num => !allBetNumbers.includes(num as number));
      if (availableNumbers.length > 0) {
        const forcedLoss = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
        console.log(`🎯 Forcing loss: ${forcedLoss} (was ${naturalResult})`);
        return forcedLoss;
      }
    }

    // Fallback to natural result
    console.log(`🎯 Fallback to natural result: ${naturalResult}`);
    return naturalResult;
  };

  const generateRouletteResult = (shouldWin: boolean): number | string => {
    console.log(`🎰 Generating roulette result - shouldWin: ${shouldWin}`);
    console.log(`🎰 Current bets:`, bets.map(bet => `${bet.type} (${bet.numbers.length} numbers)`));

    if (shouldWin && bets.length > 0) {
      // Player should win - try to find a winning number for their bets
      const allBetNumbers = bets.flatMap(bet => bet.numbers);
      console.log(`🎰 Player should WIN - bet numbers:`, allBetNumbers);

      if (allBetNumbers.length > 0) {
        // Pick a random number from their bets
        const winningNumber = allBetNumbers[Math.floor(Math.random() * allBetNumbers.length)];
        console.log(`🎰 Selected winning number: ${winningNumber}`);
        return winningNumber;
      }
    }

    // Player should lose or no specific bets - generate random number
    // For losses, try to avoid their bet numbers
    if (!shouldWin && bets.length > 0) {
      const allBetNumbers = bets.flatMap(bet => bet.numbers);
      const availableNumbers = rouletteNumbers.filter(num =>
        !allBetNumbers.includes(num as number)
      );
      console.log(`🎰 Player should LOSE - avoiding bet numbers:`, allBetNumbers);
      console.log(`🎰 Available losing numbers:`, availableNumbers);

      if (availableNumbers.length > 0) {
        const losingNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)] as number;
        console.log(`🎰 Selected losing number: ${losingNumber}`);
        return losingNumber;
      }
    }

    // Fallback to completely random
    const randomIndex = Math.floor(Math.random() * rouletteNumbers.length);
    const randomNumber = rouletteNumbers[randomIndex] as number;
    console.log(`🎰 Fallback random number: ${randomNumber}`);
    return randomNumber;
  };

  const spinWheelWithBets = (currentBets: Bet[]) => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWinningNumber(null);

    console.log(`🎲 Starting spin with bets:`, currentBets.map(bet => `${bet.type} PKR ${bet.amount}`));

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
      setWinningNumber(winning as number);
      processResultsWithBets(winning as number, currentBets);
    });
  };

  const spinWheel = () => {
    // Fallback function - use current bets state
    spinWheelWithBets(bets);
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
        // Since bet was already deducted, we need to add back the full payout
        const payout = bet.amount * (bet.multiplier + 1);
        totalWinAmount += payout;
        winningBets++;
        console.log(`🎯 ✅ WINNING BET! Payout: PKR ${payout} (${bet.amount} × ${bet.multiplier + 1})`);
      } else {
        console.log(`🎯 ❌ Losing bet`);
      }
    }

    const isOverallWin = totalWinAmount > 0;

    // Calculate profit (winnings minus bets)
    const profit = totalWinAmount - totalBetAmount;

    // Step 2: Add winnings if player won
    if (totalWinAmount > 0) {
      console.log(`ROULETTE WIN DETECTED:`);
      console.log(`- Total bet amount: PKR ${totalBetAmount}`);
      console.log(`- Total win amount: PKR ${totalWinAmount}`);
      console.log(`- Net profit: PKR ${profit}`);
      console.log(`- Calling addWinnings with: PKR ${totalWinAmount}`);

      try {
        const winningsAdded = await addWinnings(
          totalWinAmount,
          'roulette',
          `Roulette win - Number ${winning}`
        );

        if (winningsAdded) {
          console.log(`✅ Winnings added successfully: PKR ${totalWinAmount}`);
        } else {
          console.log(`❌ Failed to add winnings - addWinnings returned false`);
        }
      } catch (error) {
        console.log(`❌ Error adding winnings:`, error);
      }

      // Force balance refresh multiple times to ensure UI updates
      console.log(`Triggering balance refresh...`);
      setTimeout(() => {
        console.log(`Balance refresh 1`);
        refreshBalance();
      }, 100);
      setTimeout(() => {
        console.log(`Balance refresh 2`);
        refreshBalance();
      }, 500);
      setTimeout(() => {
        console.log(`Balance refresh 3`);
        refreshBalance();
      }, 1000);
    } else {
      console.log(`ROULETTE LOSS: No winnings to add (totalWinAmount: ${totalWinAmount})`);
    }
    // No need to deduct on loss - bet was already deducted when placed

    // Show result
    const winColor = getNumberColor(winning);

    console.log(`Roulette result: Winning number ${winning}, Total bet: PKR ${totalBetAmount}, Total winnings: PKR ${totalWinAmount}, Profit: PKR ${profit}`);

    Alert.alert(
      'Roulette Result',
      `Winning Number: ${winning} (${winColor})\n${winningBets} winning bet(s)\n${profit > 0 ? `You won PKR ${profit}!` : profit < 0 ? `You lost PKR ${Math.abs(profit)}` : 'Break even!'}`,
      [{
        text: 'OK',
        onPress: () => {
          console.log('Alert OK pressed'); // Debug log
          resetGame();
        }
      }],
      {
        cancelable: false,
        onDismiss: () => {
          console.log('Alert dismissed'); // Debug log
          resetGame();
        }
      }
    );

    // Backup automatic reset after 5 seconds in case Alert doesn't work
    setTimeout(() => {
      console.log('Backup reset triggered');
      resetGame();
    }, 5000);
  };

  const processResults = async (winning: number) => {
    // Fallback function - use current bets state
    processResultsWithBets(winning, bets);
  };

  const resetGame = () => {
    console.log('Resetting roulette game...'); // Debug log

    // Force reset all states
    setBets([]);
    setSelectedNumbers([]);
    setWinningNumber(null);
    setIsSpinning(false);
    setSelectedBetType('number');

    // Reset wheel animation
    wheelRotation.stopAnimation();
    wheelRotation.setValue(0);

    console.log('Roulette game reset complete'); // Debug log
  };

  const forceReset = () => {
    console.log('Force resetting roulette game...');

    // Stop any running animations
    wheelRotation.stopAnimation();

    // Reset all states immediately
    setBets([]);
    setSelectedNumbers([]);
    setWinningNumber(null);
    setIsSpinning(false);
    setSelectedBetType('number');
    wheelRotation.setValue(0);

    console.log('Force reset complete');
  };

  const toggleNumber = (num: number) => {
    if (selectedBetType !== 'number') return;
    
    setSelectedNumbers(prev => {
      if (prev.includes(num)) {
        return prev.filter(n => n !== num);
      } else {
        return [...prev, num];
      }
    });
  };

  const renderNumberGrid = () => {
    const numbers = [];
    
    // Add 0 and 00
    numbers.push(
      <TouchableOpacity
        key="0"
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
        onPress={() => toggleNumber(-1)} // Use -1 for 00
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎡 Roulette</Text>
      <Text style={styles.subtitle}>Place your bets and spin the wheel!</Text>

      {/* Roulette Wheel */}
      <View style={styles.wheelContainer}>
        <View style={styles.wheelOuter}>
          <Animated.View
            style={[
              styles.wheel,
              {
                width: WHEEL_SIZE,
                height: WHEEL_SIZE,
                transform: [{ rotate: wheelRotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                })}]
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

          {/* Wheel pointer */}
          <View style={styles.wheelPointer}>
            <Text style={styles.wheelPointerText}>▼</Text>
          </View>
        </View>

        {winningNumber !== null && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              Winning: {winningNumber === -1 ? '00' : winningNumber}
            </Text>
            <Text style={[
              styles.resultColor,
              { color: getNumberColor(winningNumber) === 'red' ? '#ff4444' :
                      getNumberColor(winningNumber) === 'black' ? '#000000' : '#00aa00' }
            ]}>
              {getNumberColor(winningNumber).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Bet Type Selection */}
      {!isSpinning && (
        <View style={styles.betTypeContainer}>
          <Text style={styles.sectionTitle}>Bet Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.betTypes}>
              {betTypes.map(betType => (
                <TouchableOpacity
                  key={betType.id}
                  style={[
                    styles.betTypeButton,
                    selectedBetType === betType.id && styles.selectedBetType
                  ]}
                  onPress={() => {
                    setSelectedBetType(betType.id);
                    setSelectedNumbers([]);
                  }}
                >
                  <Text style={styles.betTypeText}>{betType.name}</Text>
                  <Text style={styles.betTypeMultiplier}>{betType.multiplier + 1}:1</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Number Selection (only for single number bets) */}
      {!isSpinning && selectedBetType === 'number' && (
        <View style={styles.numberGridContainer}>
          <Text style={styles.sectionTitle}>Select Numbers:</Text>
          <ScrollView
            horizontal
            style={styles.numberGrid}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.numberGridContent}
          >
            <View style={styles.numbersContainer}>
              {renderNumberGrid()}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Current Bets */}
      {bets.length > 0 && (
        <View style={styles.betsContainer}>
          <Text style={styles.sectionTitle}>Current Bets:</Text>
          {bets.map((bet, index) => (
            <Text key={index} style={styles.betText}>
              PKR {bet.amount} on {bet.type} ({bet.multiplier + 1}:1)
            </Text>
          ))}
        </View>
      )}

      {/* Manual Reset Button (if game gets stuck) */}
      {(isSpinning || winningNumber !== null) && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={forceReset}
        >
          <Text style={styles.resetButtonText}>New Game</Text>
        </TouchableOpacity>
      )}

      {/* Betting Panel */}
      {!isSpinning && (
        <BettingPanel
          balance={balance}
          minBet={10}
          maxBet={balance || 1000}
          onBet={placeRouletteBet}
          disabled={isSpinning}
        />
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
  wheelContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  wheelOuter: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  wheel: {
    backgroundColor: '#8B4513',
    borderRadius: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: Colors.primary.gold,
    position: 'relative',
  },
  wheelNumber: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  wheelNumberText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  wheelCenter: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.gold,
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  },
  wheelCenterText: {
    fontSize: 20,
  },
  wheelPointer: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
  },
  wheelPointerText: {
    fontSize: 20,
    color: Colors.primary.gold,
  },
  resultContainer: {
    backgroundColor: Colors.primary.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  resultColor: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  betTypeContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
  },
  betTypes: {
    flexDirection: 'row',
    gap: 8,
  },
  betTypeButton: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
    minWidth: 80,
  },
  selectedBetType: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  betTypeText: {
    fontSize: 12,
    color: Colors.primary.text,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  betTypeMultiplier: {
    fontSize: 10,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
  numberGridContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
    height: 120,
  },
  numberGrid: {
    height: 100,
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  numberGridContent: {
    padding: 10,
    paddingHorizontal: 15,
  },
  numbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  redNumber: {
    backgroundColor: '#ff4444',
  },
  blackNumber: {
    backgroundColor: '#333333',
  },
  greenNumber: {
    backgroundColor: '#00aa00',
  },
  selectedNumber: {
    borderColor: Colors.primary.gold,
    borderWidth: 3,
  },
  numberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  betsContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    width: '90%',
  },
  betText: {
    fontSize: 14,
    color: Colors.primary.text,
    marginBottom: 4,
  },
  resetButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: Colors.primary.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
