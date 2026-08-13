// Core Entity Types
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// Player - Main player (real person)
export interface Player extends BaseEntity {
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  level: number;
  total_xp: number;
  current_xp: number;
  next_level_xp: number;
  currency: number;
  bio?: string;
  is_active: boolean;
}

// Character - Different personas for different campaigns
export interface Character extends BaseEntity {
  player_id: string;
  name: string;
  title: string;
  description: string;
  avatar_url?: string;
  starting_form: string;
  final_form: string;
  current_form: string;
  level: number;
  current_xp: number;
  next_level_xp: number;
  stats: CharacterStats;
  weaknesses: string[];
  abilities: string[];
  story_arc: string;
  is_active: boolean;
  campaign_id?: string;
}

export interface CharacterStats {
  strength: number;
  intelligence: number;
  endurance: number;
  charisma: number;
  discipline: number;
  creativity: number;
}

// Campaign - Major development areas
export interface Campaign extends BaseEntity {
  player_id: string;
  name: string;
  description: string;
  category: string; // e.g., "fitness", "career", "skills"
  starting_character_id: string;
  final_character_form: string;
  difficulty: number; // 1-10
  is_active: boolean;
  is_completed: boolean;
  started_at?: Date;
  completed_at?: Date;
  current_mission_order: number;
}

// Mission - Main stages within a campaign
export interface Mission extends BaseEntity {
  campaign_id: string;
  character_id: string;
  title: string;
  description: string;
  order: number;
  difficulty: number; // 1-10
  xp_reward: number;
  currency_reward: number;
  success_criteria: string[];
  failure_criteria?: string[];
  is_completed: boolean;
  is_failed: boolean;
  started_at?: Date;
  completed_at?: Date;
  failed_at?: Date;
  max_attempts?: number;
  current_attempts: number;
}

// Quest - Sub-tasks for missions
export interface Quest extends BaseEntity {
  mission_id: string;
  title: string;
  description: string;
  order: number;
  xp_reward: number;
  currency_reward: number;
  is_completed: boolean;
  started_at?: Date;
  completed_at?: Date;
  deadline?: Date;
  dependencies?: string[]; // IDs of quests that must be completed first
}

// Task - Specific actionable items
export interface Task extends BaseEntity {
  quest_id?: string;
  character_id: string;
  title: string;
  description: string;
  difficulty: number; // 1-5
  xp_reward: number;
  currency_reward: number;
  is_completed: boolean;
  completed_at?: Date;
  deadline?: Date;
  estimated_duration?: number; // in minutes
}

// Action - Basic units of activity
export interface Action extends BaseEntity {
  task_id?: string;
  character_id: string;
  title: string;
  description: string;
  xp_reward: number;
  currency_reward: number;
  is_completed: boolean;
  completed_at?: Date;
  date: Date;
  notes?: string;
}

// Skill - Skills and skill trees
export interface Skill extends BaseEntity {
  character_id: string;
  name: string;
  description: string;
  category: string;
  level: number;
  max_level: number;
  parent_skill_id?: string;
  prerequisites?: string[]; // IDs of skills required
  icon?: string;
  is_unlocked: boolean;
  xp_required: number;
  current_xp: number;
}

// XP System
export interface XPEntry extends BaseEntity {
  player_id: string;
  character_id?: string;
  amount: number;
  source: XPSource;
  source_id?: string; // ID of related entity (mission, quest, etc.)
  description: string;
  date: Date;
}

export type XPSource = 
  | 'action' 
  | 'task' 
  | 'quest' 
  | 'mission' 
  | 'achievement' 
  | 'streak_bonus' 
  | 'milestone' 
  | 'penalty' 
  | 'redemption'
  | 'survival';

// Currency System
export interface CurrencyEntry extends BaseEntity {
  player_id: string;
  amount: number;
  transaction_type: 'earn' | 'spend' | 'penalty' | 'bonus';
  source: string;
  source_id?: string;
  description: string;
  date: Date;
}

// Reward Shop
export interface Reward extends BaseEntity {
  name: string;
  description: string;
  category: RewardCategory;
  cost: number;
  is_available: boolean;
  is_purchasable: boolean;
  icon?: string;
  max_purchases?: number;
  cooldown_days?: number;
}

export type RewardCategory = 
  | 'small' 
  | 'medium' 
  | 'large' 
  | 'rare' 
  | 'legendary';

export interface PlayerReward extends BaseEntity {
  player_id: string;
  reward_id: string;
  purchase_date: Date;
  is_used: boolean;
  used_at?: Date;
}

// Achievements
export interface Achievement extends BaseEntity {
  name: string;
  description: string;
  category: string;
  xp_reward: number;
  currency_reward: number;
  icon?: string;
  is_hidden: boolean;
  requirements: AchievementRequirement[];
}

export interface AchievementRequirement {
  type: string;
  value: number;
  description: string;
}

export interface PlayerAchievement extends BaseEntity {
  player_id: string;
  achievement_id: string;
  unlocked_at: Date;
  progress: number;
}

// Streaks
export interface Streak extends BaseEntity {
  player_id: string;
  character_id?: string;
  type: StreakType;
  current_count: number;
  best_count: number;
  start_date: Date;
  last_action_date: Date;
  is_active: boolean;
}

export type StreakType = 
  | 'daily_actions' 
  | 'daily_tasks' 
  | 'weekly_quests' 
  | 'campaign_progress'
  | 'custom';

// Debuffs
export interface Debuff extends BaseEntity {
  player_id: string;
  character_id?: string;
  name: string;
  description: string;
  severity: number; // 1-10
  effects: DebuffEffect[];
  applied_at: Date;
  expires_at?: Date;
  is_active: boolean;
  source: string;
  source_id?: string;
}

export interface DebuffEffect {
  type: 'xp_reduction' | 'currency_penalty' | 'restriction' | 'custom';
  value: number;
  description: string;
}

// Penalties and Failure System
export interface Penalty extends BaseEntity {
  player_id: string;
  character_id?: string;
  type: PenaltyType;
  severity: number; // 1-10
  xp_loss: number;
  currency_loss: number;
  description: string;
  reason: string;
  applied_at: Date;
  is_paid: boolean;
  paid_at?: Date;
}

export type PenaltyType = 
  | 'minor_failure' 
  | 'repeated_failure' 
  | 'major_failure' 
  | 'critical_failure'
  | 'campaign_failure';

// Redemption Quests
export interface RedemptionQuest extends BaseEntity {
  player_id: string;
  character_id?: string;
  title: string;
  description: string;
  requirements: string[];
  xp_reward: number;
  currency_reward: number;
  removes_debuffs: string[]; // Debuff IDs to remove
  restores_currency: number;
  is_completed: boolean;
  started_at?: Date;
  completed_at?: Date;
  expires_at?: Date;
  generated_from: string; // ID of the failure that generated this quest
}

// Survival Mode
export interface SurvivalEvent extends BaseEntity {
  player_id: string;
  name: string;
  description: string;
  start_date: Date;
  end_date: Date;
  duration_days: number;
  rules: string[];
  rewards: SurvivalReward;
  penalties: SurvivalPenalty;
  is_active: boolean;
  is_completed: boolean;
  is_failed: boolean;
}

export interface SurvivalReward {
  xp_bonus: number;
  currency_bonus: number;
  special_achievements: string[];
}

export interface SurvivalPenalty {
  xp_multiplier: number;
  currency_multiplier: number;
  special_debuffs: string[];
}

// Event Log - Audit trail for all changes
export interface EventLog extends BaseEntity {
  player_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, any>;
  reason?: string;
  timestamp: Date;
  ip_address?: string;
}

// Inventory
export interface InventoryItem extends BaseEntity {
  player_id: string;
  item_type: string;
  name: string;
  description: string;
  quantity: number;
  is_consumable: boolean;
  effects?: InventoryEffect[];
}

export interface InventoryEffect {
  type: string;
  value: number;
  description: string;
}

// Settings
export interface PlayerSettings extends BaseEntity {
  player_id: string;
  notification_preferences: NotificationPreferences;
  privacy_settings: PrivacySettings;
  game_preferences: GamePreferences;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  streak_reminders: boolean;
  deadline_reminders: boolean;
  achievement_alerts: boolean;
}

export interface PrivacySettings {
  profile_public: boolean;
  progress_public: boolean;
  achievements_public: boolean;
  show_real_name: boolean;
}

export interface GamePreferences {
  difficulty_preference: number; // 1-10
  failure_tolerance: number; // 1-10
  auto_currency_conversion: boolean;
  streak_freeze_enabled: boolean;
}
