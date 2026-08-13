import { Router } from 'express';
import { getMission, createMission, completeMission } from '../controllers/missionController';

const router = Router();

router.get('/:id', getMission);
router.post('/:id/complete', completeMission);
router.post('/', createMission);

export default router;