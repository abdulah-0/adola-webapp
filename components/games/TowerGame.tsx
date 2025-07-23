// Tower Challenge Game for Adola App
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
const TOWER_WIDTH = Math.min(width - 40, 350);
const FLOORS = 8;
const ROOMS_PER_FLOOR = 3;

export default function TowerGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [gameActive, setGameActive] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [bombPositions, setBombPositions] = useState<number[]>([]);
  const [revealedRooms, setRevealedRooms] = useState<{ floor: number; room: number; isBomb: boolean }[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [gameWinProbability, setGameWinProbability] = useState(0);
  const [engagementBonus, setEngagementBonus] = useState<string>('');

  const gameLogicService = AdvancedGameLogicService.getInstance();

  // Generate bomb positions for each floor
  const generateBombPositions = () => {
    const bombs = [];
    for (let floor = 0; floor < FLOORS; floor++) {
      const bombRoom = Math.floor(Math.random() * ROOMS_PER_FLOOR);
      bombs.push(bombRoom);
    }
    return bombs;
  };

  // Calculate multiplier based on current floor
  const calculateMultiplier = (floor: number) => {
    if (floor === 0) return 1;
    // Each floor increases multiplier exponentially
    return Math.pow(1.5, floor);
  };

  const startGame = async (amount: number) => {
    try {
      // Check if user can place bet using advanced game logic
      if (!gameLogicService.canPlayGame(amount, balance || 0, 'tower')) {
        const message = gameLogicService.getBalanceValidationMessage(amount, balance || 0, 'tower');
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
        basePayout: calculateMultiplier(FLOORS), // Max possible multiplier
        gameType: 'tower',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { floors: FLOORS, roomsPerFloor: ROOMS_PER_FLOOR }
      });

      setGameWinProbability(probability);
      setEngagementBonus(bonus);

      console.log(`🎯 Tower Game: Win probability ${(probability * 100).toFixed(1)}%, Floors: ${FLOORS}`);
      if (bonus) {
        console.log(`🎯 Engagement bonus: ${bonus}`);
      }

      // Step 1: Deduct bet amount immediately
      console.log(`Placing Tower bet: PKR ${amount}`);
      const betPlaced = await placeBet(amount, 'tower', 'Tower game bet placed');
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }
      console.log(`Bet placed successfully: PKR ${amount} deducted`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);

      setBetAmount(amount);
      setGameActive(true);
      setCurrentFloor(0);
      setRevealedRooms([]);
      setCurrentMultiplier(1);
      setBombPositions(generateBombPositions());
    } catch (error) {
      console.error('❌ Error starting Tower game:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  const determineBombOutcome = (floor: number, room: number): boolean => {
    // Use advanced game logic to determine if player should win this round - REDUCED WIN RATE
    const shouldWin = Math.random() < (gameWinProbability * 0.5); // Reduce win probability by 50%

    if (shouldWin) {
      // Player should win - avoid bombs for now
      // Allow player to progress further up the tower
      const progressChance = Math.max(0.7, 1 - (floor * 0.1)); // Higher floors = higher bomb chance even when winning
      const shouldHitBomb = Math.random() > progressChance;

      if (shouldHitBomb) {
        console.log(`🎯 Strategic bomb placement: Player should win but hit bomb on floor ${floor + 1} for controlled progression`);
        return true;
      } else {
        console.log(`🎯 Strategic safe room: Player should win, allowing progression from floor ${floor + 1}`);
        return false;
      }
    } else {
      // Player should lose - higher chance of hitting bombs
      const bombChance = Math.min(0.8, 0.4 + (floor * 0.1)); // Higher floors = higher bomb chance
      const shouldHitBomb = Math.random() < bombChance;

      if (shouldHitBomb) {
        console.log(`🎯 Strategic bomb placement: Player should lose, bomb on floor ${floor + 1}`);
        return true;
      } else {
        console.log(`🎯 Strategic safe room: Player should lose but allowing some progression from floor ${floor + 1}`);
        return false;
      }
    }
  };

  const selectRoom = async (floor: number, room: number) => {
    if (!gameActive || floor !== currentFloor) return;

    // Strategic bomb placement based on advanced game logic
    const isBomb = determineBombOutcome(floor, room);

    console.log(`Tower: Floor ${floor + 1}, Room ${room + 1}, Win probability: ${(gameWinProbability * 100).toFixed(1)}%, Is bomb: ${isBomb}`);

    if (isBomb) {
      // Hit a bomb - game over
      setRevealedRooms(prev => [...prev, { floor, room, isBomb: true }]);
      console.log(`💣 Player hit bomb on floor ${floor + 1}, room ${room + 1}`);
      await endGame(false);
    } else {
      // Safe room - advance to next floor
      setRevealedRooms(prev => [...prev, { floor, room, isBomb: false }]);
      const nextFloor = floor + 1;

      console.log(`✅ Safe room! Advancing to floor ${nextFloor + 1}`);

      if (nextFloor >= FLOORS) {
        // Reached the top - auto cash out
        console.log(`🏆 Reached top floor! Auto cash out with ${calculateMultiplier(FLOORS).toFixed(2)}x`);
        await endGame(true, calculateMultiplier(FLOORS));
      } else {
        setCurrentFloor(nextFloor);
        setCurrentMultiplier(calculateMultiplier(nextFloor));
      }
    }
  };

  const cashOut = async () => {
    if (!gameActive || currentFloor === 0) return;
    await endGame(true, currentMultiplier);
  };

  const endGame = async (isWin: boolean, multiplier: number = 0) => {
    console.log(`🏁 Tower game ending: isWin=${isWin}, multiplier=${multiplier}, currentFloor=${currentFloor + 1}`);
    setGameActive(false);

    if (!user?.id) {
      console.error('❌ User ID not found for game logging');
      return;
    }

    try {
      let finalWinAmount = 0;

      if (isWin && multiplier > 0) {
        // Calculate payout using advanced game logic
        finalWinAmount = await gameLogicService.calculatePayout({
          betAmount,
          basePayout: multiplier,
          gameType: 'tower',
          userId: user.id,
          currentBalance: balance || 0,
          gameSpecificData: {
            currentFloor: currentFloor + 1,
            totalFloors: FLOORS,
            gameWinProbability
          }
        });

        console.log(`💰 Advanced payout calculation: PKR ${finalWinAmount} (base: ${Math.floor(betAmount * multiplier)})`);

        // Add winnings to balance
        console.log(`Adding Tower winnings: PKR ${finalWinAmount}`);
        const winningsAdded = await addWinnings(
          finalWinAmount,
          'tower',
          `Tower game cash out at floor ${currentFloor + 1} - ${multiplier.toFixed(2)}x`
        );

        if (winningsAdded) {
          console.log(`Winnings added successfully: PKR ${finalWinAmount}`);
        } else {
          console.log('Failed to add winnings');
        }

        // Force balance refresh to ensure UI updates
        setTimeout(() => refreshBalance(), 500);
      }

      // Log the game result for analytics
      await gameLogicService.logGameResult(user.id, 'tower', {
        won: isWin,
        multiplier: isWin ? multiplier : 0,
        winAmount: finalWinAmount,
        betAmount,
        newBalance: isWin ? (balance || 0) + finalWinAmount - betAmount : (balance || 0) - betAmount,
        adjustedProbability: gameWinProbability,
        houseEdge: gameLogicService.getGameConfig('tower').houseEdge,
        engagementBonus
      }, {
        currentFloor: currentFloor + 1,
        totalFloors: FLOORS,
        roomsPerFloor: ROOMS_PER_FLOOR,
        finalMultiplier: multiplier,
        revealedRooms: revealedRooms.length
      });

      if (isWin) {
        let message = `You cashed out at floor ${currentFloor + 1}!\nMultiplier: ${multiplier.toFixed(2)}x\nYou won PKR ${finalWinAmount.toLocaleString()}!`;
        if (engagementBonus) {
          message += `\n\n🎯 ${engagementBonus}`;
        }
        Alert.alert(
          'Success!',
          message,
          [{ text: 'OK', onPress: resetGame }]
        );
      } else {
        Alert.alert(
          'Boom!',
          `You hit a bomb on floor ${currentFloor + 1}!\nBetter luck next time!`,
          [{ text: 'OK', onPress: resetGame }]
        );
      }
    } catch (error) {
      console.error('❌ Error in Tower endGame:', error);
      Alert.alert('Error', 'An error occurred while ending the game.', [{ text: 'OK', onPress: resetGame }]);
    }
  };

  const resetGame = () => {
    console.log('🔄 Resetting Tower game...');
    setGameActive(false);
    setBetAmount(0);
    setCurrentFloor(0);
    setRevealedRooms([]);
    setCurrentMultiplier(1);
    setBombPositions([]);
    setGameWinProbability(0);
    setEngagementBonus('');
    console.log('✅ Tower game reset complete');
  };

  const isRoomRevealed = (floor: number, room: number) => {
    return revealedRooms.some(r => r.floor === floor && r.room === room);
  };

  const getRoomContent = (floor: number, room: number) => {
    if (!isRoomRevealed(floor, room)) return '';

    const revealedRoom = revealedRooms.find(r => r.floor === floor && r.room === room);
    if (!revealedRoom) return '';

    return revealedRoom.isBomb ? '💣' : '💎';
  };

  const getRoomStyle = (floor: number, room: number) => {
    const isRevealed = isRoomRevealed(floor, room);
    const revealedRoom = revealedRooms.find(r => r.floor === floor && r.room === room);
    const isBomb = isRevealed && revealedRoom?.isBomb;
    const isSafe = isRevealed && !revealedRoom?.isBomb;
    const isCurrentFloorRoom = floor === currentFloor && gameActive;

    return [
      styles.room,
      isCurrentFloorRoom && styles.activeRoom,
      isBomb && styles.bombRoom,
      isSafe && styles.safeRoom,
    ];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏗️ Tower Challenge</Text>
      <Text style={styles.subtitle}>Climb the tower, avoid bombs, win big!</Text>

      {/* Game Info */}
      {gameActive && (
        <View style={styles.gameInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Floor:</Text>
            <Text style={styles.infoValue}>{currentFloor + 1}/{FLOORS}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Multiplier:</Text>
            <Text style={styles.multiplierValue}>{currentMultiplier.toFixed(2)}x</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Potential Win:</Text>
            <Text style={styles.winValue}>PKR {Math.floor(betAmount * currentMultiplier)}</Text>
          </View>
        </View>
      )}

      {/* Tower */}
      <ScrollView style={styles.towerContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.tower, { width: TOWER_WIDTH }]}>
          {Array.from({ length: FLOORS }, (_, floorIndex) => {
            const floor = FLOORS - 1 - floorIndex; // Start from top floor
            return (
              <View key={floor} style={styles.floor}>
                <Text style={styles.floorLabel}>Floor {floor + 1}</Text>
                <View style={styles.roomsContainer}>
                  {Array.from({ length: ROOMS_PER_FLOOR }, (_, roomIndex) => (
                    <TouchableOpacity
                      key={roomIndex}
                      style={getRoomStyle(floor, roomIndex)}
                      onPress={() => selectRoom(floor, roomIndex)}
                      disabled={!gameActive || floor !== currentFloor}
                    >
                      <Text style={styles.roomContent}>
                        {getRoomContent(floor, roomIndex)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Cash Out Button */}
      {gameActive && currentFloor > 0 && (
        <TouchableOpacity style={styles.cashOutButton} onPress={cashOut}>
          <Text style={styles.cashOutText}>
            Cash Out - PKR {Math.floor(betAmount * currentMultiplier)}
          </Text>
        </TouchableOpacity>
      )}

      {/* Betting Panel */}
      {!gameActive && (
        <BettingPanel
          balance={balance}
          minBet={10}
          maxBet={balance || 1000}
          onBet={startGame}
          disabled={gameActive}
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
  gameInfo: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    width: '90%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.primary.text,
    fontWeight: 'bold',
  },
  multiplierValue: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
  winValue: {
    fontSize: 14,
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
  },
  towerContainer: {
    flex: 1,
    width: '100%',
  },
  tower: {
    alignSelf: 'center',
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.primary.border,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  floor: {
    marginBottom: 16,
    alignItems: 'center',
  },
  floorLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  roomsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  room: {
    width: 60,
    height: 60,
    backgroundColor: Colors.primary.card,
    borderWidth: 2,
    borderColor: Colors.primary.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  activeRoom: {
    borderColor: Colors.primary.neonCyan,
    backgroundColor: Colors.primary.surface,
  },
  bombRoom: {
    backgroundColor: Colors.primary.hotPink,
    borderColor: Colors.primary.hotPink,
  },
  safeRoom: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  roomContent: {
    fontSize: 24,
  },
  cashOutButton: {
    backgroundColor: Colors.primary.gold,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '90%',
  },
  cashOutText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
});
