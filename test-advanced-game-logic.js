// Test script for Advanced Game Logic Service
// Run this with: node test-advanced-game-logic.js

// Mock Supabase for testing
const mockSupabase = {
  from: (table) => ({
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: [], error: null })
      })
    }),
    insert: () => Promise.resolve({ error: null }),
    upsert: () => Promise.resolve({ error: null })
  })
};

// Mock the service (simplified version for testing)
class TestAdvancedGameLogicService {
  constructor() {
    this.gameConfigs = {
      dice: { minBet: 10, maxBet: 5000, houseEdge: 0.05, baseWinProbability: 0.45, name: 'Dice Game', enabled: true },
      mines: { minBet: 10, maxBet: 5000, houseEdge: 0.03, baseWinProbability: 0.45, name: 'Mines', enabled: true },
      tower: { minBet: 10, maxBet: 5000, houseEdge: 0.04, baseWinProbability: 0.45, name: 'Tower', enabled: true },
      limbo: { minBet: 10, maxBet: 5000, houseEdge: 0.02, baseWinProbability: 0.45, name: 'Limbo', enabled: true },
    };
    
    this.engagementFeatures = {
      lossRecoveryMode: true,
      winStreakBoost: true,
      nearMissEnabled: true,
      dailyBonusEnabled: true,
      maxRecoveryBonus: 0.15,
      maxStreakReduction: 0.10,
    };
  }

  getGameConfig(gameType) {
    return this.gameConfigs[gameType] || this.gameConfigs.dice;
  }

  canPlayGame(betAmount, currentBalance, gameType) {
    const config = this.getGameConfig(gameType);
    return currentBalance >= betAmount && 
           betAmount >= config.minBet && 
           betAmount <= config.maxBet && 
           config.enabled;
  }

  getBalanceValidationMessage(betAmount, currentBalance, gameType) {
    const config = this.getGameConfig(gameType);
    
    if (!config.enabled) {
      return `${config.name} is currently disabled.`;
    }
    if (betAmount <= 0) {
      return 'Bet amount must be greater than 0.';
    }
    if (betAmount < config.minBet) {
      return `Minimum bet for ${config.name} is PKR ${config.minBet.toLocaleString()}.`;
    }
    if (betAmount > config.maxBet) {
      return `Maximum bet for ${config.name} is PKR ${config.maxBet.toLocaleString()}.`;
    }
    if (currentBalance < betAmount) {
      return `Insufficient balance. You need PKR ${betAmount.toLocaleString()} but only have PKR ${currentBalance.toLocaleString()}.`;
    }
    return '';
  }

  // Mock user stats for testing
  async getUserGameStats(userId, gameType) {
    // Simulate different user scenarios
    const scenarios = {
      'new-user': { totalGamesPlayed: 0, totalWon: 0, totalLost: 0, netProfit: 0, winStreak: 0, lossStreak: 0, averageBet: 0 },
      'losing-user': { totalGamesPlayed: 20, totalWon: 1000, totalLost: 5000, netProfit: -4000, winStreak: 0, lossStreak: 8, averageBet: 250 },
      'winning-user': { totalGamesPlayed: 15, totalWon: 8000, totalLost: 3000, netProfit: 5000, winStreak: 3, lossStreak: 0, averageBet: 500 },
      'balanced-user': { totalGamesPlayed: 50, totalWon: 12000, totalLost: 12500, netProfit: -500, winStreak: 1, lossStreak: 0, averageBet: 250 }
    };
    
    return scenarios[userId] || scenarios['new-user'];
  }

  async calculateWinProbability(input) {
    const { betAmount, gameType, userId } = input;
    const config = this.getGameConfig(gameType);
    const userStats = await this.getUserGameStats(userId, gameType);

    // Base win probability from config (45% for most games)
    let winProbability = config.baseWinProbability;
    const adjustments = [];
    let engagementBonus = '';

    // Apply user behavior adjustments
    const { totalGamesPlayed: T, totalWon: W_total, totalLost: L_total } = userStats;

    // If user is profitable, reduce win probability by 5-10%
    if (W_total > L_total && T > 5) {
      const profitRatio = (W_total - L_total) / Math.max(W_total + L_total, 1);
      const reduction = Math.min(0.1, profitRatio * 0.2); // Max 10% reduction
      winProbability -= reduction;
      adjustments.push(`Profit adjustment: -${(reduction * 100).toFixed(1)}%`);
    }

    // If user is losing, temporarily increase win probability for retention
    if (L_total > W_total && this.engagementFeatures.lossRecoveryMode && T > 3) {
      const lossRatio = (L_total - W_total) / Math.max(W_total + L_total, 1);
      const increase = Math.min(0.15, lossRatio * 0.3); // Max 15% increase
      winProbability += increase;
      adjustments.push(`Loss recovery: +${(increase * 100).toFixed(1)}%`);
    }

    // Loss recovery bonus after 5+ consecutive losses
    if (userStats.lossStreak >= 5 && this.engagementFeatures.lossRecoveryMode) {
      const recoveryBonus = Math.min(
        this.engagementFeatures.maxRecoveryBonus, 
        userStats.lossStreak * 0.02
      ); // 2% per loss, max 15%
      winProbability += recoveryBonus;
      engagementBonus = `Loss Recovery Boost: +${(recoveryBonus * 100).toFixed(1)}%`;
      adjustments.push(engagementBonus);
    }

    // Win streak reduction (balance after wins)
    if (userStats.winStreak >= 2 && this.engagementFeatures.winStreakBoost) {
      const streakReduction = Math.min(
        this.engagementFeatures.maxStreakReduction, 
        userStats.winStreak * 0.02
      ); // 2% per win, max 10%
      winProbability -= streakReduction;
      adjustments.push(`Win streak balance: -${(streakReduction * 100).toFixed(1)}%`);
    }

    // Ensure probability stays within reasonable bounds
    winProbability = Math.max(0.05, Math.min(0.85, winProbability));

    return {
      probability: winProbability,
      engagementBonus,
      adjustments,
    };
  }

  async calculatePayout(input) {
    const { betAmount, basePayout, gameType, userId } = input;
    const config = this.getGameConfig(gameType);
    const userStats = await this.getUserGameStats(userId, gameType);

    // Base payout modulator formula from requirements document
    const { totalGamesPlayed: T, totalWon: W_total, totalLost: L_total } = userStats;
    
    // Payout modulator formula: 1 - H - (W_total - L_total) / (T × B × 10)
    const payoutModulator = 1 - config.houseEdge - 
      (W_total - L_total) / Math.max(T * betAmount * 10, 1);

    // Ensure modulator stays within reasonable bounds
    const clampedModulator = Math.max(0.5, Math.min(1.2, payoutModulator));

    const finalPayout = Math.floor(betAmount * basePayout * clampedModulator);

    return finalPayout;
  }

  async calculateAdvancedGameResult(input) {
    const { betAmount, basePayout, gameType, userId, currentBalance } = input;
    const config = this.getGameConfig(gameType);

    // Check if game is playable
    if (currentBalance < betAmount || betAmount <= 0) {
      return {
        won: false,
        multiplier: 0,
        winAmount: 0,
        betAmount,
        newBalance: currentBalance,
        message: betAmount <= 0 ? 'Invalid bet amount' : 'Insufficient balance',
        adjustedProbability: 0,
        houseEdge: config.houseEdge,
      };
    }

    // Calculate win probability with user behavior adjustments
    const { probability, engagementBonus, adjustments } = await this.calculateWinProbability(input);

    // Use random number for fairness
    const randomValue = Math.random();
    const won = randomValue < probability;

    let winAmount = 0;
    let multiplier = 0;

    if (won) {
      // Calculate payout with house edge and user behavior modulation
      winAmount = await this.calculatePayout(input);
      multiplier = winAmount / betAmount;
    }

    const newBalance = won ? currentBalance + winAmount - betAmount : currentBalance - betAmount;

    let message = won 
      ? `🎉 You won PKR ${winAmount.toLocaleString()}! (${multiplier.toFixed(2)}x)`
      : `😔 You lost PKR ${betAmount.toLocaleString()}. Better luck next time!`;

    if (engagementBonus) {
      message += ` ${engagementBonus}`;
    }

    return {
      won,
      multiplier,
      winAmount,
      betAmount,
      newBalance,
      message,
      adjustedProbability: probability,
      houseEdge: config.houseEdge,
      engagementBonus,
    };
  }
}

// Test scenarios
async function runTests() {
  console.log('🧪 Testing Advanced Game Logic Service\n');
  
  const service = new TestAdvancedGameLogicService();
  
  // Test different user scenarios
  const testScenarios = [
    { userId: 'new-user', description: 'New User (No History)' },
    { userId: 'losing-user', description: 'Losing User (8 Loss Streak)' },
    { userId: 'winning-user', description: 'Winning User (3 Win Streak)' },
    { userId: 'balanced-user', description: 'Balanced User' }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n📊 Testing: ${scenario.description}`);
    console.log('=' .repeat(50));
    
    const userStats = await service.getUserGameStats(scenario.userId);
    console.log(`User Stats:`, userStats);
    
    // Test dice game
    const diceInput = {
      betAmount: 100,
      basePayout: 2.0,
      gameType: 'dice',
      userId: scenario.userId,
      currentBalance: 1000
    };
    
    const diceResult = await service.calculateAdvancedGameResult(diceInput);
    console.log(`\n🎲 Dice Game Result:`, diceResult);
    
    // Test probability calculation
    const probResult = await service.calculateWinProbability(diceInput);
    console.log(`🎯 Win Probability: ${(probResult.probability * 100).toFixed(1)}%`);
    console.log(`📈 Adjustments: ${probResult.adjustments.join(', ')}`);
    
    // Test validation
    const validationMessage = service.getBalanceValidationMessage(100, 1000, 'dice');
    console.log(`✅ Validation: ${validationMessage || 'Valid bet'}`);
  }
  
  console.log('\n🎯 Testing Edge Cases');
  console.log('=' .repeat(50));
  
  // Test insufficient balance
  const insufficientResult = await service.calculateAdvancedGameResult({
    betAmount: 2000,
    basePayout: 2.0,
    gameType: 'dice',
    userId: 'new-user',
    currentBalance: 1000
  });
  console.log('💸 Insufficient Balance Test:', insufficientResult.message);
  
  // Test minimum bet validation
  const minBetMessage = service.getBalanceValidationMessage(5, 1000, 'dice');
  console.log('📏 Min Bet Validation:', minBetMessage);
  
  // Test maximum bet validation
  const maxBetMessage = service.getBalanceValidationMessage(10000, 15000, 'dice');
  console.log('📏 Max Bet Validation:', maxBetMessage);
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);
