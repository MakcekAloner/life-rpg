import apiClient from './client';

export interface Enemy {
  id: string;
  task_id: string;
  name: string;
  description: string;
  enemy_order: number;
  max_hp: number;
  current_hp: number;
  damage_dealt: number;
  measurement_type: 'binary' | 'quantity' | 'duration' | 'percentage' | 'manual';
  target_value: number;
  actual_value: number;
  status: 'not_engaged' | 'damaged' | 'defeated';
  is_defeated: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Attack {
  enemy_id: string;
  actual_value: number;
  notes?: string;
}

export const enemyApi = {
  // Get task with all enemies
  getTaskWithEnemies: (taskId: string) => 
    apiClient.get(`/waves/${taskId}`),

  // Get all enemies for a task
  getEnemiesByTask: (taskId: string) =>
    apiClient.get(`/waves/${taskId}/enemies`),

  // Create a new enemy for a task
  createEnemy: (taskId: string, enemyData: Partial<Enemy>) =>
    apiClient.post(`/waves/${taskId}/enemies`, enemyData),

  // Update single enemy
  updateEnemy: (enemyId: string, data: { actual_value: number; notes?: string }) =>
    apiClient.put(`/waves/enemies/${enemyId}`, data),

  // Attack multiple enemies at once
  attackEnemies: (taskId: string, attacks: Attack[]) =>
    apiClient.post(`/waves/${taskId}/attack`, { attacks }),

  // Complete wave with final result
  completeWave: (taskId: string) =>
    apiClient.post(`/waves/${taskId}/complete`),

  // Get mission stats
  getMissionStats: (missionId: string) =>
    apiClient.get(`/waves/mission/${missionId}/stats`),

  // Delete enemy
  deleteEnemy: (enemyId: string) =>
    apiClient.delete(`/waves/enemies/${enemyId}`)
};
