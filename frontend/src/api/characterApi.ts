import apiClient from './client';

export interface Character {
  id: string;
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
  strength: number;
  intelligence: number;
  endurance: number;
  charisma: number;
  discipline: number;
  creativity: number;
  weaknesses: string[];
  abilities: string[];
  story_arc: string;
  is_active: boolean;
  campaign_id?: string;
  created_at: string;
  updated_at: string;
}

export const characterApi = {
  // Get all characters for a player
  getCharacters: async (playerId: string): Promise<Character[]> => {
    const response = await apiClient.get(`/characters/player/${playerId}`);
    return response.data;
  },

  // Get single character
  getCharacter: async (id: string): Promise<Character> => {
    const response = await apiClient.get(`/characters/${id}`);
    return response.data;
  },

  // Create new character
  createCharacter: async (characterData: {
    player_id: string;
    name: string;
    title: string;
    description: string;
    starting_form: string;
    final_form: string;
    current_form: string;
    story_arc: string;
    weaknesses: string[];
    abilities: string[];
  }): Promise<Character> => {
    const response = await apiClient.post('/characters', characterData);
    return response.data;
  },

  // Update character
  updateCharacter: async (
    id: string,
    characterData: {
      current_form?: string;
      level?: number;
      current_xp?: number;
      story_arc?: string;
      is_active?: boolean;
    }
  ): Promise<Character> => {
    const response = await apiClient.put(`/characters/${id}`, characterData);
    return response.data;
  },

  // Add XP to character
  addCharacterXP: async (
    id: string,
    xpData: {
      amount: number;
      source: string;
      description: string;
    }
  ): Promise<{ character: Character; leveledUp: boolean; xpGained: number }> => {
    const response = await apiClient.post(`/characters/${id}/xp`, xpData);
    return response.data;
  },

  // Delete character
  deleteCharacter: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/characters/${id}`);
    return response.data;
  },
};