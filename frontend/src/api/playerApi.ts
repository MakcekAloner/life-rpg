import apiClient from './client';

export interface Player {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export interface PlayerStats {
  player: Player;
  stats: {
    active_characters: number;
    active_campaigns: number;
    completed_missions: number;
    total_achievements: number;
    active_streaks: any[];
    active_debuffs: any[];
  };
}

export const playerApi = {
  // Get player by ID
  getPlayer: async (id: string): Promise<Player> => {
    const response = await apiClient.get(`/players/${id}`);
    return response.data;
  },

  // Create new player
  createPlayer: async (playerData: {
    username: string;
    email: string;
    display_name: string;
    bio?: string;
  }): Promise<Player> => {
    const response = await apiClient.post('/players', playerData);
    return response.data;
  },

  // Update player
  updatePlayer: async (
    id: string,
    playerData: {
      display_name?: string;
      bio?: string;
      avatar_url?: string;
    }
  ): Promise<Player> => {
    const response = await apiClient.put(`/players/${id}`, playerData);
    return response.data;
  },

  // Add XP to player
  addXP: async (
    id: string,
    xpData: {
      amount: number;
      source: string;
      description: string;
      character_id?: string;
    }
  ): Promise<{ player: Player; leveledUp: boolean; xpGained: number }> => {
    const response = await apiClient.post(`/players/${id}/xp`, xpData);
    return response.data;
  },

  // Add currency to player
  addCurrency: async (
    id: string,
    currencyData: {
      amount: number;
      transaction_type: 'earn' | 'spend' | 'penalty' | 'bonus';
      source: string;
      description: string;
    }
  ): Promise<{ player: Player; currencyChange: number }> => {
    const response = await apiClient.post(`/players/${id}/currency`, currencyData);
    return response.data;
  },

  // Get player stats
  getPlayerStats: async (id: string): Promise<PlayerStats> => {
    const response = await apiClient.get(`/players/${id}/stats`);
    return response.data;
  },
};