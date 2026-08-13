import apiClient from './client';

export interface Task {
  id: string;
  quest_id?: string;
  character_id: string;
  character_name?: string;
  title: string;
  description?: string;
  difficulty: number;
  xp_reward: number;
  currency_reward: number;
  is_completed: boolean;
  completed_at?: string;
  deadline?: string;
  estimated_duration?: number;
  created_at: string;
  updated_at: string;
}

export const taskApi = {
  // Get all tasks for a player
  getAllTasks: async (playerId: string): Promise<Task[]> => {
    const response = await apiClient.get(`/tasks/player/${playerId}`);
    return response.data;
  },

  // Get tasks for a specific character
  getCharacterTasks: async (characterId: string): Promise<Task[]> => {
    const response = await apiClient.get(`/tasks/character/${characterId}`);
    return response.data;
  },

  // Get single task
  getTask: async (taskId: string): Promise<Task> => {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data;
  },

  // Create new task
  createTask: async (taskData: {
    quest_id?: string;
    character_id: string;
    title: string;
    description?: string;
    difficulty: number;
    xp_reward: number;
    currency_reward: number;
    deadline?: string;
    estimated_duration?: number;
  }): Promise<Task> => {
    const response = await apiClient.post('/tasks', taskData);
    return response.data;
  },

  // Update task
  updateTask: async (
    taskId: string,
    taskData: {
      title?: string;
      description?: string;
      difficulty?: number;
      xp_reward?: number;
      currency_reward?: number;
      deadline?: string;
      is_completed?: boolean;
    }
  ): Promise<Task> => {
    const response = await apiClient.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },

  // Complete task (with rewards)
  completeTask: async (taskId: string): Promise<{
    task: Task;
    leveledUp: boolean;
    xpGained: number;
    currencyGained: number;
  }> => {
    const response = await apiClient.post(`/tasks/${taskId}/complete`);
    return response.data;
  },

  // Delete task
  deleteTask: async (taskId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/tasks/${taskId}`);
    return response.data;
  },
};