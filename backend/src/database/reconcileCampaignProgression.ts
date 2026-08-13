import { Pool } from 'pg';
import dotenv from 'dotenv';
import { recalculateMissionStats, recalculateCampaignProgress } from '../controllers/enemyController';
import { applyMissionRewards } from '../controllers/missionController';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'life_rpg',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function reconcileCampaignProgression() {
  const client = await pool.connect();
  
  try {
    console.log('Starting campaign progression reconciliation...');
    await client.query('BEGIN');
    
    const missionsResult = await client.query('SELECT * FROM missions ORDER BY "order"');
    
    for (const mission of missionsResult.rows) {
      await recalculateMissionStats(client, mission.id);
      
      const updatedMission = (await client.query('SELECT * FROM missions WHERE id = $1', [mission.id])).rows[0];
      const totalWaves = Number(updatedMission.total_waves) || 0;
      const completedWaves = Number(updatedMission.completed_waves) || 0;
      const allWavesDone = totalWaves > 0 && completedWaves === totalWaves;
      
      if (allWavesDone) {
        await client.query(
          `UPDATE missions
           SET is_completed = true,
               completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [mission.id]
        );
        
        // Apply mission rewards if not already claimed
        await applyMissionRewards(client, mission.id);
        await recalculateCampaignProgress(client, mission.campaign_id);
      } else {
        await client.query(
          `UPDATE missions
           SET is_completed = false,
               completed_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [mission.id]
        );
      }
    }
    
    // Recalculate all campaigns in case missions were reconciled
    const campaignsResult = await client.query('SELECT id FROM campaigns');
    for (const campaign of campaignsResult.rows) {
      await recalculateCampaignProgress(client, campaign.id);
    }
    
    await client.query('COMMIT');
    console.log('Campaign progression reconciliation completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Campaign progression reconciliation failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  reconcileCampaignProgression()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { reconcileCampaignProgression };
