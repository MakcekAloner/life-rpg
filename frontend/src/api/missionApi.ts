import apiClient from './client';

export interface Mission {
  id: string;
  campaign_id: string;
  character_id: string;
  title: string;
  description: string;
  order: number;
  difficulty: number;
  xp_reward: number;
  currency_reward: number;
  is_completed: boolean;
  is_failed: boolean;
  created_at: string;
  updated_at: string;
}

export const missionApi = {
  getMission: async (id: string): Promise<{ mission: Mission; waves: any[] }> => {
    const response = await apiClient.get(`/missions/${id}`);
    return response.data;
  },

  createMission: async (data: any): Promise<Mission> => {
    const response = await apiClient.post('/missions', data);
    return response.data;
  },

  completeMission: async (id: string): Promise<{ mission: Mission; waves: any[]; rewards: any }> => {
    const response = await apiClient.post(`/missions/${id}/complete`);
    return response.data;
  }
};
