import { Router } from 'express';
import {
  getSkillsByCharacter,
  createSkill,
  updateSkill,
  deleteSkill,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  achieveMilestone
} from '../controllers/skillController';

const router = Router();

router.get('/character/:character_id', getSkillsByCharacter);
router.post('/', createSkill);
router.put('/:id', updateSkill);
router.delete('/:id', deleteSkill);
router.post('/:skill_id/milestones', createMilestone);
router.put('/milestones/:id', updateMilestone);
router.delete('/milestones/:id', deleteMilestone);
router.post('/milestones/:id/achieve', achieveMilestone);

export default router;
