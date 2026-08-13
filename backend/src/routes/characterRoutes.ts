import { Router } from 'express';
import {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  addCharacterXP,
  deleteCharacter
} from '../controllers/characterController';

const router = Router();

router.get('/player/:player_id', getCharacters);
router.get('/:id', getCharacter);
router.post('/', createCharacter);
router.put('/:id', updateCharacter);
router.post('/:id/xp', addCharacterXP);
router.delete('/:id', deleteCharacter);

export default router;