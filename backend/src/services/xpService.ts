import { XPEntry, XPSource } from '../types';

export class XPService {
  /**
   * Calculate XP required for next level
   * Uses exponential growth formula: base * (multiplier ^ (level - 1))
   */
  static calculateNextLevelXP(currentLevel: number, baseXP: number = 100, multiplier: number = 1.5): number {
    return Math.floor(baseXP * Math.pow(multiplier, currentLevel - 1));
  }

  /**
   * Calculate total XP required for a specific level
   */
  static calculateTotalXPForLevel(targetLevel: number, baseXP: number = 100, multiplier: number = 1.5): number {
    let totalXP = 0;
    for (let i = 1; i < targetLevel; i++) {
      totalXP += this.calculateNextLevelXP(i, baseXP, multiplier);
    }
    return totalXP;
  }

  /**
   * Check if player should level up
   */
  static shouldLevelUp(currentXP: number, nextLevelXP: number): boolean {
    return currentXP >= nextLevelXP;
  }

  /**
   * Calculate level down conditions
   * Significant degradation can cause level loss
   */
  static shouldLevelDown(currentXP: number, previousLevelXP: number): boolean {
    return currentXP < previousLevelXP * 0.5; // Lose level if XP drops below 50% of previous level requirement
  }

  /**
   * Calculate XP reward with streak bonus
   */
  static calculateXPWithStreakBonus(baseXP: number, streakCount: number): number {
    if (streakCount < 3) return baseXP;
    
    const bonusMultiplier = 1 + (Math.min(streakCount, 30) * 0.05); // Up to 2.5x bonus for 30+ streak
    return Math.floor(baseXP * bonusMultiplier);
  }

  /**
   * Calculate XP penalty for failures
   */
  static calculateXPPenalty(baseXP: number, failureSeverity: number): number {
    const penaltyMultiplier = 0.1 + (failureSeverity * 0.1); // 10% to 100% penalty based on severity
    return Math.floor(baseXP * penaltyMultiplier);
  }

  /**
   * Calculate milestone bonus
   */
  static calculateMilestoneBonus(baseXP: number, milestoneLevel: number): number {
    const bonusMultiplier = 1 + (milestoneLevel * 0.2); // 20% bonus per milestone level
    return Math.floor(baseXP * bonusMultiplier);
  }

  /**
   * Validate XP farming prevention
   * Prevents excessive grinding on easy tasks
   */
  static validateXPFarming(taskDifficulty: number, recentActions: number, timeWindow: number): boolean {
    // Prevent farming if too many easy actions in short time
    if (taskDifficulty < 3 && recentActions > 10 && timeWindow < 60) { // 10 easy actions in < 1 hour
      return false;
    }
    return true;
  }

  /**
   * Calculate survival mode XP multiplier
   */
  static calculateSurvivalXP(baseXP: number, survivalMultiplier: number): number {
    return Math.floor(baseXP * survivalMultiplier);
  }

  /**
   * Calculate redemption quest XP
   * Higher reward for difficult redemption
   */
  static calculateRedemptionXP(baseXP: number, failureSeverity: number): number {
    const redemptionMultiplier = 1.5 + (failureSeverity * 0.2); // 1.7x to 3.5x for severe failures
    return Math.floor(baseXP * redemptionMultiplier);
  }

  /**
   * Create XP entry record
   */
  static createXPEntry(
    playerId: string,
    amount: number,
    source: XPSource,
    description: string,
    characterId?: string,
    sourceId?: string
  ): Omit<XPEntry, 'id' | 'created_at' | 'updated_at'> {
    return {
      player_id: playerId,
      character_id: characterId,
      amount,
      source,
      source_id: sourceId,
      description,
      date: new Date(),
    };
  }

  /**
   * Calculate character progression contribution to meta-progression
   * Characters contribute to global "Ultimate Me" progression
   */
  static calculateMetaProgressionContribution(characterLevel: number, characterMaxLevel: number): number {
    return (characterLevel / characterMaxLevel) * 10; // Each character contributes up to 10% to meta progression
  }
}