// Advanced Game Logic Service for Adola Gaming Platform
// Implements dynamic win calculation engine with user behavior tracking and house edge management
// Based on requirements document: Player Engagement & House Edge Mechanism

import { supabase } from '../lib/supabase';

export interface AdvancedGameResult {
  won: boolean;
  multiplier: number;
  winAmount: number;
  betAmount: number;
  newBalance: number;
  message?: string;
  adjustedProbability?: number;
  houseEdge?: number;
  engagementBonus?: string;
}

export interface GameConfig {
  minBet: number;
  maxBet: number;
  houseEdge: number;
  baseWinProbability: number;
  name: string;
  enabled: boolean;
}

export interface UserGameStats {
  totalGamesPlayed: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
  winStreak: number;
  lossStreak: number;
  lastGameTime: Date;
  averageBet: number;
}

export interface WinCalculationInput {
  betAmount: number;
  basePayout: number;
  gameType: string;
  userId: string;
  currentBalance: number;
  gameSpecificData?: any;
}

export interface EngagementFeatures {
  lossRecoveryMode: boolean;
  winStreakBoost: boolean;
  nearMissEnabled: boolean;
  dailyBonusEnabled: boolean;
  maxRecoveryBonus: number;
  maxStreakReduction: number;
}

export class AdvancedGameLogicService {
  private static instance: AdvancedGameLogicService;
  
  // Default game configurations with house edge - UPDATED FOR HIGHER HOUSE WINS
  private gameConfigs: { [key: string]: GameConfig } = {
    dice: {
      minBet: 10, maxBet: 5000, houseEdge: 0.08, baseWinProbability: 0.15,
      name: 'Dice Game', enabled: true
    },
    mines: {
      minBet: 10, maxBet: 5000, houseEdge: 0.07, baseWinProbability: 0.12,
      name: 'Mines', enabled: true
    },
    tower: {
      minBet: 10, maxBet: 5000, houseEdge: 0.09, baseWinProbability: 0.10,
      name: 'Tower', enabled: true
    },
    limbo: {
      minBet: 10, maxBet: 5000, houseEdge: 0.06, baseWinProbability: 0.18,
      name: 'Limbo', enabled: true
    },
    aviator: {
      minBet: 10, maxBet: 5000, houseEdge: 0.06, baseWinProbability: 0.16,
      name: 'Aviator', enabled: true
    },
    slots: {
      minBet: 10, maxBet: 5000, houseEdge: 0.08, baseWinProbability: 0.14,
      name: 'Diamond Slots', enabled: true
    },
    baccarat: {
      minBet: 10, maxBet: 5000, houseEdge: 0.07, baseWinProbability: 0.13,
      name: 'Baccarat', enabled: true
    },
    blackjack: {
      minBet: 10, maxBet: 5000, houseEdge: 0.06, baseWinProbability: 0.15,
      name: 'Blackjack', enabled: true
    },
    poker: {
      minBet: 10, maxBet: 5000, houseEdge: 0.07, baseWinProbability: 0.12,
      name: 'Poker', enabled: true
    },
    roulette: {
      minBet: 10, maxBet: 5000, houseEdge: 0.08, baseWinProbability: 0.10,
      name: 'Roulette', enabled: true
    },
    megadraw: {
      minBet: 10, maxBet: 1000, houseEdge: 0.35, baseWinProbability: 0.08,
      name: 'Mega Draw', enabled: true
    },
    luckynumbers: {
      minBet: 10, maxBet: 1000, houseEdge: 0.35, baseWinProbability: 0.08,
      name: 'Lucky Numbers', enabled: true
    },
    crash: {
      minBet: 10, maxBet: 10000, houseEdge: 0.03, baseWinProbability: 0.20,
      name: 'Crash Game', enabled: true
    },
    powerball: {
      minBet: 10, maxBet: 1000, houseEdge: 0.15, baseWinProbability: 0.05,
      name: 'PowerBall Lottery', enabled: true
    },
    rollmaster: {
      minBet: 10, maxBet: 5000, houseEdge: 0.04, baseWinProbability: 0.18,
      name: 'Roll Master', enabled: true
    },
  };

  // Engagement features configuration
  private engagementFeatures: EngagementFeatures = {
    lossRecoveryMode: true,
    winStreakBoost: true,
    nearMissEnabled: true,
    dailyBonusEnabled: true,
    maxRecoveryBonus: 0.15, // 15% max recovery bonus
    maxStreakReduction: 0.10, // 10% max streak reduction
  };

  private constructor() {
    // Don't call loadGameConfigs here - it's async and constructor can't wait
    // It will be called when getInstance is first used
  }

  public static getInstance(): AdvancedGameLogicService {
    if (!AdvancedGameLogicService.instance) {
      AdvancedGameLogicService.instance = new AdvancedGameLogicService();
      // Load configs immediately after instance creation
      AdvancedGameLogicService.instance.loadGameConfigs();
    }
    return AdvancedGameLogicService.instance;
  }

  // Load game configurations from database (admin configurable)
  private async loadGameConfigs(): Promise<void> {
    try {
      console.log('🔄 Loading game configurations from database...');
      const { data: configs, error } = await supabase
        .from('game_configs')
        .select('*');

      if (error) {
        console.error('❌ Error loading game configs:', error);
        console.log('📊 Using default game configurations');
        return;
      }

      if (configs && configs.length > 0) {
        console.log(`📊 Found ${configs.length} game configurations in database`);
        configs.forEach(config => {
          if (this.gameConfigs[config.game_type]) {
            const oldConfig = { ...this.gameConfigs[config.game_type] };
            this.gameConfigs[config.game_type] = {
              ...this.gameConfigs[config.game_type],
              houseEdge: config.house_edge,
              baseWinProbability: config.base_win_probability,
              enabled: config.enabled,
            };
            console.log(`✅ Updated ${config.game_name}: ${(oldConfig.baseWinProbability * 100).toFixed(1)}% → ${(config.base_win_probability * 100).toFixed(1)}%`);
          } else {
            console.log(`⚠️ Unknown game type: ${config.game_type}`);
          }
        });
        console.log('✅ All game configurations loaded from database');
      } else {
        console.log('📊 No game configs found in database, using defaults');
      }
    } catch (error) {
      console.error('❌ Error in loadGameConfigs:', error);
      console.log('📊 Using default game configurations');
    }
  }

  // Public method to reload game configurations (for admin updates)
  public async reloadGameConfigs(): Promise<void> {
    await this.loadGameConfigs();
  }

  // Get game configuration
  public getGameConfig(gameType: string): GameConfig {
    return this.gameConfigs[gameType] || this.gameConfigs.dice;
  }

  // Update game configuration (for admin controls)
  public async updateGameConfig(gameType: string, config: Partial<GameConfig>): Promise<boolean> {
    try {
      console.log(`🔄 Updating game config for ${gameType}:`, config);

      // Get the current game config to include required fields
      const currentConfig = this.gameConfigs[gameType];
      if (!currentConfig) {
        console.error(`❌ No local config found for game type: ${gameType}`);
        return false;
      }

      // Update database first - include all required fields for upsert
      const updateData: any = {
        game_type: gameType,
        game_name: currentConfig.name, // Required field
        updated_at: new Date().toISOString(),
      };

      // Only include fields that are provided, with fallbacks to current values
      updateData.house_edge = config.houseEdge !== undefined ? config.houseEdge : currentConfig.houseEdge;
      updateData.base_win_probability = config.baseWinProbability !== undefined ? config.baseWinProbability : currentConfig.baseWinProbability;
      updateData.enabled = config.enabled !== undefined ? config.enabled : currentConfig.enabled;
      updateData.min_bet = currentConfig.minBet;
      updateData.max_bet = currentConfig.maxBet;

      console.log(`📤 Sending to database:`, updateData);

      // Use upsert with onConflict to specify which field to use for conflict resolution
      const { error } = await supabase
        .from('game_configs')
        .upsert(updateData, {
          onConflict: 'game_type',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Error updating game config in database:', error);
        return false;
      }

      // Update local config after successful database update
      if (this.gameConfigs[gameType]) {
        const oldConfig = { ...this.gameConfigs[gameType] };
        this.gameConfigs[gameType] = { ...this.gameConfigs[gameType], ...config };
        console.log(`✅ Local config updated for ${gameType}: ${(oldConfig.baseWinProbability * 100).toFixed(1)}% → ${(this.gameConfigs[gameType].baseWinProbability * 100).toFixed(1)}%`);
      }

      console.log(`✅ Game config successfully updated for ${gameType}`);
      return true;
    } catch (error) {
      console.error('❌ Error in updateGameConfig:', error);
      return false;
    }
  }

  // Get user game statistics from database
  public async getUserGameStats(userId: string, gameType?: string): Promise<UserGameStats> {
    try {
      let query = supabase
        .from('game_sessions')
        .select('bet_amount, win_amount, is_win, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (gameType) {
        query = query.eq('game_id', gameType);
      }

      const { data: sessions, error } = await query;

      if (error) {
        console.error('❌ Error fetching user game stats:', error);
        return this.getDefaultUserStats();
      }

      if (!sessions || sessions.length === 0) {
        return this.getDefaultUserStats();
      }

      // Calculate statistics
      const totalGamesPlayed = sessions.length;
      const totalWon = sessions.filter(s => s.is_win).reduce((sum, s) => sum + (s.win_amount || 0), 0);
      const totalLost = sessions.filter(s => !s.is_win).reduce((sum, s) => sum + s.bet_amount, 0);
      const netProfit = totalWon - totalLost;
      const averageBet = sessions.reduce((sum, s) => sum + s.bet_amount, 0) / totalGamesPlayed;

      // Calculate current streaks
      let winStreak = 0;
      let lossStreak = 0;
      for (const session of sessions) {
        if (session.is_win) {
          winStreak++;
          lossStreak = 0;
        } else {
          lossStreak++;
          winStreak = 0;
        }
        if (winStreak > 0 && lossStreak > 0) break;
      }

      return {
        totalGamesPlayed,
        totalWon,
        totalLost,
        netProfit,
        winStreak,
        lossStreak,
        lastGameTime: new Date(sessions[0].created_at),
        averageBet,
      };
    } catch (error) {
      console.error('❌ Error in getUserGameStats:', error);
      return this.getDefaultUserStats();
    }
  }

  private getDefaultUserStats(): UserGameStats {
    return {
      totalGamesPlayed: 0,
      totalWon: 0,
      totalLost: 0,
      netProfit: 0,
      winStreak: 0,
      lossStreak: 0,
      lastGameTime: new Date(),
      averageBet: 0,
    };
  }

  // Core win calculation engine based on requirements document
  public async calculateWinProbability(input: WinCalculationInput): Promise<{
    probability: number;
    engagementBonus: string;
    adjustments: string[];
  }> {
    const { betAmount, gameType, userId } = input;
    const config = this.getGameConfig(gameType);
    const userStats = await this.getUserGameStats(userId, gameType);

    // Base win probability from config (45% for most games)
    let winProbability = config.baseWinProbability;
    const adjustments: string[] = [];
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

    console.log(`🎯 Win probability calculated: ${(winProbability * 100).toFixed(1)}% for ${gameType}`);
    console.log(`📊 Adjustments: ${adjustments.join(', ')}`);

    return {
      probability: winProbability,
      engagementBonus,
      adjustments,
    };
  }

  // Calculate payout with house edge and user behavior modulation
  public async calculatePayout(input: WinCalculationInput): Promise<number> {
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

    console.log(`💰 Payout calculated: PKR ${finalPayout} (modulator: ${clampedModulator.toFixed(3)})`);
    return finalPayout;
  }

  // Main game calculation method that combines probability and payout
  public async calculateAdvancedGameResult(input: WinCalculationInput): Promise<AdvancedGameResult> {
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

    // Use cryptographic randomness for fairness
    const randomValue = this.generateSecureRandom();
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

  // Generate cryptographically secure random number
  private generateSecureRandom(): number {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] / (0xffffffff + 1);
    } else {
      // Fallback to Math.random() if crypto is not available
      return Math.random();
    }
  }

  // Check if user can play the game
  public canPlayGame(betAmount: number, currentBalance: number, gameType: string): boolean {
    const config = this.getGameConfig(gameType);
    return currentBalance >= betAmount &&
           betAmount >= config.minBet &&
           betAmount <= config.maxBet &&
           config.enabled;
  }

  // Get balance validation message
  public getBalanceValidationMessage(betAmount: number, currentBalance: number, gameType: string): string {
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

  // Update engagement features (for admin controls)
  public updateEngagementFeatures(features: Partial<EngagementFeatures>): void {
    this.engagementFeatures = { ...this.engagementFeatures, ...features };
    console.log('✅ Engagement features updated:', features);
  }

  // Get current engagement features
  public getEngagementFeatures(): EngagementFeatures {
    return { ...this.engagementFeatures };
  }

  // Get all game configurations
  public getAllGameConfigs(): { [key: string]: GameConfig } {
    return { ...this.gameConfigs };
  }

  // Log game result for analytics
  public async logGameResult(
    userId: string,
    gameType: string,
    result: AdvancedGameResult,
    sessionData?: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('game_sessions')
        .insert({
          user_id: userId,
          game_id: gameType,
          game_name: this.getGameConfig(gameType).name,
          bet_amount: result.betAmount,
          win_amount: result.winAmount,
          is_win: result.won,
          game_data: {
            multiplier: result.multiplier,
            adjusted_probability: result.adjustedProbability,
            house_edge: result.houseEdge,
            engagement_bonus: result.engagementBonus,
            session_data: sessionData,
          }
        });

      if (error) {
        console.error('❌ Error logging game result:', error);
      } else {
        console.log(`📊 Game result logged: ${gameType} - ${result.won ? 'WIN' : 'LOSS'}`);
      }
    } catch (error) {
      console.error('❌ Error in logGameResult:', error);
    }
  }
}
