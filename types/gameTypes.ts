// Game Types for Adola Gaming Platform

export interface GameResult {
  win: boolean;
  amount: number;
  multiplier?: number;
  details?: any;
}

export interface GameState {
  isPlaying: boolean;
  balance: number;
  currentBet: number;
  lastResult?: GameResult;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  minBet: number;
  maxBet: number;
  category: 'slots' | 'cards' | 'dice' | 'lottery' | 'originals';
  image?: string;
  isActive: boolean;
}

export interface BetResult {
  success: boolean;
  newBalance: number;
  winAmount?: number;
  error?: string;
}

// Dice Game Types
export interface DiceGameState extends GameState {
  selectedNumber: number;
  prediction: 'over' | 'under';
  diceResult?: number;
}

// Plinko Game Types
export interface PlinkoGameState extends GameState {
  ballPosition: { x: number; y: number };
  multiplier: number;
  isDropping: boolean;
}

// Mines Game Types
export interface MinesGameState extends GameState {
  gridSize: number;
  mineCount: number;
  revealedCells: boolean[][];
  gameOver: boolean;
  currentMultiplier: number;
}
