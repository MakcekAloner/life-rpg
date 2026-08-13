import { Router } from 'express';
import {
  getTasks,
  getAllTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask
} from '../controllers/taskController';

const router = Router();

router.get('/character/:character_id', getTasks);
router.get('/player/:player_id', getAllTasks);
router.get('/:id', getTask);
router.post('/', createTask);
router.put('/:id', updateTask);
router.post('/:id/complete', completeTask);
router.delete('/:id', deleteTask);

export default router;