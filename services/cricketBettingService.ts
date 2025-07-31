// Cricket Betting Service - House Edge and Commission System
import { AdvancedGameLogicService } from './advancedGameLogicService';

interface UserBehavior {
  betsPlaced: number;
  totalWagered: number;
  winStreak: number;
  exposure: number;
  lastBetTime: number;
}

interface BetResult {
  isWin: boolean;
  payout: number;
  commission: number;
  houseProfit: number;
}

export class CricketBettingService {
  // House configuration
  private static readonly DEFAULT_HOUSE_MARGIN = 0.08; // 8%
  private static readonly COMMISSION_RATE = 0.05; // 5%
  private static readonly MIN_ODDS = 1.20;
  private static readonly MAX_EXPOSURE_PER_MARKET = 500;
  
  // Win rate configuration for cricket betting
  private static readonly BASE_WIN_RATE = 0.35; // 35% base win rate
  private static readonly HOUSE_ADVANTAGE = 0.15; // 15% house advantage

  /**
   * Apply house margin to odds
   */
  static applyHouseMargin(trueOdds: number, marginPercent: number = 8): number {
    const margin = 1 - (marginPercent / 100);
    return Math.max(this.MIN_ODDS, trueOdds * margin);
  }

  /**
   * Calculate dynamic odds based on user behavior
   */
  static calculateDynamicOdds(trueOdds: number, userBehavior: UserBehavior): number {
    let margin = this.DEFAULT_HOUSE_MARGIN;
    
    // Increase margin on popular bets
    if (userBehavior.betsPlaced > 100) {
      margin = 0.15; // 15% margin for heavy bettors
    }
    // Decrease margin for market balancing
    else if (userBehavior.exposure > 5000) {
      margin = 0.03; // 3% margin to encourage betting
    }
    
    // Apply win streak penalty
    if (userBehavior.winStreak >= 5) {
      const streakPenalty = Math.min(0.25, userBehavior.winStreak * 0.05);
      margin += streakPenalty;
    }
    
    // Time-based adjustments (encourage quick betting)
    const timeSinceLastBet = Date.now() - userBehavior.lastBetTime;
    if (timeSinceLastBet < 60000) { // Less than 1 minute
      margin *= 0.95; // Slight bonus for quick betting
    }
    
    const adjustedOdds = trueOdds * (1 - margin);
    return Math.max(this.MIN_ODDS, adjustedOdds);
  }

  /**
   * Calculate potential payout with commission
   */
  static calculatePayout(stake: number, odds: number): number {
    const grossPayout = stake * odds;
    const profit = grossPayout - stake;
    const commission = profit * this.COMMISSION_RATE;
    
    // Return stake + profit - commission
    return Math.max(stake, grossPayout - commission);
  }

  /**
   * Determine bet outcome with house advantage
   */
  static async determineBetOutcome(
    market: string, 
    stake: number, 
    odds: number, 
    userBehavior: UserBehavior
  ): Promise<BetResult> {
    // Calculate win probability based on market type
    let baseWinRate = this.BASE_WIN_RATE;
    
    // Adjust win rate by market type
    switch (market) {
      case 'next_ball':
        baseWinRate = 0.30; // Lower for specific ball outcomes
        break;
      case 'current_over':
        baseWinRate = 0.40; // Higher for over totals
        break;
      case 'next_wicket':
        baseWinRate = 0.25; // Lower for specific dismissal types
        break;
      default:
        baseWinRate = 0.35;
    }
    
    // Apply user behavior adjustments
    let adjustedWinRate = baseWinRate;
    
    // Reduce win rate for high-stakes bets
    if (stake > 100) {
      adjustedWinRate *= 0.85;
    }
    
    // Reduce win rate for users on winning streaks
    if (userBehavior.winStreak >= 3) {
      const streakPenalty = Math.min(0.5, userBehavior.winStreak * 0.1);
      adjustedWinRate *= (1 - streakPenalty);
    }
    
    // Increase win rate slightly for new users (first 5 bets)
    if (userBehavior.betsPlaced < 5) {
      adjustedWinRate *= 1.1;
    }
    
    // Use advanced game logic for final determination
    const gameResult = await AdvancedGameLogicService.determineGameOutcome(
      'cricket-betting',
      stake,
      {
        customWinRate: adjustedWinRate,
        market,
        odds,
        userBehavior
      }
    ).catch(() => {
      // Fallback if advanced game logic fails
      return {
        isWin: Math.random() < adjustedWinRate,
        multiplier: 1.0
      };
    });
    
    const isWin = gameResult.isWin;
    let payout = 0;
    let commission = 0;
    let houseProfit = 0;
    
    if (isWin) {
      payout = this.calculatePayout(stake, odds);
      commission = (payout - stake) * this.COMMISSION_RATE;
      houseProfit = commission; // House keeps commission
    } else {
      houseProfit = stake; // House keeps entire stake
    }
    
    return {
      isWin,
      payout,
      commission,
      houseProfit
    };
  }

  /**
   * Check if bet should be voided (house-favorable rules)
   */
  static shouldVoidBet(market: string, outcome: string): boolean {
    // Dead ball rule - void certain bets randomly (2% chance)
    if (Math.random() < 0.02) {
      return true;
    }
    
    // Market-specific void rules
    switch (market) {
      case 'next_ball':
        // Void if "no ball" or "wide" (simulated 5% chance)
        return Math.random() < 0.05;
      
      case 'current_over':
        // Void if over is incomplete due to innings end (3% chance)
        return Math.random() < 0.03;
      
      default:
        return false;
    }
  }

  /**
   * Calculate house profit margin for reporting
   */
  static calculateHouseMargin(totalStakes: number, totalPayouts: number): number {
    if (totalStakes === 0) return 0;
    return ((totalStakes - totalPayouts) / totalStakes) * 100;
  }

  /**
   * Generate market exposure report
   */
  static generateExposureReport(activeBets: Array<{market: string, stake: number, odds: number}>): Record<string, number> {
    const exposure: Record<string, number> = {};
    
    activeBets.forEach(bet => {
      const potentialPayout = this.calculatePayout(bet.stake, bet.odds);
      const marketExposure = potentialPayout - bet.stake;
      
      if (!exposure[bet.market]) {
        exposure[bet.market] = 0;
      }
      exposure[bet.market] += marketExposure;
    });
    
    return exposure;
  }

  /**
   * Check if market should be suspended due to high exposure
   */
  static shouldSuspendMarket(market: string, currentExposure: number): boolean {
    return currentExposure > this.MAX_EXPOSURE_PER_MARKET;
  }

  /**
   * Apply time-based odds adjustments
   */
  static applyTimeBasedAdjustments(odds: number, timeToMarketClose: number): number {
    // Reduce odds as market close approaches (creates urgency)
    const minutesToClose = timeToMarketClose / (1000 * 60);
    
    if (minutesToClose < 1) {
      return odds * 0.95; // 5% reduction in final minute
    } else if (minutesToClose < 5) {
      return odds * 0.98; // 2% reduction in final 5 minutes
    }
    
    return odds;
  }

  /**
   * Generate promotional offers for losing bets
   */
  static generateLossRecoveryOffer(consecutiveLosses: number, lastStake: number): {
    type: string;
    value: number;
    description: string;
  } | null {
    if (consecutiveLosses < 3) return null;
    
    const offerTypes = [
      {
        type: 'partial_refund',
        value: Math.min(50, lastStake * 0.25),
        description: `Get ${Math.min(50, lastStake * 0.25)}% of your last bet back!`
      },
      {
        type: 'bonus_bet',
        value: Math.min(25, lastStake * 0.5),
        description: `Free PKR ${Math.min(25, lastStake * 0.5)} bonus bet on next market!`
      },
      {
        type: 'odds_boost',
        value: 1.2,
        description: '20% odds boost on your next bet!'
      }
    ];
    
    return offerTypes[Math.floor(Math.random() * offerTypes.length)];
  }
}
