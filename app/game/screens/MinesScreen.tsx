// Enhanced Mines Game Screen for Adola App - Exact Original Implementation
// Strategic mine-sweeping game with multiplayer support
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import { useApp } from '../../../contexts/AppContext';
import { useWallet } from '../../../contexts/WalletContext';
import GameLogicService from '../../../services/gameLogicService';

const { width } = Dimensions.get('window');
const GRID_SIZE = 5;

// Mines Game Types (Original)
interface MinesPlayer {
  playerId: string;
  username: string;
  currentBet: number;
  revealedTiles: number;
  currentMultiplier: number;
  winAmount: number;
  isActive: boolean;
  isCashedOut: boolean;
  position: number;
  totalWins: number;
  totalLosses: number;
  biggestWin: number;
  averageMultiplier: number;
}

interface MinesTile {
  id: number;
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isGem: boolean;
}

interface MinesGameState {
  gameId: string;
  gameType: 'mines';
  players: MinesPlayer[];
  gameStatus: 'waiting' | 'playing' | 'finished';
  gameBoard: MinesTile[][];
  mineCount: number;
  gemCount: number;
  revealedCount: number;
  currentMultiplier: number;
  gameSettings: {
    gridSize: number;
    minMines: number;
    maxMines: number;
    minBet: number;
    maxBet: number;
    baseMultiplier: number;
  };
}

export default function MinesScreen() {
  const router = useRouter();
  const { user } = useApp();
  const { balance, canPlaceBet, applyGameResult } = useWallet();

  // Mines Game State
  const [gameState, setGameState] = useState<MinesGameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<MinesPlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [mineCount, setMineCount] = useState(3);
  const [betAmount, setBetAmount] = useState(10);
  const [gameBoard, setGameBoard] = useState<MinesTile[][]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [revealedTiles, setRevealedTiles] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [gameHistory, setGameHistory] = useState<{ mines: number; revealed: number; multiplier: number; won: boolean }[]>([]);

  // Initialize Mines game
  useEffect(() => {
    initializeMinesGame();
  }, []);

  const initializeMinesGame = () => {
    const players: MinesPlayer[] = [
      {
        playerId: 'player1',
        username: 'You',
        currentBet: 0,
        revealedTiles: 0,
        currentMultiplier: 1.0,
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

    const newGameState: MinesGameState = {
      gameId: 'mines_' + Date.now(),
      gameType: 'mines',
      players,
      gameStatus: 'waiting',
      gameBoard: [],
      mineCount: 3,
      gemCount: 22,
      revealedCount: 0,
      currentMultiplier: 1.0,
      gameSettings: {
        gridSize: 5,
        minMines: 1,
        maxMines: 24,
        minBet: 1,
        maxBet: 1000,
        baseMultiplier: 1.1,
      },
    };

    setGameState(newGameState);
    setCurrentPlayer(players[0]);
    setIsLoading(false);
    initializeBoard();
  };

  const initializeBoard = () => {
    const board: MinesTile[][] = [];
    let tileId = 0;

    for (let row = 0; row < GRID_SIZE; row++) {
      const boardRow: MinesTile[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        boardRow.push({
          id: tileId++,
          row,
          col,
          isMine: false,
          isRevealed: false,
          isGem: false,
        });
      }
      board.push(boardRow);
    }

    setGameBoard(board);
  };

  const startNewGame = (amount: number, mines: number) => {
    // Validate bet amount and balance using centralized game logic
    const balanceValidation = GameLogicService.getBalanceValidationMessage(amount, balance);
    if (balanceValidation) {
      Alert.alert('Cannot Place Bet', balanceValidation);
      return;
    }

    const betValidation = GameLogicService.validateBetAmount(amount, 'mines');
    if (!betValidation.valid) {
      Alert.alert('Invalid Bet Amount', betValidation.message);
      return;
    }

    setBetAmount(amount);
    setMineCount(mines);
    setGameActive(true);
    setRevealedTiles(0);
    setCurrentMultiplier(1.0);
    setBalance(prev => prev - amount);

    // Generate new board with mines
    const board: MinesTile[][] = [];
    let tileId = 0;

    for (let row = 0; row < GRID_SIZE; row++) {
      const boardRow: MinesTile[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        boardRow.push({
          id: tileId++,
          row,
          col,
          isMine: false,
          isRevealed: false,
          isGem: false,
        });
      }
      board.push(boardRow);
    }

    // Use centralized game logic to determine if player should win
    const shouldWin = GameLogicService.shouldWin();

    // Place mines based on win/loss determination
    const minePositions = new Set<string>();

    if (shouldWin) {
      // Player should win - place mines in positions they're unlikely to click first
      // Place mines in corners and edges
      const safePositions = [
        '1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2', '3-3' // Center area
      ];

      while (minePositions.size < mines) {
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        const pos = `${row}-${col}`;

        // Avoid center positions for wins
        if (!safePositions.includes(pos)) {
          minePositions.add(pos);
        }
      }
    } else {
      // Player should lose - place mines randomly (higher chance of hitting)
      while (minePositions.size < mines) {
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        minePositions.add(`${row}-${col}`);
      }
    }

    minePositions.forEach(pos => {
      const [row, col] = pos.split('-').map(Number);
      board[row][col].isMine = true;
    });

    // Mark gems
    board.forEach(row => {
      row.forEach(tile => {
        if (!tile.isMine) {
          tile.isGem = true;
        }
      });
    });

    setGameBoard(board);
  };

  const revealTile = (row: number, col: number) => {
    if (!gameActive || gameBoard[row][col].isRevealed) return;

    const newBoard = [...gameBoard];
    newBoard[row][col].isRevealed = true;

    if (newBoard[row][col].isMine) {
      // Hit a mine - game over
      setGameActive(false);
      setGameBoard(newBoard);
      
      // Add to history
      setGameHistory(prev => [
        { mines: mineCount, revealed: revealedTiles, multiplier: currentMultiplier, won: false },
        ...prev.slice(0, 9)
      ]);

      Alert.alert(
        '💣 BOOM!',
        `You hit a mine!\nYou lost ${betAmount} coins`,
        [{ text: 'Try Again' }]
      );
    } else {
      // Found a gem
      const newRevealedTiles = revealedTiles + 1;
      const newMultiplier = calculateMultiplier(newRevealedTiles, mineCount);
      
      setRevealedTiles(newRevealedTiles);
      setCurrentMultiplier(newMultiplier);
      setGameBoard(newBoard);

      // Check if all gems found
      const totalGems = GRID_SIZE * GRID_SIZE - mineCount;
      if (newRevealedTiles === totalGems) {
        // Won the game
        const winAmount = Math.floor(betAmount * newMultiplier);
        setBalance(prev => prev + winAmount);
        setTotalWinnings(prev => prev + (winAmount - betAmount));
        setGameActive(false);

        // Add to history
        setGameHistory(prev => [
          { mines: mineCount, revealed: newRevealedTiles, multiplier: newMultiplier, won: true },
          ...prev.slice(0, 9)
        ]);

        Alert.alert(
          '💎 PERFECT!',
          `You found all gems!\nMultiplier: ${newMultiplier.toFixed(2)}x\nYou won ${winAmount} coins!`,
          [{ text: 'AMAZING!' }]
        );
      }
    }
  };

  const calculateMultiplier = (revealed: number, mines: number) => {
    const totalTiles = GRID_SIZE * GRID_SIZE;
    const gems = totalTiles - mines;
    
    if (revealed === 0) return 1.0;
    
    let multiplier = 1.0;
    for (let i = 0; i < revealed; i++) {
      const remainingGems = gems - i;
      const remainingTiles = totalTiles - i;
      multiplier *= remainingTiles / remainingGems;
    }
    
    return multiplier;
  };

  const cashOut = () => {
    if (!gameActive || revealedTiles === 0) return;

    const winAmount = Math.floor(betAmount * currentMultiplier);
    setBalance(prev => prev + winAmount);
    setTotalWinnings(prev => prev + (winAmount - betAmount));
    setGameActive(false);

    // Add to history
    setGameHistory(prev => [
      { mines: mineCount, revealed: revealedTiles, multiplier: currentMultiplier, won: true },
      ...prev.slice(0, 9)
    ]);

    Alert.alert(
      '💰 CASHED OUT!',
      `You cashed out safely!\nMultiplier: ${currentMultiplier.toFixed(2)}x\nYou won ${winAmount} coins!`,
      [{ text: 'NICE!' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Mines...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💣 Mines</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowStats(!showStats)}
          >
            <Text style={styles.headerButtonText}>Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Text style={styles.headerButtonText}>Leave</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mines Game Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>💣 Mines Game</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Mines:</Text>
          <Text style={styles.statValue}>{mineCount} mines</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Current Balance:</Text>
          <Text style={[styles.statValue, { color: Colors.primary.gold, fontSize: 16, fontWeight: 'bold' }]}>
            {(balance || 0).toLocaleString()} coins
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Revealed Tiles:</Text>
          <Text style={styles.statValue}>{revealedTiles}/{GRID_SIZE * GRID_SIZE - mineCount}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Current Multiplier:</Text>
          <Text style={[styles.statValue, { color: Colors.primary.neonCyan, fontSize: 16, fontWeight: 'bold' }]}>
            {currentMultiplier.toFixed(2)}x
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Total Winnings:</Text>
          <Text style={[styles.statValue, { color: Colors.primary.neonCyan, fontSize: 14, fontWeight: 'bold' }]}>
            +{(totalWinnings || 0).toLocaleString()} coins
          </Text>
        </View>
      </View>

      {/* Mines Game Board */}
      <View style={styles.gameBoard}>
        <Text style={styles.gameBoardTitle}>💎 Minefield</Text>
        
        <View style={styles.minesGrid}>
          {gameBoard.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((tile, colIndex) => (
                <TouchableOpacity
                  key={tile.id}
                  style={[
                    styles.gridTile,
                    tile.isRevealed && styles.revealedTile,
                    tile.isRevealed && tile.isMine && styles.mineTile,
                    tile.isRevealed && tile.isGem && styles.gemTile,
                  ]}
                  onPress={() => revealTile(rowIndex, colIndex)}
                  disabled={!gameActive || tile.isRevealed}
                >
                  <Text style={styles.tileText}>
                    {tile.isRevealed ? (tile.isMine ? '💣' : '💎') : '?'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Cash Out Button */}
        {gameActive && revealedTiles > 0 && (
          <TouchableOpacity style={styles.cashOutButton} onPress={cashOut}>
            <Text style={styles.cashOutButtonText}>
              CASH OUT {Math.floor(betAmount * currentMultiplier)} coins
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Betting Controls */}
      {!gameActive && (
        <View style={styles.bettingCard}>
          <Text style={styles.bettingTitle}>💣 Start New Game</Text>
          
          {/* Mine Count Selection */}
          <View style={styles.minesContainer}>
            <Text style={styles.minesLabel}>Mines:</Text>
            <View style={styles.minesButtons}>
              {[1, 3, 5, 10].map(mines => (
                <TouchableOpacity
                  key={mines}
                  style={[
                    styles.minesButton,
                    mineCount === mines && styles.selectedMinesButton
                  ]}
                  onPress={() => setMineCount(mines)}
                >
                  <Text style={[
                    styles.minesButtonText,
                    mineCount === mines && styles.selectedMinesButtonText
                  ]}>
                    {mines}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Bet Buttons */}
          <View style={styles.quickBetsContainer}>
            <Text style={styles.quickBetsLabel}>Quick Bets:</Text>
            <View style={styles.quickBetsButtons}>
              {[10, 25, 50, 100].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickBetButton}
                  onPress={() => startNewGame(amount, mineCount)}
                  disabled={amount > balance}
                >
                  <Text style={styles.quickBetButtonText}>{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Game Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💣 How to Play Mines</Text>
        <Text style={styles.infoText}>
          • 💎 Click tiles to reveal gems{'\n'}
          • 💣 Avoid hitting mines{'\n'}
          • 🎰 More mines = higher multipliers{'\n'}
          • 💰 Cash out anytime to secure winnings{'\n'}
          • 🎮 Strategic risk vs reward gameplay{'\n'}
          • 🏆 Find all gems for maximum payout{'\n'}
          • 🎨 Choose your mine count wisely
        </Text>
        <Text style={styles.enhancedNote}>
          💣 Higher mine counts mean bigger risks and bigger rewards!
        </Text>
      </View>

      {/* Game History */}
      {showStats && gameHistory.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>📊 Game History</Text>
          {gameHistory.map((game, index) => (
            <View key={index} style={styles.historyRow}>
              <Text style={styles.historyMines}>{game.mines}M</Text>
              <Text style={styles.historyRevealed}>{game.revealed}R</Text>
              <Text style={[
                styles.historyMultiplier,
                { color: game.won ? Colors.primary.neonCyan : Colors.primary.hotPink }
              ]}>
                {game.multiplier.toFixed(2)}x
              </Text>
              <Text style={[
                styles.historyResult,
                { color: game.won ? Colors.primary.neonCyan : Colors.primary.hotPink }
              ]}>
                {game.won ? 'WIN' : 'LOSE'}
              </Text>
            </View>
          ))}
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
    color: Colors.primary.hotPink,
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
  },
  gameBoardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  minesGrid: {
    gap: 4,
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  gridTile: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primary.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revealedTile: {
    backgroundColor: Colors.primary.background,
  },
  mineTile: {
    backgroundColor: Colors.primary.hotPink,
  },
  gemTile: {
    backgroundColor: Colors.primary.neonCyan,
  },
  tileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  cashOutButton: {
    backgroundColor: Colors.primary.gold,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  cashOutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.background,
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
  minesContainer: {
    marginBottom: 20,
  },
  minesLabel: {
    fontSize: 16,
    color: Colors.primary.text,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  minesButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  minesButton: {
    flex: 1,
    backgroundColor: Colors.primary.card,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
  },
  selectedMinesButton: {
    backgroundColor: Colors.primary.hotPink,
    borderColor: Colors.primary.hotPink,
  },
  minesButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  selectedMinesButtonText: {
    color: Colors.primary.background,
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
    backgroundColor: Colors.primary.hotPink,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickBetButtonText: {
    fontSize: 16,
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
    color: Colors.primary.hotPink,
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
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  historyMines: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    width: 40,
  },
  historyRevealed: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    width: 40,
  },
  historyMultiplier: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  historyResult: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 60,
    textAlign: 'right',
  },
});
