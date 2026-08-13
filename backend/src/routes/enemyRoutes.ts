import { Router } from 'express';
import {
  getEnemiesByTask,
  getEnemy,
  createEnemy,
  updateEnemy,
  attackEnemies,
  getTaskWithEnemies,
  deleteEnemy,
  completeWave,
  getMissionStats
} from '../controllers/enemyController';

const router = Router();

// Get task with all enemies
router.get('/:taskId', getTaskWithEnemies);

// Get all enemies for a task
router.get('/:taskId/enemies', getEnemiesByTask);

// Create a new enemy for a task
router.post('/:taskId/enemies', createEnemy);

// Attack multiple enemies in one wave
router.post('/:taskId/attack', attackEnemies);

// Complete a wave with final result
router.post('/:taskId/complete', completeWave);

// Get mission stats
router.get('/mission/:missionId/stats', getMissionStats);

// Get single enemy
router.get('/enemies/:id', getEnemy);

// Update single enemy (attack)
router.put('/enemies/:id', updateEnemy);

// Delete enemy
router.delete('/enemies/:id', deleteEnemy);

export default router;