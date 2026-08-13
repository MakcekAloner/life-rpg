import { Router } from 'express';
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignWithMissions
} from '../controllers/campaignController';

const router = Router();

router.get('/player/:player_id', getCampaigns);
router.get('/:id', getCampaign);
router.get('/:id/with-missions', getCampaignWithMissions);
router.post('/', createCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

export default router;