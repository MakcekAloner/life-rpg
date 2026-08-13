import { Router } from 'express';
import { getQuest, getQuestsByMission, createQuest } from '../controllers/questController';

const router = Router();

router.get('/:id', getQuest);
router.get('/mission/:mission_id', getQuestsByMission);
router.post('/', createQuest);

export default router;