// Web-specific Mines Game - Vertically Scrollable Layout
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useApp } from '../../../contexts/AppContext';
import { useWallet } from '../../../contexts/WalletContext';
import BettingPanel from '../../BettingPanel';
import { AdvancedGameLogicService } from '../../../services/advancedGameLogicService';

const { width } = Dimensions.get('window');
const GRID_SIZE = 5;

export default function WebMinesGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
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
      
      // Place 60% of mines in early positions
      const earlyMines = Math.floor(mines * 0.6);
      for (let i = 0; i < earlyMines && minesPlaced < mines; i++) {
        if (earlyPositions.length > 0) {
          const randomIndex = Math.floor(Math.random() * earlyPositions.length);
          const [row, col] = earlyPositions[randomIndex];
          grid[row][col] = true;
          minesPlaced++;
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

  const calculateMultiplier = (safeCells: number, totalMines: number) => {
    const totalCells = GRID_SIZE * GRID_SIZE;
    const safeCellsTotal = totalCells - totalMines;
    
    if (safeCells === 0) return 1;
    
    // Progressive multiplier calculation
    let multiplier = 1;
    for (let i = 1; i <= safeCells; i++) {
      const remainingSafeCells = safeCellsTotal - i + 1;
      const remainingTotalCells = totalCells - i + 1;
      const probability = remainingSafeCells / remainingTotalCells;
      multiplier *= (1 / probability) * 0.95; // 5% house edge
    }
    
    return Math.max(multiplier, 1);
  };

  const startGame = async (amount: number) => {
    console.log(`🎲 WebMinesGame startGame called with amount: ${amount}`);
    console.log(`🎲 Current balance: ${balance}, canPlaceBet: ${canPlaceBet(amount)}`);
    console.log(`🎲 Game active: ${gameActive}, Mine count: ${mineCount}`);

    if (!canPlaceBet(amount)) {
      console.log(`❌ Cannot place bet - insufficient balance`);
      Alert.alert('Insufficient Balance', 'You do not have enough balance to place this bet.');
      return;
    }

    console.log(`🎲 Starting Mines game with PKR ${amount}, ${mineCount} mines`);

    try {
      // Step 1: Deduct bet amount immediately with proper error handling
      console.log(`💰 Placing bet: PKR ${amount}`);
      const betPlaced = await placeBet(amount, 'mines', `Mines game bet - ${mineCount} mines`);
      if (!betPlaced) {
        console.log(`❌ Bet placement failed`);
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      console.log(`✅ Bet placed successfully: PKR ${amount} deducted`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);

      setBetAmount(amount);
      setGameActive(true);
      setRevealedSafeCells(0);
      setCurrentMultiplier(1);

      // Use simple 20% win rate like other games
      const shouldPlayerWin = Math.random() < 0.2;
      console.log(`🎯 Player should win: ${shouldPlayerWin} (20% chance)`);

      // Create grid based on outcome
      const grid = createMinesGrid(GRID_SIZE, mineCount, shouldPlayerWin);
      setMineGrid(grid);
      setRevealedGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false)));

      console.log('✅ Mines game started successfully');
    } catch (error) {
      console.error('❌ Error starting Mines game:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  const revealCell = (row: number, col: number) => {
    if (!gameActive || revealedGrid[row][col]) return;

    const newRevealedGrid = [...revealedGrid];
    newRevealedGrid[row][col] = true;
    setRevealedGrid(newRevealedGrid);

    if (mineGrid[row][col]) {
      // Hit a mine - game over
      console.log('💥 Player hit a mine!');
      endGame(false);
    } else {
      // Safe cell revealed
      const newSafeCells = revealedSafeCells + 1;
      setRevealedSafeCells(newSafeCells);
      
      const newMultiplier = calculateMultiplier(newSafeCells, mineCount);
      setCurrentMultiplier(newMultiplier);
      
      console.log(`💎 Safe cell revealed! Total: ${newSafeCells}, Multiplier: ${newMultiplier.toFixed(2)}x`);
    }
  };

  const cashOut = async () => {
    console.log(`🔘 Cash out button clicked!`);
    console.log(`🔍 Game state - gameActive: ${gameActive}, revealedSafeCells: ${revealedSafeCells}`);
    console.log(`🔍 Current multiplier: ${currentMultiplier}, Bet amount: ${betAmount}`);

    if (!gameActive || revealedSafeCells === 0) {
      console.log(`❌ Cash out blocked - invalid game state`);
      return;
    }

    try {
      console.log(`💰 Cashing out with ${currentMultiplier.toFixed(2)}x multiplier`);

      // Calculate final payout (simple calculation)
      const finalPayout = Math.floor(betAmount * currentMultiplier);

      console.log(`💰 Final payout calculated: PKR ${finalPayout} (bet: ${betAmount} x multiplier: ${currentMultiplier})`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);

      // Add winnings to balance
      const success = await addWinnings(
        finalPayout,
        'mines',
        `Mines game cash out - ${currentMultiplier.toFixed(2)}x multiplier`
      );

      console.log('💰 addWinnings result:', success);

      if (success) {
        const message = `You won PKR ${finalPayout.toLocaleString()} with ${currentMultiplier.toFixed(2)}x multiplier!`;

        Alert.alert(
          'Cashed Out!',
          message,
          [{ text: 'OK', onPress: () => {
            console.log('🔄 Alert OK pressed, calling resetGame...');
            resetGame();
          }}]
        );
      } else {
        console.log('❌ Failed to add winnings');
        Alert.alert('Error', 'Failed to add winnings. Please contact support.', [{ text: 'OK', onPress: () => {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>💣 Mines</Text>
        <Text style={styles.subtitle}>Avoid the mines and cash out at the right time!</Text>
      </View>

      {/* Mine Configuration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Configuration</Text>
        <View style={styles.configCard}>
          <Text style={styles.configLabel}>Number of Mines:</Text>
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
          <Text style={styles.configDescription}>
            More mines = Higher multipliers but greater risk
          </Text>
        </View>
      </View>

      {/* Game Statistics Section */}
      {gameActive && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Game</Text>
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Bet Amount:</Text>
              <Text style={styles.statValue}>PKR {betAmount.toLocaleString()}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Mines:</Text>
              <Text style={styles.statValue}>{mineCount}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Safe Cells Found:</Text>
              <Text style={styles.statValue}>{revealedSafeCells}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current Multiplier:</Text>
              <Text style={styles.multiplierValue}>{currentMultiplier.toFixed(2)}x</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Potential Win:</Text>
              <Text style={styles.winValue}>PKR {Math.floor(betAmount * currentMultiplier).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Game Board Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Board</Text>
        <View style={styles.gameBoard}>
          {renderGrid()}
        </View>

        {/* Cash Out Button */}
        {gameActive && revealedSafeCells > 0 && (
          <TouchableOpacity style={styles.cashOutButton} onPress={cashOut}>
            <Text style={styles.cashOutText}>
              💰 Cash Out - PKR {Math.floor(betAmount * currentMultiplier).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Betting Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Place Your Bet</Text>
        {!gameActive ? (
          <BettingPanel
            balance={balance}
            minBet={10}
            maxBet={balance || 1000}
            onBet={startGame}
            disabled={gameActive}
          />
        ) : (
          <View style={styles.gameActiveCard}>
            <Text style={styles.gameActiveText}>🎮 Game in Progress</Text>
            <Text style={styles.gameActiveSubtext}>Click on cells to reveal them or cash out anytime!</Text>
          </View>
        )}
      </View>

      {/* Game Instructions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Play</Text>
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionText}>• Choose the number of mines (1-7)</Text>
          <Text style={styles.instructionText}>• Place your bet to start the game</Text>
          <Text style={styles.instructionText}>• Click on cells to reveal them</Text>
          <Text style={styles.instructionText}>• Find diamonds (💎) to increase your multiplier</Text>
          <Text style={styles.instructionText}>• Avoid mines (💣) or you'll lose your bet</Text>
          <Text style={styles.instructionText}>• Cash out anytime to secure your winnings</Text>
          <Text style={styles.instructionText}>• More mines = higher multipliers but greater risk</Text>
        </View>
      </View>

      {/* Strategy Tips Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strategy Tips</Text>
        <View style={styles.tipsCard}>
          <Text style={styles.tipText}>🎯 <Text style={styles.tipBold}>Conservative:</Text> Use 1-3 mines for steady wins</Text>
          <Text style={styles.tipText}>⚡ <Text style={styles.tipBold}>Aggressive:</Text> Use 5-7 mines for big multipliers</Text>
          <Text style={styles.tipText}>💡 <Text style={styles.tipBold}>Smart:</Text> Cash out early to secure profits</Text>
          <Text style={styles.tipText}>🎲 <Text style={styles.tipBold}>Risk Management:</Text> Don't chase losses</Text>
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
  configCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  configLabel: {
    fontSize: 16,
    color: Colors.primary.text,
    marginBottom: 15,
    fontWeight: '600',
  },
  mineButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  mineButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary.card,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    minWidth: 50,
    alignItems: 'center',
  },
  selectedMineButton: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  mineButtonText: {
    fontSize: 16,
    color: Colors.primary.text,
    fontWeight: '600',
  },
  selectedMineButtonText: {
    color: Colors.primary.background,
    fontWeight: 'bold',
  },
  configDescription: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    fontStyle: 'italic',
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
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
  winValue: {
    fontSize: 14,
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
  },
  gameBoard: {
    alignItems: 'center',
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.primary.border,
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    width: 60,
    height: 60,
    backgroundColor: Colors.primary.card,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
    borderRadius: 10,
    // Web-specific hover effects
    ...(typeof window !== 'undefined' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      ':hover': {
        transform: 'scale(1.05)',
        backgroundColor: Colors.primary.surface,
      },
    }),
  },
  mineCell: {
    backgroundColor: Colors.primary.hotPink,
  },
  safeCell: {
    backgroundColor: Colors.primary.neonCyan,
  },
  cellEmoji: {
    fontSize: 24,
  },
  cashOutButton: {
    backgroundColor: Colors.primary.gold,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cashOutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.background,
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
  bottomPadding: {
    height: 40,
  },
});
