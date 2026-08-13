import apiClient from './client';

export interface Quest {
  id: string;
  mission_id: string;
  title: string;
  description: string;
  order: number;
  xp_reward: number;
  currency_reward: number;
  is_completed: boolean;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export const questApi = {
  getQuest: async (id: string): Promise<Quest> => {
    const response = await apiClient.get(`/quests/${id}`);
    return response.data;
  },

  getQuestsByMission: async (missionId: string): Promise<Quest[]> => {
    const response = await apiClient.get(`/quests/mission/${missionId}`);
    return response.data;
  },

  createQuest: async (questData: Partial<Quest>): Promise<Quest> => {
    const response = await apiClient.post('/quests', questData);
    return response.data;
  }
};