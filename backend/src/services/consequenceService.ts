import { Penalty, PenaltyType, Debuff, DebuffEffect } from '../types';

export class ConsequenceService {
  /**
   * Determine failure type based on severity and context
   */
  static determineFailureType(
    failureCount: number,
    severity: number,
    isCampaignCritical: boolean
  ): PenaltyType {
    if (isCampaignCritical) {
      return 'campaign_failure';
    }
    
    if (severity >= 8) {
      return 'critical_failure';
    } else if (severity >= 5) {
      return 'major_failure';
    } else if (failureCount > 2) {
      return 'repeated_failure';
    } else {
      return 'minor_failure';
    }
  }

  /**
   * Calculate penalty based on failure type and user's tolerance settings
   */
  static calculatePenalty(
    failureType: PenaltyType,
    baseXP: number,
    baseCurrency: number,
    userTolerance: number // 1-10, higher = more tolerant
  ): { xpLoss: number; currencyLoss: number; description: string } {
    const toleranceMultiplier = 1 - ((userTolerance - 1) * 0.1); // Higher tolerance = lower penalties
    
    const penalties = {
      minor_failure: {
        xpMultiplier: 0.1,
        currencyMultiplier: 0.05,
        description: 'Небольшой провал. -10% XP, -5% валюты'
      },
      repeated_failure: {
        xpMultiplier: 0.2,
        currencyMultiplier: 0.1,
        description: 'Повторный провал. -20% XP, -10% валюты, потеря streak'
      },
      major_failure: {
        xpMultiplier: 0.4,
        currencyMultiplier: 0.3,
        description: 'Серьезный провал. -40% XP, -30% валюты, debuff'
      },
      critical_failure: {
        xpMultiplier: 0.8,
        currencyMultiplier: 0.6,
        description: 'Критический провал. -80% XP, -60% валюты, тяжелый debuff, возможный level-down'
      },
      campaign_failure: {
        xpMultiplier: 1.0,
        currencyMultiplier: 0.8,
        description: 'Провал кампании. -100% XP, -80% валюты, все debuffs, обязательный разбор'
      }
    };

    const penalty = penalties[failureType];
    const xpLoss = Math.floor(baseXP * penalty.xpMultiplier * toleranceMultiplier);
    const currencyLoss = Math.floor(baseCurrency * penalty.currencyMultiplier * toleranceMultiplier);

    return {
      xpLoss,
      currencyLoss,
      description: penalty.description
    };
  }

  /**
   * Generate appropriate debuff based on failure type
   */
  static generateDebuff(
    failureType: PenaltyType,
    severity: number,
    playerSettings: any
  ): Omit<Debuff, 'id' | 'created_at' | 'updated_at'> {
    const debuffs = {
      minor_failure: {
        name: 'Легкая усталость',
        description: 'Небольшое снижение мотивации',
        severity: 2,
        effects: [
          { type: 'xp_reduction', value: 10, description: '-10% XP на 1 день' }
        ],
        durationDays: 1
      },
      repeated_failure: {
        name: 'Нарушенная серия',
        description: 'Потеря концентрации после нескольких провалов',
        severity: 4,
        effects: [
          { type: 'xp_reduction', value: 20, description: '-20% XP на 3 дня' },
          { type: 'currency_penalty', value: 15, description: '-15% валюты на 3 дня' }
        ],
        durationDays: 3
      },
      major_failure: {
        name: 'Тяжелое разочарование',
        description: 'Серьезный удар по мотивации',
        severity: 6,
        effects: [
          { type: 'xp_reduction', value: 30, description: '-30% XP на 7 дней' },
          { type: 'currency_penalty', value: 25, description: '-25% валюты на 7 дней' },
          { type: 'restriction', value: 1, description: 'Невозможность начать новые квесты на 3 дня' }
        ],
        durationDays: 7
      },
      critical_failure: {
        name: 'Кризис мотивации',
        description: 'Критический удар по моральному состоянию',
        severity: 8,
        effects: [
          { type: 'xp_reduction', value: 50, description: '-50% XP на 14 дней' },
          { type: 'currency_penalty', value: 40, description: '-40% валюты на 14 дней' },
          { type: 'restriction', value: 1, description: 'Только базовые действия на 7 дней' }
        ],
        durationDays: 14
      },
      campaign_failure: {
        name: 'Полный крах',
        description: 'Кампания провалена, требуется полное восстановление',
        severity: 10,
        effects: [
          { type: 'xp_reduction', value: 75, description: '-75% XP на 30 дней' },
          { type: 'currency_penalty', value: 60, description: '-60% валюты на 30 дней' },
          { type: 'restriction', value: 1, description: 'Все кампании приостановлены на 14 дней' }
        ],
        durationDays: 30
      }
    };

    const debuff = debuffs[failureType];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + debuff.durationDays);

    return {
      player_id: playerSettings.player_id,
      character_id: playerSettings.character_id,
      name: debuff.name,
      description: debuff.description,
      severity: debuff.severity,
      effects: debuff.effects as DebuffEffect[],
      applied_at: new Date(),
      expires_at: expiresAt,
      is_active: true,
      source: failureType,
      source_id: playerSettings.source_id
    };
  }

  /**
   * Check if level down is appropriate
   */
  static shouldLevelDown(
    currentXP: number,
    currentLevel: number,
    previousLevelXP: number,
    failureType: PenaltyType
  ): boolean {
    if (failureType !== 'critical_failure' && failureType !== 'campaign_failure') {
      return false;
    }
    
    return currentXP < previousLevelXP * 0.5;
  }

  /**
   * Calculate financial penalty (if user has high financial tolerance)
   */
  static calculateFinancialPenalty(
    failureType: PenaltyType,
    baseAmount: number,
    financialTolerance: number // 1-10
  ): number {
    if (financialTolerance < 7) return 0; // No financial penalty if tolerance is low
    
    const toleranceMultiplier = (financialTolerance - 6) * 0.2; // 0.2x to 0.8x based on tolerance
    const severityMultipliers = {
      minor_failure: 0,
      repeated_failure: 0.1,
      major_failure: 0.3,
      critical_failure: 0.6,
      campaign_failure: 1.0
    };
    
    const severityMultiplier = severityMultipliers[failureType] || 0;
    return Math.floor(baseAmount * severityMultiplier * toleranceMultiplier);
  }

  /**
   * Generate redemption quest after appropriate failure
   */
  static shouldGenerateRedemptionQuest(failureType: PenaltyType): boolean {
    return ['major_failure', 'critical_failure', 'campaign_failure'].includes(failureType);
  }

  /**
   * Calculate redemption quest requirements
   */
  static calculateRedemptionRequirements(
    failureType: PenaltyType,
    originalTaskDifficulty: number
  ): {
    requirements: string[];
    xpReward: number;
    currencyReward: number;
    restoresCurrency: number;
  } {
    const difficultyMultiplier = 1 + (originalTaskDifficulty * 0.2);
    
    const redemptionData: Record<PenaltyType, any> = {
      minor_failure: {
        requirements: [
          'Выполнить 1 день без провалов',
          'Повторить базовое действие'
        ],
        xpMultiplier: 1.0,
        currencyMultiplier: 1.0,
        restoresCurrencyPercent: 0.1
      },
      repeated_failure: {
        requirements: [
          'Выполнить 2 последовательных дня без провалов',
          'Завершить 1 дополнительный простой квест'
        ],
        xpMultiplier: 1.2,
        currencyMultiplier: 1.1,
        restoresCurrencyPercent: 0.2
      },
      major_failure: {
        requirements: [
          'Выполнить 3 последовательных дня без провалов',
          'Завершить 1 дополнительный квест среднего уровня',
          'Медитировать или размышлять о причинах провала (15 мин)'
        ],
        xpMultiplier: 1.5,
        currencyMultiplier: 1.2,
        restoresCurrencyPercent: 0.3
      },
      critical_failure: {
        requirements: [
          'Выполнить 7 последовательных дней без провалов',
          'Завершить 2 дополнительных квеста среднего уровня',
          'Написать подробный разбор провала (300+ слов)',
          'Создать план предотвращения подобных ситуаций'
        ],
        xpMultiplier: 2.0,
        currencyMultiplier: 1.5,
        restoresCurrencyPercent: 0.5
      },
      campaign_failure: {
        requirements: [
          'Выполнить 14 последовательных дней без провалов',
          'Завершить 3 дополнительных квеста высокого уровня',
          'Написать полный разбор кампании (500+ слов)',
          'Получить одобрение Game Master на повторную попытку',
          'Выполнить специальный тренировочный квест'
        ],
        xpMultiplier: 3.0,
        currencyMultiplier: 2.0,
        restoresCurrencyPercent: 0.7
      }
    };

    const data = redemptionData[failureType] || redemptionData.major_failure;
    
    return {
      requirements: data.requirements,
      xpReward: Math.floor(100 * difficultyMultiplier * data.xpMultiplier),
      currencyReward: Math.floor(50 * difficultyMultiplier * data.currencyMultiplier),
      restoresCurrency: Math.floor(100 * data.restoresCurrencyPercent)
    };
  }

  /**
   * Create penalty record
   */
  static createPenalty(
    playerId: string,
    failureType: PenaltyType,
    xpLoss: number,
    currencyLoss: number,
    reason: string,
    characterId?: string
  ): Omit<Penalty, 'id' | 'created_at' | 'updated_at'> {
    return {
      player_id: playerId,
      character_id: characterId,
      type: failureType,
      severity: this.getSeverityFromType(failureType),
      xp_loss: xpLoss,
      currency_loss: currencyLoss,
      description: this.getPenaltyDescription(failureType),
      reason,
      applied_at: new Date(),
      is_paid: false
    };
  }

  private static getSeverityFromType(failureType: PenaltyType): number {
    const severities: Record<PenaltyType, number> = {
      minor_failure: 2,
      repeated_failure: 4,
      major_failure: 6,
      critical_failure: 8,
      campaign_failure: 10
    };
    return severities[failureType];
  }

  private static getPenaltyDescription(failureType: PenaltyType): string {
    const descriptions: Record<PenaltyType, string> = {
      minor_failure: 'Небольшой штраф за ошибку',
      repeated_failure: 'Штраф за повторяющиеся ошибки',
      major_failure: 'Серьезный штраф за значительный провал',
      critical_failure: 'Максимальный штраф за критический провал',
      campaign_failure: 'Катастрофический штраф за провал кампании'
    };
    return descriptions[failureType];
  }
}