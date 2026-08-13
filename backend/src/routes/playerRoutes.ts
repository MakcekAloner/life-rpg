import { Router } from 'express';
import {
  getPlayer,
  createPlayer,
  updatePlayer,
  addXP,
  addCurrency,
  getPlayerStats
} from '../controllers/playerController';

const router = Router();

router.get('/:id', getPlayer);
router.post('/', createPlayer);
router.put('/:id', updatePlayer);
router.post('/:id/xp', addXP);
router.post('/:id/currency', addCurrency);
router.get('/:id/stats', getPlayerStats);

export default router;