// Referral System Types for Adola Gaming Platform

export interface ReferralUser {
  id: string;
  email: string;
  username: string;
  referralCode: string;
  referredBy?: string; // Referral code of the person who referred this user
  joinedAt: Date;
  isActive: boolean;
  totalRecharges: number;
  validRecharges: number; // Recharges >= Rs 50
}

export interface ReferralRecharge {
  id: string;
  userId: string;
  amount: number;
  rechargeNumber: number; // 1st, 2nd, 3rd recharge
  timestamp: Date;
  bonusEligible: boolean;
  referredUserBonus: number;
  agentBonus: number;
  processed: boolean;
}

export interface DailyMilestone {
  id: string;
  agentId: string;
  date: string; // YYYY-MM-DD format
  validReferrals: number;
  milestoneReached: number;
  bonusAmount: number;
  processed: boolean;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  todayReferrals: number;
  todayEarnings: number;
  currentMilestone: number;
  nextMilestoneTarget: number;
}

export interface ReferralBonus {
  type: 'recharge_bonus' | 'daily_milestone';
  amount: number;
  description: string;
  timestamp: Date;
}

// Bonus Configuration
export const RECHARGE_BONUSES = {
  FIRST_RECHARGE: { user: 10, agent: 20 },   // Rs 10 for user, Rs 20 for agent
  SECOND_RECHARGE: { user: 15, agent: 30 },  // Rs 15 for user, Rs 30 for agent
  THIRD_RECHARGE: { user: 20, agent: 40 },   // Rs 20 for user, Rs 40 for agent
};

export const DAILY_MILESTONES = [
  { referrals: 1, bonus: 50 },   // Rs 50 for 1 referral
  { referrals: 3, bonus: 75 },   // Rs 75 for 3 referrals
  { referrals: 5, bonus: 100 },  // Rs 100 for 5 referrals
  { referrals: 10, bonus: 150 }, // Rs 150 for 10 referrals
  { referrals: 15, bonus: 200 }, // Rs 200 for 15 referrals
  { referrals: 20, bonus: 250 }, // Rs 250 for 20 referrals
  { referrals: 30, bonus: 350 }, // Rs 350 for 30 referrals
  { referrals: 50, bonus: 500 }, // Rs 500 for 50 referrals
];

export const MINIMUM_RECHARGE_AMOUNT = 50; // Minimum Rs 50 for bonus eligibility
