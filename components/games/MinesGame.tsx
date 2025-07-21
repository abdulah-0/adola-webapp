// Enhanced Mines Game for Adola App
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';
import { AdvancedGameLogicService } from '../../services/advancedGameLogicService';
import WebMinesGame from './web/WebMinesGame';

const { width } = Dimensions.get('window');
const BOARD_SIZE = Math.min(width - 40, 350);

const GRID_SIZE = 5;

export default function MinesGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    return <WebMinesGame />;
  }

  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings } = useWallet();
  const [mineCount, setMineCount] = useState(3);
  const [betAmount, setBetAmount] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [mineGrid, setMineGrid] = useState<boolean[][]>([]);
  const [revealedGrid, setRevealedGrid] = useState<boolean[][]>([]);
  const [revealedSafeCells, setRevealedSafeCells] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [gameWinProbability, setGameWinProbability] = useState(0);
  const [engagementBonus, setEngagementBonus] = useState<string>('');

  const gameLogicService = AdvancedGameLogicService.getInstance();

  // Create mines grid with win rate consideration
  const createMinesGrid = (size: number, mines: number, shouldPlayerWin: boolean) => {
    const grid = Array(size).fill(null).map(() => Array(size).fill(false));
    let minesPlaced = 0;

    // If player should lose, place mines more strategically (early positions)
    if (!shouldPlayerWin) {
      // Place some mines in early positions (first few clicks are more likely)
      const earlyPositions = [];
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (i < 2 || j < 2) { // First 2 rows and columns
            earlyPositions.push([i, j]);
          }
        }
      }

      // Place 60% of mines in early positions for losses
      const earlyMines = Math.floor(mines * 0.6);
      for (let i = 0; i < earlyMines && minesPlaced < mines; i++) {
        if (earlyPositions.length > 0) {
          const randomIndex = Math.floor(Math.random() * earlyPositions.length);
          const [row, col] = earlyPositions[randomIndex];
          if (!grid[row][col]) {
            grid[row][col] = true;
            minesPlaced++;
          }
          earlyPositions.splice(randomIndex, 1);
        }
      }
    }

    // Place remaining mines randomly
    while (minesPlaced < mines) {
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);

      if (!grid[row][col]) {
        grid[row][col] = true;
        minesPlaced++;
      }
    }

    return grid;
  };

  // Calculate multiplier based on revealed safe cells
  const calculateMinesMultiplier = (safeCells: number, totalMines: number, totalCells: number) => {
    if (safeCells === 0) return 1;

    // Simple multiplier calculation: each safe cell increases multiplier
    // Base multiplier increases with mine count and safe cells revealed
    const baseMultiplier = 1 + (safeCells * 0.3); // 0.3x per safe cell
    const mineBonus = 1 + (totalMines * 0.1); // 0.1x bonus per mine

    return Math.max(1, baseMultiplier * mineBonus);
  };

  const startGame = async (amount: number) => {
    try {
      // Check if user can place bet using advanced game logic
      if (!gameLogicService.canPlayGame(amount, balance || 0, 'mines')) {
        const message = gameLogicService.getBalanceValidationMessage(amount, balance || 0, 'mines');
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
        basePayout: 2.0, // Base multiplier for mines game
        gameType: 'mines',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { mineCount }
      });

      setGameWinProbability(probability);
      setEngagementBonus(bonus);

      console.log(`🎯 Mines Game: Win probability ${(probability * 100).toFixed(1)}%, Mine count: ${mineCount}`);
      if (bonus) {
        console.log(`🎯 Engagement bonus: ${bonus}`);
      }

      // Step 1: Deduct bet amount immediately
      const betPlaced = await placeBet(amount, 'mines', `Mines game bet - ${mineCount} mines`);

      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }
    } catch (error) {
      console.error('❌ Error starting game:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
      return;
    }

    setBetAmount(amount);
    setGameActive(true);
    setRevealedSafeCells(0);
    setCurrentMultiplier(1);

    // Determine if player should win based on advanced game logic
    const shouldPlayerWin = Math.random() < gameWinProbability;

    // Create new mine grid with win rate consideration
    const newMineGrid = createMinesGrid(GRID_SIZE, mineCount, shouldPlayerWin);
    setMineGrid(newMineGrid);

    // Reset revealed grid
    const newRevealedGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    setRevealedGrid(newRevealedGrid);
  };

  const revealCell = (row: number, col: number) => {
    if (!gameActive || revealedGrid[row][col]) return;

    const newRevealedGrid = [...revealedGrid];
    newRevealedGrid[row][col] = true;
    setRevealedGrid(newRevealedGrid);

    if (mineGrid[row][col]) {
      // Hit a mine - game over
      endGame(false);
    } else {
      // Safe cell - update multiplier
      const newRevealedSafeCells = revealedSafeCells + 1;
      setRevealedSafeCells(newRevealedSafeCells);
      
      const newMultiplier = calculateMinesMultiplier(newRevealedSafeCells, mineCount, GRID_SIZE);
      setCurrentMultiplier(newMultiplier);
    }
  };

  const cashOut = async () => {
    console.log('💰 Cash out initiated...');
    console.log('🔍 Game state - gameActive:', gameActive, 'revealedSafeCells:', revealedSafeCells);

    if (!gameActive || revealedSafeCells === 0 || !user?.id) {
      console.log('❌ Cash out blocked - invalid game state');
      return;
    }

    try {
      // Calculate payout using advanced game logic
      const finalPayout = await gameLogicService.calculatePayout({
        betAmount,
        basePayout: currentMultiplier,
        gameType: 'mines',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: {
          mineCount,
          revealedSafeCells,
          currentMultiplier,
          gameWinProbability
        }
      });

      console.log(`💰 Advanced payout calculation: PKR ${finalPayout} (base: ${Math.floor(betAmount * currentMultiplier)})`);

      // Log the game result for analytics
      await gameLogicService.logGameResult(user.id, 'mines', {
        won: true,
        multiplier: currentMultiplier,
        winAmount: finalPayout,
        betAmount,
        newBalance: (balance || 0) + finalPayout - betAmount,
        adjustedProbability: gameWinProbability,
        houseEdge: gameLogicService.getGameConfig('mines').houseEdge,
        engagementBonus
      }, {
        mineCount,
        revealedSafeCells,
        totalCells: GRID_SIZE * GRID_SIZE,
        cashOutMultiplier: currentMultiplier
      });

      // Add winnings to balance
      const success = await addWinnings(
        finalPayout,
        'mines',
        `Mines game win - ${currentMultiplier.toFixed(2)}x multiplier`
      );

      console.log('💰 addWinnings result:', success);

      if (success) {
        let message = `You won PKR ${finalPayout.toLocaleString()} with ${currentMultiplier.toFixed(2)}x multiplier!`;
        if (engagementBonus) {
          message += `\n\n🎯 ${engagementBonus}`;
        }
        Alert.alert(
          'Cashed Out!',
          message,
          [{ text: 'OK', onPress: () => {
            console.log('🔄 Alert OK pressed, calling resetGame...');
            resetGame();
          }}]
        );
      } else {
        Alert.alert('Error', 'Failed to process game result', [{ text: 'OK', onPress: () => {
          console.log('🔄 Error alert OK pressed, calling resetGame...');
          resetGame();
        }}]);
      }
    } catch (error) {
      console.error('❌ Error in cashOut:', error);
      Alert.alert('Error', 'Failed to cash out. Please try again.', [{ text: 'OK', onPress: () => {
        console.log('🔄 Exception alert OK pressed, calling resetGame...');
        resetGame();
      }}]);
    }
  };

  const endGame = async (won: boolean) => {
    setGameActive(false);

    if (!won && user?.id) {
      // Log the game loss for analytics
      await gameLogicService.logGameResult(user.id, 'mines', {
        won: false,
        multiplier: 0,
        winAmount: 0,
        betAmount,
        newBalance: (balance || 0) - betAmount,
        adjustedProbability: gameWinProbability,
        houseEdge: gameLogicService.getGameConfig('mines').houseEdge,
        engagementBonus
      }, {
        mineCount,
        revealedSafeCells,
        totalCells: GRID_SIZE * GRID_SIZE,
        hitMine: true
      });

      // No need to deduct again - bet was already deducted when placed
      Alert.alert(
        'Game Over!',
        `You hit a mine! You lost PKR ${betAmount.toLocaleString()}. Better luck next time.`,
        [{ text: 'OK', onPress: resetGame }]
      );
    }
  };

  const resetGame = () => {
    console.log('🔄 Resetting Mines game...');
    setGameActive(false);
    setBetAmount(0);
    setRevealedSafeCells(0);
    setCurrentMultiplier(1);
    setMineGrid([]);
    setRevealedGrid([]);
    setGameWinProbability(0);
    setEngagementBonus('');
    console.log('✅ Mines game reset complete');
  };

  const renderGrid = () => {
    const grid = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowCells = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const isRevealed = revealedGrid[row] && revealedGrid[row][col];
        const isMine = mineGrid[row] && mineGrid[row][col];
        
        rowCells.push(
          <TouchableOpacity
            key={`${row}-${col}`}
            style={[
              styles.cell,
              isRevealed && (isMine ? styles.mineCell : styles.safeCell)
            ]}
            onPress={() => revealCell(row, col)}
            disabled={!gameActive || isRevealed}
          >
            {isRevealed && (
              <Text style={[
                styles.cellEmoji,
                { color: isMine ? Colors.primary.hotPink : Colors.primary.neonCyan }
              ]}>
                {isMine ? '💣' : '💎'}
              </Text>
            )}
          </TouchableOpacity>
        );
      }
      grid.push(
        <View key={row} style={styles.gridRow}>
          {rowCells}
        </View>
      );
    }
    
    return grid;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💣 Mines</Text>
      <Text style={styles.subtitle}>Avoid the mines and cash out at the right time!</Text>

      {/* Mine Count Selection */}
      <View style={styles.mineSelection}>
        <Text style={styles.sectionTitle}>Number of Mines:</Text>
        <View style={styles.mineButtons}>
          {[1, 3, 5, 7].map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.mineButton,
                mineCount === count && styles.selectedMineButton
              ]}
              onPress={() => setMineCount(count)}
              disabled={gameActive}
            >
              <Text style={[
                styles.mineButtonText,
                mineCount === count && styles.selectedMineButtonText
              ]}>
                {count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Game Info */}
      {gameActive && (
        <View style={styles.gameInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bet Amount:</Text>
            <Text style={styles.infoValue}>PKR {betAmount}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Multiplier:</Text>
            <Text style={styles.multiplierValue}>{currentMultiplier.toFixed(2)}x</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Potential Win:</Text>
            <Text style={styles.winValue}>PKR {Math.floor(betAmount * currentMultiplier)}</Text>
          </View>
        </View>
      )}

      {/* Game Grid */}
      <View style={styles.gameBoard}>
        {renderGrid()}
      </View>

      {/* Cash Out Button */}
      {gameActive && revealedSafeCells > 0 && (
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
  mineSelection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 12,
  },
  mineButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
  },
  selectedMineButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  mineButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  selectedMineButtonText: {
    fontWeight: 'bold',
  },
  gameInfo: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#cccccc',
  },
  infoValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  multiplierValue: {
    fontSize: 14,
    color: '#ffaa00',
    fontWeight: 'bold',
  },
  winValue: {
    fontSize: 14,
    color: '#00ff00',
    fontWeight: 'bold',
  },
  gameBoard: {
    alignItems: 'center',
    margin: 16,
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.primary.border,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primary.card,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 8,
  },
  mineCell: {
    backgroundColor: Colors.primary.hotPink,
  },
  safeCell: {
    backgroundColor: Colors.primary.neonCyan,
  },
  cellEmoji: {
    fontSize: 20,
  },
  cashOutButton: {
    backgroundColor: '#00ff00',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cashOutText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
});
