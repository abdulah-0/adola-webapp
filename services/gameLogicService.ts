// Game Logic Service for Adola App - Centralized Win/Loss System
// Implements 2 wins to 8 losses ratio (20% win rate) and balance validation

export interface GameResult {
  won: boolean;
  multiplier: number;
  winAmount: number;
  betAmount: number;
  newBalance: number;
  message: string;
}

export interface GameState {
  gameId: string;
  playerId: string;
  betAmount: number;
  currentBalance: number;
  gameType: string;
  timestamp: Date;
}

class GameLogicService {
  private static instance: GameLogicService;
  private winLossHistory: boolean[] = [];
  private readonly WIN_RATIO = 0.2; // 20% win rate (2 wins out of 10 games)
  private readonly LOSS_RATIO = 0.8; // 80% loss rate (8 losses out of 10 games)

  private constructor() {
    this.initializeWinLossPattern();
  }

  public static getInstance(): GameLogicService {
    if (!GameLogicService.instance) {
      GameLogicService.instance = new GameLogicService();
    }
    return GameLogicService.instance;
  }

  // Initialize win/loss pattern to ensure 2:8 ratio
  private initializeWinLossPattern(): void {
    // Create a pattern of 2 wins and 8 losses, then shuffle
    const pattern: boolean[] = [
      true, true, // 2 wins
      false, false, false, false, false, false, false, false // 8 losses
    ];
    
    // Shuffle the pattern to make it unpredictable
    this.shuffleArray(pattern);
    this.winLossHistory = pattern;
  }

  // Shuffle array using Fisher-Yates algorithm
  private shuffleArray(array: boolean[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Check if user has sufficient balance to play
  public canPlayGame(betAmount: number, currentBalance: number): boolean {
    return currentBalance >= betAmount && betAmount > 0;
  }

  // Get balance validation message
  public getBalanceValidationMessage(betAmount: number, currentBalance: number): string {
    if (betAmount <= 0) {
      return 'Please enter a valid bet amount';
    }
    if (currentBalance < betAmount) {
      return `Insufficient balance. You need ${betAmount} coins but only have ${currentBalance} coins.`;
    }
    return '';
  }

  // Determine if current game should be a win based on 2:8 ratio
  public shouldWin(): boolean {
    // If we've used all patterns, reinitialize
    if (this.winLossHistory.length === 0) {
      this.initializeWinLossPattern();
    }

    // Get the next result from our pattern
    const result = this.winLossHistory.shift() || false;
    
    // Add some randomness while maintaining overall ratio
    // 90% of the time follow the pattern, 10% random (but still weighted)
    if (Math.random() < 0.9) {
      return result;
    } else {
      // Even in random cases, maintain lower win probability
      return Math.random() < 0.15; // 15% chance in random cases
    }
  }

  // Calculate game result with proper win/loss ratio
  public calculateGameResult(
    betAmount: number,
    currentBalance: number,
    gameType: string,
    baseMultiplier: number = 2.0
  ): GameResult {
    // Check if game is playable
    if (!this.canPlayGame(betAmount, currentBalance)) {
      return {
        won: false,
        multiplier: 0,
        winAmount: 0,
        betAmount,
        newBalance: currentBalance,
        message: this.getBalanceValidationMessage(betAmount, currentBalance)
      };
    }

    const won = this.shouldWin();
    let multiplier = 0;
    let winAmount = 0;
    let newBalance = currentBalance - betAmount; // Deduct bet first

    if (won) {
      // Calculate multiplier based on game type
      multiplier = this.calculateMultiplier(gameType, baseMultiplier);
      winAmount = Math.floor(betAmount * multiplier);
      newBalance = currentBalance - betAmount + winAmount; // Deduct bet, add winnings
    }

    return {
      won,
      multiplier,
      winAmount,
      betAmount,
      newBalance,
      message: won 
        ? `🎉 You won ${winAmount} coins! (${multiplier.toFixed(2)}x multiplier)`
        : `😔 You lost ${betAmount} coins. Better luck next time!`
    };
  }

  // Calculate multiplier based on game type
  private calculateMultiplier(gameType: string, baseMultiplier: number): number {
    const multipliers: { [key: string]: number[] } = {
      'plinko': [1.5, 2.0, 2.5, 3.0, 4.0, 5.0],
      'aviator': [1.2, 1.5, 2.0, 3.0, 5.0, 10.0],
      'mines': [1.3, 1.8, 2.2, 2.8, 3.5, 4.2],
      'dice': [1.8, 2.0, 2.5, 3.0, 4.0],
      'slots': [2.0, 3.0, 5.0, 10.0, 25.0, 50.0],
      'roulette': [2.0, 3.0, 5.0, 8.0, 15.0, 35.0],
      'blackjack': [1.5, 2.0, 2.5],
      'poker': [2.0, 3.0, 5.0, 10.0],
      'baccarat': [1.8, 2.0, 2.5],
      'crash': [1.2, 1.5, 2.0, 3.0, 5.0, 8.0],
      'limbo': [1.5, 2.0, 3.0, 5.0, 10.0],
      'tower': [1.3, 1.8, 2.5, 4.0, 6.0],
      'default': [1.5, 2.0, 2.5, 3.0]
    };

    const gameMultipliers = multipliers[gameType] || multipliers['default'];
    
    // Add some randomness to multiplier selection
    // Higher multipliers are less likely
    const weights = gameMultipliers.map((_, index) => 
      Math.pow(0.6, index) // Exponential decay for higher multipliers
    );
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < gameMultipliers.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return gameMultipliers[i];
      }
    }
    
    return gameMultipliers[0]; // Fallback to lowest multiplier
  }

  // Validate bet amount for specific game types
  public validateBetAmount(betAmount: number, gameType: string): { valid: boolean; message: string } {
    const minBets: { [key: string]: number } = {
      'plinko': 1,
      'aviator': 1,
      'mines': 1,
      'dice': 1,
      'slots': 5,
      'roulette': 1,
      'blackjack': 5,
      'poker': 10,
      'baccarat': 5,
      'default': 1
    };

    const maxBets: { [key: string]: number } = {
      'plinko': 1000,
      'aviator': 500,
      'mines': 1000,
      'dice': 1000,
      'slots': 100,
      'roulette': 1000,
      'blackjack': 500,
      'poker': 1000,
      'baccarat': 500,
      'default': 1000
    };

    const minBet = minBets[gameType] || minBets['default'];
    const maxBet = maxBets[gameType] || maxBets['default'];

    if (betAmount < minBet) {
      return {
        valid: false,
        message: `Minimum bet for ${gameType} is ${minBet} coins`
      };
    }

    if (betAmount > maxBet) {
      return {
        valid: false,
        message: `Maximum bet for ${gameType} is ${maxBet} coins`
      };
    }

    return { valid: true, message: '' };
  }

  // Get current win/loss statistics
  public getWinLossStats(): { winsRemaining: number; lossesRemaining: number; totalGames: number } {
    const wins = this.winLossHistory.filter(result => result).length;
    const losses = this.winLossHistory.filter(result => !result).length;
    
    return {
      winsRemaining: wins,
      lossesRemaining: losses,
      totalGames: this.winLossHistory.length
    };
  }

  // Reset win/loss pattern (for testing or admin purposes)
  public resetWinLossPattern(): void {
    this.initializeWinLossPattern();
  }
}

export default GameLogicService.getInstance();
