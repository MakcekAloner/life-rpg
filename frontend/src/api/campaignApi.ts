import apiClient from './client';

export interface Campaign {
  id: string;
  player_id: string;
  name: string;
  description: string;
  category: string;
  starting_character_id: string;
  final_character_form: string;
  difficulty: number;
  is_active: boolean;
  is_completed: boolean;
  started_at?: string;
  completed_at?: string;
  current_mission_order: number;
  created_at: string;
  updated_at: string;
}

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
  success_criteria: string[];
  failure_criteria?: string[];
  is_completed: boolean;
  is_failed: boolean;
  is_required: boolean;
  is_boss: boolean;
  prerequisite_mission_ids: string[];
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  max_attempts?: number;
  current_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignWithMissions {
  campaign: Campaign;
  missions: Mission[];
}

export const campaignApi = {
  // Get all campaigns for a player
  getCampaigns: async (playerId: string): Promise<Campaign[]> => {
    const response = await apiClient.get(`/campaigns/player/${playerId}`);
    return response.data;
  },

  // Get single campaign
  getCampaign: async (id: string): Promise<Campaign> => {
    const response = await apiClient.get(`/campaigns/${id}`);
    return response.data;
  },

  // Get campaign with missions
  getCampaignWithMissions: async (id: string): Promise<CampaignWithMissions> => {
    const response = await apiClient.get(`/campaigns/${id}/with-missions`);
    return response.data;
  },

  // Create new campaign
  createCampaign: async (campaignData: {
    player_id: string;
    name: string;
    description: string;
    category: string;
    starting_character_id: string;
    final_character_form: string;
    difficulty: number;
  }): Promise<Campaign> => {
    const response = await apiClient.post('/campaigns', campaignData);
    return response.data;
  },

  // Update campaign
  updateCampaign: async (
    id: string,
    campaignData: {
      is_active?: boolean;
      is_completed?: boolean;
      current_mission_order?: number;
      started_at?: string;
      completed_at?: string;
    }
  ): Promise<Campaign> => {
    const response = await apiClient.put(`/campaigns/${id}`, campaignData);
    return response.data;
  },

  // Delete campaign
  deleteCampaign: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/campaigns/${id}`);
    return response.data;
  },
};