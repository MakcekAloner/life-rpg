import { Router } from 'express';
import { getMission, createMission } from '../controllers/missionController';

const router = Router();

router.get('/:id', getMission);
router.post('/', createMission);

export default router;