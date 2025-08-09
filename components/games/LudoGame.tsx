// Ludo Game Component for Adola App - Exact Recreation with Betting
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';
import { AdvancedGameLogicService } from '../../services/advancedGameLogicService';
import { isWeb } from '../../utils/webStyles';

const { width, height } = Dimensions.get('window');

// Game constants
const BOARD_SIZE = isWeb ? 350 : Math.min(width - 60, 300); // Much smaller board
const CELL_SIZE = BOARD_SIZE / 15;
const PIECE_SIZE = CELL_SIZE * 0.6;

// Player colors
const PLAYER_COLORS = {
  red: '#FF0000',
  green: '#00FF00',
  yellow: '#FFFF00',
  blue: '#00BFFF',
};

// Game piece interface
interface GamePiece {
  id: string;
  playerId: string;
  position: number; // -1 = home, 0-51 = board positions, 100-105 = winning area
  isActive: boolean;
  x: number;
  y: number;
}

// Player interface
interface Player {
  id: string;
  name: string;
  color: keyof typeof PLAYER_COLORS;
  isBot: boolean;
  pieces: GamePiece[];
  isActive: boolean;
  hasWon: boolean;
}

// Game state interface
interface GameState {
  currentPlayer: string;
  diceValue: number;
  gamePhase: 'setup' | 'playerSelection' | 'playing' | 'finished';
  winner: string | null;
  canRollDice: boolean;
  canMovePiece: boolean;
  selectedPiece: string | null;
  consecutiveSixes: number;
  totalPlayers: number;
}

export default function LudoGame() {
  console.log('🎲 LudoGame component loaded');

  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings } = useWallet();
  const gameLogicService = AdvancedGameLogicService.getInstance();

  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentPlayer: '',
    diceValue: 1,
    gamePhase: 'setup',
    winner: null,
    canRollDice: true,
    canMovePiece: false,
    selectedPiece: null,
    consecutiveSixes: 0,
    totalPlayers: 2,
  });

  // Betting state
  const [betAmount, setBetAmount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showBettingPanel, setShowBettingPanel] = useState(true);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);

  // Animation refs
  const diceAnimation = useRef(new Animated.Value(0)).current;
  const pieceAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Initialize game
  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    console.log('🎲 Initializing Ludo game');
    setGameState(prev => ({
      ...prev,
      gamePhase: 'setup',
    }));
  };

  const setupPlayers = (totalPlayers: number) => {
    console.log(`🎲 Setting up ${totalPlayers} players`);

    const colors: (keyof typeof PLAYER_COLORS)[] = ['red', 'green', 'yellow', 'blue'];
    const newPlayers: Player[] = [];

    for (let i = 0; i < totalPlayers; i++) {
      const isHuman = i === 0; // First player is always human, others are bots
      newPlayers.push({
        id: `player${i + 1}`,
        name: isHuman ? (i === 0 ? user?.displayName || user?.username || 'Player 1' : `Player ${i + 1}`) : `Bot ${i}`,
        color: colors[i],
        isBot: !isHuman,
        pieces: createPlayerPieces(`player${i + 1}`, colors[i]),
        isActive: i === 0,
        hasWon: false,
      });
    }

    setPlayers(newPlayers);
    setGameState(prev => ({
      ...prev,
      currentPlayer: 'player1',
      totalPlayers,
      gamePhase: 'playing',
      canRollDice: true,
    }));
  };

  const createPlayerPieces = (playerId: string, color: keyof typeof PLAYER_COLORS): GamePiece[] => {
    const pieces: GamePiece[] = [];
    const homePositions = getHomePositions(color);

    console.log(`🏠 Creating pieces for ${playerId} (${color}) at home positions:`, homePositions);

    for (let i = 0; i < 4; i++) {
      // All pieces start at home (-1 position)
      const initialPosition = -1;
      const initialCoords = homePositions[i];

      const piece = {
        id: `${playerId}_piece_${i}`,
        playerId,
        position: initialPosition,
        isActive: false, // All pieces start inactive (at home)
        x: initialCoords.x,
        y: initialCoords.y,
      };

      pieces.push(piece);

      console.log(`🎯 Created piece ${piece.id} at position ${piece.position} (${piece.x}, ${piece.y})`);

      // Initialize animation value
      pieceAnimations[`${playerId}_piece_${i}`] = new Animated.Value(0);
    }

    return pieces;
  };

  const getHomePositions = (color: keyof typeof PLAYER_COLORS) => {
    const cellSize = BOARD_SIZE / 15;

    // Traditional Ludo home positions - 2x2 grid in each corner
    const homeBasePositions = {
      red: { x: cellSize * 2, y: cellSize * 10 },      // Bottom-left corner
      green: { x: cellSize * 2, y: cellSize * 2 },     // Top-left corner
      blue: { x: cellSize * 10, y: cellSize * 2 },     // Top-right corner
      yellow: { x: cellSize * 10, y: cellSize * 10 },  // Bottom-right corner
    };

    const basePosition = homeBasePositions[color];
    if (!basePosition) return [];

    // 2x2 grid of piece positions within each home area
    const pieceOffsets = [
      { x: 0, y: 0 },                    // Top-left piece
      { x: cellSize, y: 0 },             // Top-right piece
      { x: 0, y: cellSize },             // Bottom-left piece
      { x: cellSize, y: cellSize },      // Bottom-right piece
    ];

    return pieceOffsets.map(offset => ({
      x: basePosition.x + offset.x,
      y: basePosition.y + offset.y,
    }));
  };

  const startGame = async (amount: number) => {
    console.log(`🎲 Starting Ludo game with PKR ${amount}`);

    // Check if user can place bet
    if (!gameLogicService.canPlayGame(amount, balance || 0, 'ludo')) {
      const message = gameLogicService.getBalanceValidationMessage(amount, balance || 0, 'ludo');
      Alert.alert('Cannot Place Bet', message);
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please try again.');
      return;
    }

    // Place bet
    const success = await placeBet(amount, 'ludo', `Ludo Game Bet: PKR ${amount}`);
    if (!success) {
      Alert.alert('Bet Failed', 'Unable to place bet. Please try again.');
      return;
    }

    setBetAmount(amount);
    setGameStarted(true);
    setShowBettingPanel(false);
    setShowPlayerSelection(true);
    setGameState(prev => ({
      ...prev,
      gamePhase: 'playerSelection',
    }));

    console.log(`🎲 Ludo game started with bet: PKR ${amount}`);
  };

  const startGameWithPlayers = (totalPlayers: number) => {
    setShowPlayerSelection(false);
    setupPlayers(totalPlayers);
  };

  // Roll dice function
  const rollDice = () => {
    console.log(`🎲 rollDice called - canRollDice: ${gameState.canRollDice}, currentPlayer: ${gameState.currentPlayer}`);

    if (!gameState.canRollDice) {
      console.log('❌ Cannot roll dice - canRollDice is false');
      return;
    }

    // Animate dice
    Animated.sequence([
      Animated.timing(diceAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(diceAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Generate random dice value
    const diceValue = Math.floor(Math.random() * 6) + 1;

    setGameState(prev => ({
      ...prev,
      diceValue,
      canRollDice: false,
      canMovePiece: false, // Set to false initially, will be set to true if there are movable pieces
      consecutiveSixes: diceValue === 6 ? prev.consecutiveSixes + 1 : 0,
    }));

    console.log(`🎲 Player ${gameState.currentPlayer} rolled: ${diceValue}`);

    // Check if current player can move any pieces
    setTimeout(() => {
      checkMovablePiecesEnhanced(diceValue);
    }, 600);
  };

  // Check if player has movable pieces
  const checkMovablePieces = (diceValue: number) => {
    const currentPlayer = players.find(p => p.id === gameState.currentPlayer);
    if (!currentPlayer) return;

    const movablePieces = currentPlayer.pieces.filter(piece => {
      // Can move if piece is in home and dice is 6
      if (piece.position === -1 && diceValue === 6) return true;

      // Can move if piece is on board and won't exceed finish
      if (piece.position >= 0 && piece.position < 52) {
        const newPosition = piece.position + diceValue;
        return newPosition <= 57; // 52 board positions + 5 home stretch
      }

      return false;
    });

    if (movablePieces.length === 0) {
      // No movable pieces, end turn
      setTimeout(() => {
        endTurn();
      }, 1000);
    } else if (movablePieces.length === 1) {
      // Auto-move the only movable piece
      setTimeout(() => {
        movePiece(movablePieces[0].id, diceValue);
      }, 500);
    }
    // If multiple pieces can move, player needs to select one
  };

  // Move piece function - Fixed to ensure visual updates
  const movePiece = (pieceId: string, diceValue: number) => {
    const currentPlayer = players.find(p => p.pieces.some(piece => piece.id === pieceId));
    console.log(`🚀 Moving piece ${pieceId} with dice value ${diceValue} for player ${currentPlayer?.name} (${currentPlayer?.isBot ? 'Bot' : 'Human'})`);

    // Find the piece to move
    const pieceToMove = players.flatMap(p => p.pieces).find(p => p.id === pieceId);
    if (!pieceToMove) {
      console.log(`❌ Piece ${pieceId} not found`);
      return;
    }

    console.log(`🎯 Current piece position: ${pieceToMove.position}`);

    let newPosition = pieceToMove.position;
    let newCoords = { x: pieceToMove.x, y: pieceToMove.y };

    // Calculate new position using 15x15 grid system
    if (pieceToMove.position === -1 && diceValue === 6) {
      // Move from home to start position (path entry point)
      newPosition = startPositions[currentPlayer!.color];
      newCoords = getBoardPosition(newPosition);
      console.log(`📍 Moving piece from home to start position ${newPosition}`);
    } else if (pieceToMove.position >= 0 && pieceToMove.position < 52) {
      // Move on the main track (0-51)
      newPosition = pieceToMove.position + diceValue;

      // Check if piece completes full circuit and enters finishing column
      const playerStartIndex = startPositions[currentPlayer!.color];
      const completedCircuit = newPosition >= 52;

      if (completedCircuit) {
        // Enter finishing column (positions 100-105)
        const finishingIndex = newPosition - 52;
        if (finishingIndex < 6) {
          newPosition = 100 + finishingIndex;
          newCoords = getFinishingColumnPosition(currentPlayer!.color, finishingIndex);
          console.log(`🏆 Moving piece to finishing column position ${finishingIndex}`);
        } else {
          // Can't move beyond finishing column
          console.log(`❌ Cannot move beyond finishing column`);
          return;
        }
      } else {
        // Normal movement on main track
        newCoords = getBoardPosition(newPosition);
        console.log(`🎯 Moving piece to board position ${newPosition}`);
      }
    } else if (pieceToMove.position >= 100 && pieceToMove.position < 106) {
      // Already in finishing column (100-105)
      const currentFinishIndex = pieceToMove.position - 100;
      const newFinishIndex = currentFinishIndex + diceValue;

      if (newFinishIndex < 6) {
        newPosition = 100 + newFinishIndex;
        newCoords = getFinishingColumnPosition(currentPlayer!.color, newFinishIndex);
        console.log(`🏆 Moving piece in finishing column to ${newFinishIndex}`);
      } else {
        // Can't move beyond finishing column
        console.log(`❌ Cannot move beyond finishing column`);
        return;
      }
    }

    console.log(`✅ Piece ${pieceId} will move from ${pieceToMove.position} to ${newPosition} at (${newCoords.x}, ${newCoords.y})`);

    // Update the players state with new piece position
    setPlayers(prevPlayers => {
      const newPlayers = prevPlayers.map(player => {
        if (player.pieces.some(p => p.id === pieceId)) {
          return {
            ...player,
            pieces: player.pieces.map(piece => {
              if (piece.id === pieceId) {
                // Animate the piece movement
                if (pieceAnimations[pieceId]) {
                  Animated.sequence([
                    Animated.timing(pieceAnimations[pieceId], {
                      toValue: 1,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                    Animated.timing(pieceAnimations[pieceId], {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                  ]).start();
                }

                return {
                  ...piece,
                  position: newPosition,
                  x: newCoords.x,
                  y: newCoords.y,
                  isActive: newPosition >= 0,
                };
              }
              return piece;
            }),
          };
        }
        return player;
      });

      console.log(`🔄 Updated players state:`, newPlayers.map(p => ({
        name: p.name,
        pieces: p.pieces.map(piece => ({ id: piece.id, position: piece.position, x: piece.x, y: piece.y }))
      })));

      return newPlayers;
    });

    console.log(`🚀 Moving piece ${pieceId} with dice value ${diceValue}`);

    // Reset piece selection state immediately
    setGameState(prev => ({
      ...prev,
      canMovePiece: false,
      selectedPiece: null,
      canRollDice: false, // Disable dice rolling during move processing
    }));

    // Check for captures and other game logic
    setTimeout(() => {
      checkCaptures(pieceId);

      // Check win condition
      const hasWon = checkWinCondition();
      if (hasWon) return; // Game ended, don't continue

      // End turn unless rolled a 6
      if (diceValue !== 6 || gameState.consecutiveSixes >= 3) {
        console.log(`🔄 Ending turn (dice: ${diceValue}, consecutive 6s: ${gameState.consecutiveSixes})`);
        endTurn();
      } else {
        // Allow another roll for rolling a 6
        console.log(`🎲 Player gets another roll for rolling a 6!`);
        setGameState(prev => ({
          ...prev,
          canRollDice: true,
          canMovePiece: false,
          selectedPiece: null,
        }));
      }
    }, 800);
  };

  // Get start position for each color
  const getStartPosition = (color: keyof typeof PLAYER_COLORS): number => {
    return startPositions[color] || 0;
  };

  // Get winning area position coordinates
  const getWinningPosition = (color: keyof typeof PLAYER_COLORS, step: number) => {
    const centerX = CELL_SIZE * 7;
    const centerY = CELL_SIZE * 7;

    switch (color) {
      case 'red':
        return { x: centerX - CELL_SIZE * (step + 1), y: centerY };
      case 'green':
        return { x: centerX, y: centerY - CELL_SIZE * (step + 1) };
      case 'yellow':
        return { x: centerX + CELL_SIZE * (step + 1), y: centerY };
      case 'blue':
        return { x: centerX, y: centerY + CELL_SIZE * (step + 1) };
      default:
        return { x: centerX, y: centerY };
    }
  };

  // Check for piece captures
  const checkCaptures = (movedPieceId: string) => {
    const movedPiece = players.flatMap(p => p.pieces).find(p => p.id === movedPieceId);
    if (!movedPiece || safeZones.includes(movedPiece.position)) return;

    // Check if any opponent pieces are on the same position
    setPlayers(prevPlayers => {
      return prevPlayers.map(player => {
        if (player.pieces.some(p => p.id === movedPieceId)) {
          return player; // Don't capture own pieces
        }

        return {
          ...player,
          pieces: player.pieces.map(piece => {
            if (piece.position === movedPiece.position && piece.position >= 0) {
              // Capture the piece - send it back home
              const homePositions = getHomePositions(player.color);
              const homeIndex = parseInt(piece.id.split('_')[2]);

              return {
                ...piece,
                position: -1,
                isActive: false,
                x: homePositions[homeIndex].x,
                y: homePositions[homeIndex].y,
              };
            }
            return piece;
          }),
        };
      });
    });
  };

  // Check win condition
  const checkWinCondition = (): boolean => {
    const currentPlayer = players.find(p => p.id === gameState.currentPlayer);
    if (!currentPlayer) return false;

    const allPiecesHome = currentPlayer.pieces.every(piece => piece.position >= 100 && piece.position <= 105);

    if (allPiecesHome) {
      // Player wins!
      setGameState(prev => ({
        ...prev,
        gamePhase: 'finished',
        winner: currentPlayer.id,
      }));

      // Handle winnings
      handleGameEnd(true);
      return true;
    }

    return false;
  };

  // End current player's turn
  const endTurn = () => {
    const currentIndex = players.findIndex(p => p.id === gameState.currentPlayer);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayer = players[nextIndex];

    console.log(`🔄 Ending turn for ${gameState.currentPlayer}, next player: ${nextPlayer.id}`);

    setGameState(prev => ({
      ...prev,
      currentPlayer: nextPlayer.id,
      canRollDice: true,
      canMovePiece: false,
      selectedPiece: null,
      consecutiveSixes: 0,
    }));

    console.log(`✅ Turn ended - next player can roll dice: ${nextPlayer.id} (${nextPlayer.isBot ? 'Bot' : 'Human'})`);

    // If next player is a bot, make bot move
    if (nextPlayer.isBot) {
      console.log(`🤖 Next player is a bot, starting bot turn in 1 second`);
      setTimeout(() => {
        makeBotMove();
      }, 1000);
    } else {
      console.log(`👤 Next player is human, waiting for manual dice roll`);
    }
  };

  // Handle game end
  const handleGameEnd = async (playerWon: boolean) => {
    if (playerWon) {
      // Calculate winnings (2x bet amount for winning)
      const winnings = betAmount * 2;

      await addWinnings(winnings, 'ludo', `Ludo Game Win: PKR ${winnings}`);

      Alert.alert(
        '🎉 Congratulations!',
        `You won the Ludo game!\n\nBet: PKR ${betAmount}\nWinnings: PKR ${winnings}\nProfit: PKR ${winnings - betAmount}`,
        [
          {
            text: 'Play Again',
            onPress: () => {
              setGameStarted(false);
              setShowBettingPanel(true);
              initializeGame();
            }
          }
        ]
      );
    } else {
      Alert.alert(
        '😔 Game Over',
        `You lost the Ludo game.\n\nBet Lost: PKR ${betAmount}`,
        [
          {
            text: 'Try Again',
            onPress: () => {
              setGameStarted(false);
              setShowBettingPanel(true);
              initializeGame();
            }
          }
        ]
      );
    }
  };

  // Get board position coordinates - Traditional Ludo board layout
  const getBoardPosition = (position: number) => {
    if (position < 0 || position > 51) return { x: 0, y: 0 };

    const cellSize = BOARD_SIZE / 15;

    // Traditional Ludo board path - clockwise around the cross
    // Starting from Red's entry point and going clockwise
    const pathCoordinates = [
      // Red's starting area and path going up (0-5)
      { x: cellSize * 1, y: cellSize * 8 },   // 0 - Red start
      { x: cellSize * 2, y: cellSize * 8 },   // 1
      { x: cellSize * 3, y: cellSize * 8 },   // 2
      { x: cellSize * 4, y: cellSize * 8 },   // 3
      { x: cellSize * 5, y: cellSize * 8 },   // 4
      { x: cellSize * 6, y: cellSize * 8 },   // 5

      // Going up the left side (6-11)
      { x: cellSize * 6, y: cellSize * 7 },   // 6
      { x: cellSize * 6, y: cellSize * 6 },   // 7
      { x: cellSize * 6, y: cellSize * 5 },   // 8
      { x: cellSize * 6, y: cellSize * 4 },   // 9
      { x: cellSize * 6, y: cellSize * 3 },   // 10
      { x: cellSize * 6, y: cellSize * 2 },   // 11

      // Green's starting area and path going right (12-17)
      { x: cellSize * 6, y: cellSize * 1 },   // 12 - Green start
      { x: cellSize * 7, y: cellSize * 1 },   // 13
      { x: cellSize * 8, y: cellSize * 1 },   // 14
      { x: cellSize * 9, y: cellSize * 1 },   // 15
      { x: cellSize * 10, y: cellSize * 1 },  // 16
      { x: cellSize * 11, y: cellSize * 1 },  // 17

      // Going right across the top (18-23)
      { x: cellSize * 12, y: cellSize * 1 },  // 18
      { x: cellSize * 13, y: cellSize * 1 },  // 19
      { x: cellSize * 13, y: cellSize * 2 },  // 20
      { x: cellSize * 13, y: cellSize * 3 },  // 21
      { x: cellSize * 13, y: cellSize * 4 },  // 22
      { x: cellSize * 13, y: cellSize * 5 },  // 23

      // Going down the right side (24-29)
      { x: cellSize * 13, y: cellSize * 6 },  // 24
      { x: cellSize * 12, y: cellSize * 6 },  // 25
      { x: cellSize * 11, y: cellSize * 6 },  // 26 - Blue start
      { x: cellSize * 10, y: cellSize * 6 },  // 27
      { x: cellSize * 9, y: cellSize * 6 },   // 28
      { x: cellSize * 8, y: cellSize * 6 },   // 29

      // Going down (30-35)
      { x: cellSize * 8, y: cellSize * 7 },   // 30
      { x: cellSize * 8, y: cellSize * 8 },   // 31
      { x: cellSize * 8, y: cellSize * 9 },   // 32
      { x: cellSize * 8, y: cellSize * 10 },  // 33
      { x: cellSize * 8, y: cellSize * 11 },  // 34
      { x: cellSize * 8, y: cellSize * 12 },  // 35

      // Going left across the bottom (36-41)
      { x: cellSize * 8, y: cellSize * 13 },  // 36
      { x: cellSize * 7, y: cellSize * 13 },  // 37
      { x: cellSize * 6, y: cellSize * 13 },  // 38
      { x: cellSize * 5, y: cellSize * 13 },  // 39 - Yellow start
      { x: cellSize * 4, y: cellSize * 13 },  // 40
      { x: cellSize * 3, y: cellSize * 13 },  // 41

      // Going left (42-47)
      { x: cellSize * 2, y: cellSize * 13 },  // 42
      { x: cellSize * 1, y: cellSize * 13 },  // 43
      { x: cellSize * 1, y: cellSize * 12 },  // 44
      { x: cellSize * 1, y: cellSize * 11 },  // 45
      { x: cellSize * 1, y: cellSize * 10 },  // 46
      { x: cellSize * 1, y: cellSize * 9 },   // 47

      // Completing the circuit (48-51)
      { x: cellSize * 1, y: cellSize * 8 },   // 48 - Back to start area
      { x: cellSize * 2, y: cellSize * 8 },   // 49
      { x: cellSize * 3, y: cellSize * 8 },   // 50
      { x: cellSize * 4, y: cellSize * 8 },   // 51
    ];

    return pathCoordinates[position] || { x: cellSize * 7, y: cellSize * 7 };
  };

  // Safe zone positions - traditional Ludo safe spots
  const safeZones = [0, 8, 13, 21, 26, 34, 39, 47]; // Safe positions on the path

  // Path entry points - where each color enters the main track
  const startPositions = {
    red: 0,    // Red starts at position 0
    green: 13, // Green starts at position 13
    blue: 26,  // Blue starts at position 26
    yellow: 39, // Yellow starts at position 39
  };

  // Finishing columns - path from main track to center (6 tiles per player)
  const getFinishingColumnPosition = (color: keyof typeof PLAYER_COLORS, index: number) => {
    const cellSize = BOARD_SIZE / 15;

    // Traditional Ludo finishing paths leading to center
    const finishingPaths = {
      red: [
        { x: cellSize * 2, y: cellSize * 8 },   // 0 - Start of red finish path
        { x: cellSize * 3, y: cellSize * 8 },   // 1
        { x: cellSize * 4, y: cellSize * 8 },   // 2
        { x: cellSize * 5, y: cellSize * 8 },   // 3
        { x: cellSize * 6, y: cellSize * 8 },   // 4
        { x: cellSize * 7, y: cellSize * 8 },   // 5 - Center
      ],
      green: [
        { x: cellSize * 7, y: cellSize * 2 },   // 0 - Start of green finish path
        { x: cellSize * 7, y: cellSize * 3 },   // 1
        { x: cellSize * 7, y: cellSize * 4 },   // 2
        { x: cellSize * 7, y: cellSize * 5 },   // 3
        { x: cellSize * 7, y: cellSize * 6 },   // 4
        { x: cellSize * 7, y: cellSize * 7 },   // 5 - Center
      ],
      blue: [
        { x: cellSize * 12, y: cellSize * 7 },  // 0 - Start of blue finish path
        { x: cellSize * 11, y: cellSize * 7 },  // 1
        { x: cellSize * 10, y: cellSize * 7 },  // 2
        { x: cellSize * 9, y: cellSize * 7 },   // 3
        { x: cellSize * 8, y: cellSize * 7 },   // 4
        { x: cellSize * 7, y: cellSize * 7 },   // 5 - Center
      ],
      yellow: [
        { x: cellSize * 7, y: cellSize * 12 },  // 0 - Start of yellow finish path
        { x: cellSize * 7, y: cellSize * 11 },  // 1
        { x: cellSize * 7, y: cellSize * 10 },  // 2
        { x: cellSize * 7, y: cellSize * 9 },   // 3
        { x: cellSize * 7, y: cellSize * 8 },   // 4
        { x: cellSize * 7, y: cellSize * 7 },   // 5 - Center
      ],
    };

    const path = finishingPaths[color];
    if (!path || index < 0 || index >= path.length) {
      return { x: cellSize * 7, y: cellSize * 7 }; // Center fallback
    }

    return path[index];
  };



  // Bot AI logic
  const makeBotMove = () => {
    if (gameState.gamePhase !== 'playing') {
      console.log(`❌ Bot cannot move - game phase is ${gameState.gamePhase}`);
      return;
    }

    const currentPlayer = players.find(p => p.id === gameState.currentPlayer);
    if (!currentPlayer || !currentPlayer.isBot) {
      console.log(`❌ Current player is not a bot:`, currentPlayer);
      return;
    }

    console.log(`🤖 Bot ${currentPlayer.name} starting turn`);
    console.log(`🤖 Bot can roll dice: ${gameState.canRollDice}`);

    // Simulate thinking time
    setTimeout(() => {
      console.log(`🤖 Bot ${currentPlayer.name} rolling dice`);
      rollDice();
    }, 1000 + Math.random() * 1000);
  };

  const makeBotPieceMove = (diceValue: number) => {
    console.log(`🤖 makeBotPieceMove called with dice value: ${diceValue}`);

    const currentPlayer = players.find(p => p.id === gameState.currentPlayer);
    if (!currentPlayer || !currentPlayer.isBot) {
      console.log(`❌ makeBotPieceMove called but currentPlayer is not a bot:`, currentPlayer);
      return;
    }

    console.log(`🤖 Bot ${currentPlayer.name} is selecting a piece to move with dice ${diceValue}`);
    console.log(`🤖 Bot pieces:`, currentPlayer.pieces.map(p => ({ id: p.id, position: p.position, x: p.x, y: p.y })));

    // For testing, let's start with a simple case - if dice is 6, try to move a piece out of home
    if (diceValue === 6) {
      const homePieces = currentPlayer.pieces.filter(p => p.position === -1);
      if (homePieces.length > 0) {
        const selectedPiece = homePieces[0];
        console.log(`🤖 Bot moving piece ${selectedPiece.id} out of home`);

        setTimeout(() => {
          console.log(`🤖 Executing movePiece for ${selectedPiece.id}`);
          movePiece(selectedPiece.id, diceValue);
        }, 1000);
        return;
      }
    }

    // Find all movable pieces using the same logic as human players
    const movablePieces = currentPlayer.pieces.filter(piece => {
      return canMovePiece(piece, diceValue);
    });

    console.log(`🤖 Bot found ${movablePieces.length} movable pieces:`, movablePieces.map(p => ({ id: p.id, position: p.position })));

    if (movablePieces.length === 0) {
      console.log(`🤖 Bot has no valid moves, ending turn`);
      setTimeout(() => {
        endTurn();
      }, 1000);
      return;
    }

    // Simple AI strategy: prioritize pieces out of home, then first available
    let selectedPiece = movablePieces[0];

    // Prefer moving pieces out of home if dice is 6
    if (diceValue === 6) {
      const homePieces = movablePieces.filter(p => p.position === -1);
      if (homePieces.length > 0) {
        selectedPiece = homePieces[0];
        console.log(`🤖 Bot prioritizing piece out of home: ${selectedPiece.id}`);
      }
    }

    console.log(`🤖 Bot selected piece ${selectedPiece.id} (position ${selectedPiece.position}) to move`);

    setTimeout(() => {
      console.log(`🤖 Bot executing move for piece ${selectedPiece.id}`);
      movePiece(selectedPiece.id, diceValue);
    }, 1500);
  };

  // Enhanced checkMovablePieces that handles both human and bot players
  const checkMovablePiecesEnhanced = (diceValue: number) => {
    const currentPlayer = players.find(p => p.id === gameState.currentPlayer);
    if (!currentPlayer) {
      console.log('❌ No current player found');
      return;
    }

    console.log(`🎯 Checking movable pieces for ${currentPlayer.name} (${currentPlayer.isBot ? 'Bot' : 'Human'}) with dice ${diceValue}`);
    console.log(`🎯 Current player pieces:`, currentPlayer.pieces.map(p => ({ id: p.id, position: p.position })));

    if (currentPlayer.isBot) {
      console.log(`🤖 Calling makeBotPieceMove for ${currentPlayer.name}`);
      makeBotPieceMove(diceValue);
      return;
    }

    // For human players, always require manual piece selection
    const movablePieces = currentPlayer.pieces.filter(piece => {
      // Can move if piece is in home and dice is 6
      if (piece.position === -1 && diceValue === 6) return true;

      // Can move if piece is on board and won't exceed finish
      if (piece.position >= 0 && piece.position < 52) {
        const newPosition = piece.position + diceValue;
        return newPosition <= 57; // 52 board positions + 5 home stretch
      }

      return false;
    });

    console.log(`🎯 Found ${movablePieces.length} movable pieces`);

    if (movablePieces.length === 0) {
      // No movable pieces, end turn
      Alert.alert('No Valid Moves', 'No pieces can be moved with this dice roll.');
      setTimeout(() => {
        endTurn();
      }, 1500);
    } else {
      // Enable piece selection for human players
      setGameState(prev => ({
        ...prev,
        canMovePiece: true,
        canRollDice: false, // Make sure dice rolling is disabled while selecting piece
      }));

      Alert.alert(
        'Select a Piece',
        `You rolled ${diceValue}. Click on a highlighted piece to move it.`,
        [{ text: 'OK' }]
      );
    }
  };

  // Check if a piece can be moved
  const canMovePiece = (piece: GamePiece, diceValue: number): boolean => {
    // Can move if piece is in home and dice is 6
    if (piece.position === -1 && diceValue === 6) return true;

    // Can move if piece is on board and won't exceed finish
    if (piece.position >= 0 && piece.position < 52) {
      const newPosition = piece.position + diceValue;
      return newPosition <= 57;
    }

    return false;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Betting Panel */}
      {showBettingPanel && !gameStarted && (
        <View style={styles.bettingContainer}>
          <BettingPanel
            balance={balance || 0}
            minBet={10}
            maxBet={5000}
            onBet={startGame}
            disabled={gameState.gamePhase === 'playing'}
          />
        </View>
      )}

      {/* Player Selection Modal */}
      {showPlayerSelection && (
        <Modal visible={showPlayerSelection} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.playerSelectionModal}>
              <Text style={styles.modalTitle}>Select Number of Players</Text>

              <View style={styles.playerOptions}>
                {[2, 3, 4].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={styles.playerOptionButton}
                    onPress={() => startGameWithPlayers(num)}
                  >
                    <Text style={styles.playerOptionText}>{num} Players</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.gameDescription}>
                Play against computer opponents in this classic Ludo game
              </Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Main Game Layout */}
      {gameStarted && gameState.gamePhase === 'playing' && (
        <View style={[styles.gameLayout, isWeb && styles.webGameLayout]}>
          {/* Game Board */}
          <View style={styles.boardSection}>

            <View style={styles.gameBoard}>
              {/* Board Background */}
              <View style={styles.boardContainer}>

            {/* Player Home Areas */}
            {/* Red Home Area (Top Left) */}
            <View style={[styles.homeArea, styles.redHome]}>
              <Text style={styles.homeLabel}>RED</Text>
              <View style={styles.homeGrid}>
                {[0, 1, 2, 3].map(i => (
                  <View key={`red-home-${i}`} style={[styles.homeCell, { backgroundColor: PLAYER_COLORS.red }]} />
                ))}
              </View>
            </View>

            {/* Green Home Area (Top Right) */}
            <View style={[styles.homeArea, styles.greenHome]}>
              <Text style={styles.homeLabel}>GREEN</Text>
              <View style={styles.homeGrid}>
                {[0, 1, 2, 3].map(i => (
                  <View key={`green-home-${i}`} style={[styles.homeCell, { backgroundColor: PLAYER_COLORS.green }]} />
                ))}
              </View>
            </View>

            {/* Yellow Home Area (Bottom Right) */}
            <View style={[styles.homeArea, styles.yellowHome]}>
              <Text style={styles.homeLabel}>YELLOW</Text>
              <View style={styles.homeGrid}>
                {[0, 1, 2, 3].map(i => (
                  <View key={`yellow-home-${i}`} style={[styles.homeCell, { backgroundColor: PLAYER_COLORS.yellow }]} />
                ))}
              </View>
            </View>

            {/* Blue Home Area (Bottom Left) */}
            <View style={[styles.homeArea, styles.blueHome]}>
              <Text style={styles.homeLabel}>BLUE</Text>
              <View style={styles.homeGrid}>
                {[0, 1, 2, 3].map(i => (
                  <View key={`blue-home-${i}`} style={[styles.homeCell, { backgroundColor: PLAYER_COLORS.blue }]} />
                ))}
              </View>
            </View>

            {/* Board Path */}
            {Array.from({ length: 52 }, (_, i) => {
              const position = getBoardPosition(i);
              const isSafeZone = safeZones.includes(i);
              const isStartPosition = [1, 14, 27, 40].includes(i);

              return (
                <View
                  key={`path-${i}`}
                  style={[
                    styles.pathCell,
                    {
                      left: position.x,
                      top: position.y,
                      backgroundColor: isSafeZone ? '#FFD700' : isStartPosition ? '#FF69B4' : '#FFFFFF',
                    }
                  ]}
                >
                  <Text style={styles.positionNumber}>{i}</Text>
                  {isSafeZone && <Text style={styles.safeZoneText}>★</Text>}
                </View>
              );
            })}

            {/* Game Pieces */}
            {players.map(player =>
              player.pieces.map(piece => {
                const isMovable = gameState.canMovePiece &&
                                 player.id === gameState.currentPlayer &&
                                 !player.isBot &&
                                 canMovePiece(piece, gameState.diceValue);

                console.log(`🎯 Rendering piece ${piece.id}: position=${piece.position}, x=${piece.x}, y=${piece.y}, movable=${isMovable}`);

                return (
                  <Animated.View
                    key={`${piece.id}-${piece.position}-${piece.x}-${piece.y}`} // Force re-render when position changes
                    style={[
                      styles.gamePiece,
                      {
                        left: piece.x,
                        top: piece.y,
                        backgroundColor: PLAYER_COLORS[player.color],
                        opacity: isMovable ? 1 : 0.8,
                        borderColor: isMovable ? '#FFD700' : '#FFFFFF',
                        borderWidth: isMovable ? 3 : 2,
                        transform: [
                          { scale: isMovable ? 1.1 : 1 },
                          {
                            scale: pieceAnimations[piece.id] ?
                              pieceAnimations[piece.id].interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.3],
                              }) : 1
                          }
                        ],
                      }
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.pieceTouch}
                      onPress={() => {
                        console.log(`🎯 Piece ${piece.id} clicked - position: ${piece.position}, movable: ${isMovable}`);

                        if (isMovable) {
                          console.log(`✅ Moving piece ${piece.id}`);
                          movePiece(piece.id, gameState.diceValue);
                        } else if (gameState.canMovePiece &&
                                  player.id === gameState.currentPlayer &&
                                  !player.isBot) {
                          Alert.alert('Invalid Move', 'This piece cannot be moved with the current dice roll.');
                        }
                      }}
                    >
                      <Text style={[
                        styles.pieceNumber,
                        { color: isMovable ? '#000000' : '#FFFFFF' }
                      ]}>
                        {parseInt(piece.id.split('_')[2]) + 1}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}

                {/* Center Triangle */}
                <View style={styles.centerTriangle}>
                  <Text style={styles.centerText}>🏆</Text>
                </View>

              </View>
            </View>
          </View>

          {/* Controls Section */}
          <View style={styles.controlsSection}>
              {/* Game Info */}
              <View style={styles.gameInfo}>
                <View style={styles.gameInfoRow}>
                  <Text style={styles.gameInfoText}>Bet: PKR {betAmount}</Text>
                  <Text style={styles.gameInfoText}>Balance: PKR {(balance || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.gameInfoRow}>
                  <Text style={styles.currentPlayerText}>
                    Current: {players.find(p => p.id === gameState.currentPlayer)?.name || 'Unknown'}
                  </Text>
                  <Text style={styles.diceText}>Dice: {gameState.diceValue}</Text>
                </View>
              </View>

              {/* Dice Control */}
              <TouchableOpacity
                style={[
                  styles.diceButton,
                  {
                    opacity: gameState.canRollDice && !players.find(p => p.id === gameState.currentPlayer)?.isBot ? 1 : 0.5,
                    backgroundColor: gameState.canRollDice && !players.find(p => p.id === gameState.currentPlayer)?.isBot ?
                      Colors.primary.surface : Colors.primary.background,
                  }
                ]}
                onPress={() => {
                  console.log('🎲 Dice button pressed');
                  rollDice();
                }}
                disabled={!gameState.canRollDice || players.find(p => p.id === gameState.currentPlayer)?.isBot}
              >
                <Animated.View
                  style={[
                    styles.dice,
                    {
                      transform: [{
                        rotate: diceAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      }],
                    }
                  ]}
                >
                  <Text style={styles.diceNumber}>{gameState.diceValue}</Text>
                </Animated.View>
                <Text style={styles.diceLabel}>
                  {gameState.canRollDice && !players.find(p => p.id === gameState.currentPlayer)?.isBot ?
                    'Roll Dice' :
                    players.find(p => p.id === gameState.currentPlayer)?.isBot ?
                      'Bot Turn' :
                      gameState.canMovePiece ? 'Select Piece' : 'Wait...'}
                </Text>
              </TouchableOpacity>

              {/* Player Status */}
              <View style={styles.playersStatus}>
                {players.map(player => (
                  <View
                    key={player.id}
                    style={[
                      styles.playerStatus,
                      {
                        borderColor: PLAYER_COLORS[player.color],
                        backgroundColor: player.id === gameState.currentPlayer ?
                          `${PLAYER_COLORS[player.color]}20` : 'transparent',
                      }
                    ]}
                  >
                    <Text style={[styles.playerName, { color: PLAYER_COLORS[player.color] }]}>
                      {player.name}
                    </Text>
                    <Text style={styles.playerPieces}>
                      Home: {player.pieces.filter(p => p.position >= 100).length}/4
                    </Text>
                    <Text style={styles.playerPieces}>
                      Out: {player.pieces.filter(p => p.position >= 0 && p.position < 100).length}/4
                    </Text>
                  </View>
                ))}
              </View>

              {/* Piece Selection Instructions */}
              {gameState.canMovePiece && (
                <View style={styles.instructionsPanel}>
                  <Text style={styles.instructionsText}>
                    🎯 Click on a highlighted piece to move it
                  </Text>
                  <Text style={styles.instructionsSubtext}>
                    You rolled {gameState.diceValue}
                  </Text>
                </View>
              )}

              {/* Debug Controls */}
              {__DEV__ && (
                <View style={styles.debugControls}>
                  <TouchableOpacity
                    style={styles.debugButton}
                    onPress={() => {
                      console.log('🧪 Testing piece movement');
                      // Move first player's pieces to test positions
                      setPlayers(prev => prev.map((player, index) =>
                        index === 0 ? {
                          ...player,
                          pieces: player.pieces.map((piece, pieceIndex) => ({
                            ...piece,
                            position: pieceIndex * 10, // Positions 0, 10, 20, 30
                            x: getBoardPosition(pieceIndex * 10).x,
                            y: getBoardPosition(pieceIndex * 10).y,
                            isActive: true,
                          }))
                        } : player
                      ));
                    }}
                  >
                    <Text style={styles.debugButtonText}>Test Move</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.debugButton}
                    onPress={() => {
                      console.log('🧪 Current game state:');
                      console.log('Players:', players.map(p => ({
                        name: p.name,
                        pieces: p.pieces.map(piece => ({
                          id: piece.id,
                          position: piece.position,
                          x: piece.x,
                          y: piece.y
                        }))
                      })));
                      console.log('Game state:', gameState);
                    }}
                  >
                    <Text style={styles.debugButtonText}>Log State</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.debugButton}
                    onPress={() => {
                      console.log('🤖 Testing bot move...');
                      const currentPlayer = players.find(p => p.id === gameState.currentPlayer);
                      if (currentPlayer && currentPlayer.isBot) {
                        makeBotMove();
                      } else {
                        console.log('Current player is not a bot');
                      }
                    }}
                  >
                    <Text style={styles.debugButtonText}>Bot Move</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.debugButton}
                    onPress={() => {
                      console.log('🔄 Restarting game...');
                      setGameStarted(false);
                      setShowBettingPanel(true);
                      setShowPlayerSelection(false);
                      initializeGame();
                    }}
                  >
                    <Text style={styles.debugButtonText}>Restart</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: isWeb ? 20 : 16,
    paddingTop: isWeb ? 20 : 8,
  },
  bettingContainer: {
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerSelectionModal: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 16,
    padding: 24,
    width: isWeb ? 400 : width * 0.9,
    maxWidth: 400,
    borderWidth: 2,
    borderColor: Colors.primary.neonCyan,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  playerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  playerOptionButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  playerOptionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  gameDescription: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
  },
  gameLayout: {
    flexDirection: 'column',
    marginTop: 8,
  },
  webGameLayout: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  boardSection: {
    flex: isWeb ? 1 : 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: isWeb ? undefined : BOARD_SIZE + 40,
  },
  controlsSection: {
    flex: isWeb ? 0 : 0,
    minWidth: isWeb ? 280 : undefined,
    padding: 12,
    maxWidth: isWeb ? 320 : undefined,
  },
  gameInfo: {
    backgroundColor: Colors.primary.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
  },
  gameInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameInfoText: {
    fontSize: 16,
    color: Colors.primary.text,
    fontWeight: '600',
  },
  currentPlayerText: {
    fontSize: 16,
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
  },
  diceText: {
    fontSize: 16,
    color: Colors.primary.hotPink,
    fontWeight: 'bold',
  },
  gameBoard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
    alignSelf: 'center',
    maxWidth: BOARD_SIZE + 20,
    maxHeight: BOARD_SIZE + 20,
  },
  boardContainer: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: 'relative',
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
  },
  homeArea: {
    position: 'absolute',
    width: CELL_SIZE * 6,
    height: CELL_SIZE * 6,
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  redHome: {
    top: CELL_SIZE * 9,
    left: CELL_SIZE * 0,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  greenHome: {
    top: CELL_SIZE * 0,
    left: CELL_SIZE * 0,
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  yellowHome: {
    top: CELL_SIZE * 9,
    left: CELL_SIZE * 9,
    backgroundColor: 'rgba(255, 255, 0, 0.3)',
  },
  blueHome: {
    top: CELL_SIZE * 0,
    left: CELL_SIZE * 9,
    backgroundColor: 'rgba(0, 191, 255, 0.3)',
  },
  homeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  homeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: CELL_SIZE * 4,
    height: CELL_SIZE * 4,
  },
  homeCell: {
    width: CELL_SIZE * 1.8,
    height: CELL_SIZE * 1.8,
    margin: 2,
    borderRadius: CELL_SIZE * 0.9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pathCell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeZoneText: {
    fontSize: CELL_SIZE * 0.4,
    color: '#FF4500',
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  positionNumber: {
    fontSize: CELL_SIZE * 0.25,
    color: '#000000',
    fontWeight: 'bold',
    position: 'absolute',
    top: 1,
    left: 1,
  },
  centerTriangle: {
    position: 'absolute',
    top: CELL_SIZE * 6,
    left: CELL_SIZE * 6,
    width: CELL_SIZE * 3,
    height: CELL_SIZE * 3,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  centerText: {
    fontSize: CELL_SIZE * 0.8,
  },
  gamePiece: {
    position: 'absolute',
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    borderRadius: PIECE_SIZE / 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    zIndex: 10, // Ensure pieces are above board elements
  },
  pieceNumber: {
    fontSize: Math.max(PIECE_SIZE * 0.4, 10),
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pieceTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PIECE_SIZE / 2,
  },
  diceButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.neonCyan,
    marginBottom: 16,
    alignSelf: 'center',
    minWidth: 120,
  },
  dice: {
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#333333',
  },
  diceNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  diceLabel: {
    fontSize: 16,
    color: Colors.primary.text,
    fontWeight: '600',
  },
  playersStatus: {
    gap: 8,
  },
  playerStatus: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: Colors.primary.surface,
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerPieces: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginBottom: 2,
  },
  instructionsPanel: {
    backgroundColor: Colors.primary.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.gold,
    marginTop: 16,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: Colors.primary.gold,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  instructionsSubtext: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  debugControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  debugButton: {
    backgroundColor: Colors.primary.hotPink,
    padding: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
