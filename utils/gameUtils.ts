// Game Utilities for Adola Gaming Platform

import { GameResult, BetResult } from '../types/gameTypes';

// Random number generator with seed for fairness
export const generateRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Calculate win amount based on multiplier
export const calculateWinAmount = (betAmount: number, multiplier: number): number => {
  return Math.floor(betAmount * multiplier);
};

// Validate bet amount
export const validateBet = (amount: number, balance: number, minBet: number, maxBet: number): boolean => {
  return amount >= minBet && amount <= maxBet && amount <= balance;
};

// Process bet result
export const processBetResult = (
  currentBalance: number,
  betAmount: number,
  gameResult: GameResult
): BetResult => {
  if (gameResult.win) {
    const winAmount = gameResult.amount;
    return {
      success: true,
      newBalance: currentBalance + winAmount,
      winAmount: winAmount,
    };
  } else {
    return {
      success: true,
      newBalance: currentBalance - betAmount,
      winAmount: 0,
    };
  }
};

// Dice game logic
export const playDiceGame = (
  selectedNumber: number,
  prediction: 'over' | 'under',
  betAmount: number
): GameResult => {
  const diceResult = generateRandomNumber(1, 6);
  let win = false;
  let multiplier = 1;

  if (prediction === 'over' && diceResult > selectedNumber) {
    win = true;
    multiplier = 6 / (6 - selectedNumber);
  } else if (prediction === 'under' && diceResult < selectedNumber) {
    win = true;
    multiplier = 6 / (selectedNumber - 1);
  }

  return {
    win,
    amount: win ? calculateWinAmount(betAmount, multiplier) : 0,
    multiplier,
    details: { diceResult, selectedNumber, prediction }
  };
};



// Mines game logic
export const createMinesGrid = (size: number, mineCount: number): boolean[][] => {
  const grid: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  
  // Place mines randomly
  let minesPlaced = 0;
  while (minesPlaced < mineCount) {
    const row = generateRandomNumber(0, size - 1);
    const col = generateRandomNumber(0, size - 1);
    
    if (!grid[row][col]) {
      grid[row][col] = true;
      minesPlaced++;
    }
  }
  
  return grid;
};

// Calculate mines multiplier
export const calculateMinesMultiplier = (revealedSafeCells: number, totalMines: number, gridSize: number): number => {
  const totalCells = gridSize * gridSize;
  const safeCells = totalCells - totalMines;
  const remainingSafeCells = safeCells - revealedSafeCells;
  
  if (remainingSafeCells <= 0) return 1;
  
  return Math.pow(safeCells / remainingSafeCells, 0.5);
};
