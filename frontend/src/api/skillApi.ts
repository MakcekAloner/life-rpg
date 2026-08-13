import apiClient from './client';

export interface SkillMilestone {
  id: string;
  skill_id: string;
  character_id: string;
  title: string;
  description?: string;
  order: number;
  is_achieved: boolean;
  achieved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  character_id: string;
  name: string;
  description?: string;
  category: string;
  level: number;
  max_level: number;
  parent_skill_id?: string;
  prerequisites?: string[];
  icon?: string;
  is_unlocked: boolean;
  xp_required: number;
  current_xp: number;
  milestones?: SkillMilestone[];
  created_at: string;
  updated_at: string;
}

export const skillApi = {
  getSkillsByCharacter: async (characterId: string): Promise<Skill[]> => {
    const response = await apiClient.get(`/skills/character/${characterId}`);
    return response.data;
  },

  createSkill: async (data: {
    character_id: string;
    name: string;
    description?: string;
    category?: string;
    max_level?: number;
    parent_skill_id?: string;
    icon?: string;
  }): Promise<Skill> => {
    const response = await apiClient.post('/skills', data);
    return response.data;
  },

  updateSkill: async (skillId: string, data: Partial<Skill>): Promise<Skill> => {
    const response = await apiClient.put(`/skills/${skillId}`, data);
    return response.data;
  },

  deleteSkill: async (skillId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/skills/${skillId}`);
    return response.data;
  },

  createMilestone: async (skillId: string, data: {
    character_id: string;
    title: string;
    description?: string;
    order?: number;
  }): Promise<SkillMilestone> => {
    const response = await apiClient.post(`/skills/${skillId}/milestones`, data);
    return response.data;
  },

  updateMilestone: async (milestoneId: string, data: Partial<SkillMilestone>): Promise<SkillMilestone> => {
    const response = await apiClient.put(`/skills/milestones/${milestoneId}`, data);
    return response.data;
  },

  deleteMilestone: async (milestoneId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/skills/milestones/${milestoneId}`);
    return response.data;
  },

  achieveMilestone: async (milestoneId: string, achieved = true): Promise<SkillMilestone> => {
    const response = await apiClient.post(`/skills/milestones/${milestoneId}/achieve`, { achieved });
    return response.data;
  }
};
