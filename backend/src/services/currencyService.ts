import { CurrencyEntry } from '../types';

export class CurrencyService {
  /**
   * Calculate currency reward based on difficulty and effort
   */
  static calculateCurrencyReward(difficulty: number, baseReward: number = 10): number {
    const difficultyMultiplier = 1 + (difficulty * 0.2); // 1.2x to 3x based on difficulty
    return Math.floor(baseReward * difficultyMultiplier);
  }

  /**
   * Calculate currency penalty for failures
   */
  static calculateCurrencyPenalty(basePenalty: number, failureSeverity: number): number {
    const severityMultiplier = 0.5 + (failureSeverity * 0.15); // 0.65x to 2x based on severity
    return Math.floor(basePenalty * severityMultiplier);
  }

  /**
   * Calculate streak bonus currency
   */
  static calculateStreakBonus(baseReward: number, streakCount: number): number {
    if (streakCount < 7) return 0; // No bonus until 7 day streak
    
    const weeklyMultiplier = Math.floor(streakCount / 7);
    const bonusMultiplier = 0.5 * weeklyMultiplier; // 50% bonus per week
    return Math.floor(baseReward * bonusMultiplier);
  }

  /**
   * Calculate survival mode currency multiplier
   */
  static calculateSurvivalCurrency(baseCurrency: number, survivalMultiplier: number): number {
    return Math.floor(baseCurrency * survivalMultiplier);
  }

  /**
   * Validate reward purchase affordability
   */
  static canAffordReward(playerCurrency: number, rewardCost: number): boolean {
    return playerCurrency >= rewardCost;
  }

  /**
   * Calculate reward cost based on category
   */
  static calculateRewardCost(category: string, baseCost: number = 100): number {
    const categoryMultipliers: Record<string, number> = {
      small: 1,
      medium: 3,
      large: 10,
      rare: 25,
      legendary: 100,
    };
    
    const multiplier = categoryMultipliers[category] || 1;
    return baseCost * multiplier;
  }

  /**
   * Calculate cooldown period for reward purchases
   */
  static calculateCooldownRemaining(lastPurchaseDate: Date, cooldownDays: number): number {
    const cooldownEnd = new Date(lastPurchaseDate);
    cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays);
    const now = new Date();
    const diffTime = cooldownEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); // Days remaining
  }

  /**
   * Check if reward is on cooldown
   */
  static isOnCooldown(lastPurchaseDate: Date, cooldownDays: number): boolean {
    return this.calculateCooldownRemaining(lastPurchaseDate, cooldownDays) > 0;
  }

  /**
   * Calculate daily passive income (if enabled)
   * Small amount for maintaining basic activities
   */
  static calculateDailyPassiveIncome(baseAmount: number, playerLevel: number): number {
    const levelBonus = 1 + (playerLevel * 0.1); // 10% bonus per level
    return Math.floor(baseAmount * levelBonus);
  }

  /**
   * Calculate achievement currency bonus
   */
  static calculateAchievementBonus(baseReward: number, achievementRarity: string): number {
    const rarityMultipliers: Record<string, number> = {
      common: 1,
      uncommon: 2,
      rare: 5,
      epic: 10,
      legendary: 25,
    };
    
    const multiplier = rarityMultipliers[achievementRarity] || 1;
    return Math.floor(baseReward * multiplier);
  }

  /**
   * Create currency entry record
   */
  static createCurrencyEntry(
    playerId: string,
    amount: number,
    transactionType: 'earn' | 'spend' | 'penalty' | 'bonus',
    source: string,
    description: string,
    sourceId?: string
  ): Omit<CurrencyEntry, 'id' | 'created_at' | 'updated_at'> {
    return {
      player_id: playerId,
      amount,
      transaction_type: transactionType,
      source,
      source_id: sourceId,
      description,
      date: new Date(),
    };
  }

  /**
   * Calculate economic balance
   * Helps ensure currency isn't too easy or too hard to earn
   */
  static calculateEconomicBalance(
    totalEarned: number,
    totalSpent: number,
    playerLevel: number
  ): { isBalanced: boolean; recommendation: string } {
    const balance = totalEarned - totalSpent;
    const expectedBalance = playerLevel * 500; // Expected balance per level
    
    if (balance > expectedBalance * 2) {
      return {
        isBalanced: false,
        recommendation: 'Currency accumulation too high. Consider increasing costs or reducing rewards.'
      };
    } else if (balance < expectedBalance * 0.5) {
      return {
        isBalanced: false,
        recommendation: 'Currency too low. Consider increasing rewards or reducing costs.'
      };
    }
    
    return {
      isBalanced: true,
      recommendation: 'Economy is well balanced.'
    };
  }

  /**
   * Calculate reward shop affordability ratio
   * What percentage of rewards can the player afford
   */
  static calculateAffordabilityRatio(playerCurrency: number, rewardCosts: number[]): number {
    const affordableCount = rewardCosts.filter(cost => playerCurrency >= cost).length;
    return (affordableCount / rewardCosts.length) * 100;
  }
}