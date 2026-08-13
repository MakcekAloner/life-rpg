import { Request, Response } from 'express';
import pool from '../database/connection';
import { recalculateMissionStats, recalculateCampaignProgress } from '../controllers/enemyController';
import { XPService } from '../services/xpService';

async function applyMissionRewards(client: any, missionId: string) {
  const missionResult = await client.query(
    `SELECT m.*, c.player_id
     FROM missions m
     JOIN campaigns c ON m.campaign_id = c.id
     WHERE m.id = $1`,
    [missionId]
  );
  
  const mission = missionResult.rows[0];
  if (!mission || mission.rewards_claimed || !mission.is_completed) {
    return { applied: false, leveledUp: false, player: null };
  }
  
  const playerId = mission.player_id;
  const playerResult = await client.query('SELECT * FROM players WHERE id = $1', [playerId]);
  if (playerResult.rows.length === 0) return { applied: false, leveledUp: false, player: null };
  
  const player = playerResult.rows[0];
  let xpGained = 0;
  let currencyGained = 0;
  let leveledUp = false;
  
  // XP reward
  if (mission.xp_reward > 0) {
    xpGained = mission.xp_reward;
    let total_xp = (player.total_xp || 0) + xpGained;
    let current_xp = (player.current_xp || 0) + xpGained;
    let level = player.level || 1;
    let next_level_xp = player.next_level_xp || 100;
    
    while (current_xp >= next_level_xp) {
      current_xp -= next_level_xp;
      level += 1;
      next_level_xp = XPService.calculateNextLevelXP(level);
      leveledUp = true;
    }
    
    await client.query(
      `UPDATE players SET total_xp = $1, current_xp = $2, level = $3, next_level_xp = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
      [total_xp, current_xp, level, next_level_xp, playerId]
    );
    
    await client.query(
      `INSERT INTO xp_entries (player_id, character_id, amount, source, source_id, description, date)
       VALUES ($1, $2, $3, 'mission', $4, $5, CURRENT_DATE)`,
      [playerId, mission.character_id, xpGained, missionId, `Mission completed: ${mission.title}`]
    );
  }
  
  // Currency reward
  if (mission.currency_reward > 0) {
    currencyGained = mission.currency_reward;
    await client.query(
      'UPDATE players SET currency = currency + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [currencyGained, playerId]
    );
    
    await client.query(
      `INSERT INTO currency_entries (player_id, amount, transaction_type, source, source_id, description, date)
       VALUES ($1, $2, 'earn', 'mission', $3, $4, CURRENT_DATE)`,
      [playerId, currencyGained, missionId, `Mission reward: ${mission.title}`]
    );
  }
  
  // Mark rewards as claimed
  await client.query(
    `UPDATE missions SET rewards_claimed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [missionId]
  );
  
  const updatedPlayer = await client.query('SELECT * FROM players WHERE id = $1', [playerId]);
  return { applied: true, leveledUp, player: updatedPlayer.rows[0], xpGained, currencyGained };
}

export const getMission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const missionResult = await pool.query(
      `SELECT m.*, c.name as campaign_name, c.player_id, ch.id as character_id, ch.name as character_name
       FROM missions m
       JOIN campaigns c ON m.campaign_id = c.id
       JOIN characters ch ON m.character_id = ch.id
       WHERE m.id = $1`,
      [id]
    );
    
    if (missionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mission not found' });
    }
    
    const mission = missionResult.rows[0];
    
    // Get waves (tasks) for this mission through quests
    const wavesResult = await pool.query(
      `SELECT t.*, q.mission_id
       FROM tasks t
       JOIN quests q ON t.quest_id = q.id
       WHERE q.mission_id = $1
       ORDER BY t.wave_order ASC, t.created_at ASC`,
      [id]
    );
    
    res.json({
      mission,
      waves: wavesResult.rows
    });
  } catch (error) {
    console.error('Error fetching mission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createMission = async (req: Request, res: Response) => {
  try {
    const {
      campaign_id,
      character_id,
      title,
      description,
      order,
      difficulty,
      xp_reward,
      currency_reward,
      success_criteria,
      failure_criteria,
      max_attempts
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO missions 
       (campaign_id, character_id, title, description, "order", difficulty, xp_reward, currency_reward, success_criteria, failure_criteria, max_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        campaign_id,
        character_id,
        title,
        description,
        order || 1,
        difficulty || 5,
        xp_reward || 0,
        currency_reward || 0,
        success_criteria || [],
        failure_criteria || [],
        max_attempts || 3
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating mission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const completeMission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await recalculateMissionStats(client, id);
      
      // Mark mission as completed if all waves are done
      const missionResult = await client.query('SELECT * FROM missions WHERE id = $1', [id]);
      const mission = missionResult.rows[0];
      const totalWaves = Number(mission.total_waves) || 0;
      const completedWaves = Number(mission.completed_waves) || 0;
      const allWavesDone = totalWaves > 0 && completedWaves === totalWaves;
      let rewardResult: any = { applied: false };
      
      if (allWavesDone) {
        await client.query(
          `UPDATE missions
           SET is_completed = true,
               completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id]
        );
        
        rewardResult = await applyMissionRewards(client, id);
        await recalculateCampaignProgress(client, mission.campaign_id);
      } else {
        await client.query(
          `UPDATE missions
           SET is_completed = false,
               completed_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id]
        );
      }
      
      await client.query('COMMIT');
      
      const wavesResult = await client.query(
        `SELECT t.* FROM tasks t
         JOIN quests q ON t.quest_id = q.id
         WHERE q.mission_id = $1 ORDER BY t.wave_order, t.created_at`,
        [id]
      );
      
      res.json({
        mission: (await client.query('SELECT * FROM missions WHERE id = $1', [id])).rows[0],
        waves: wavesResult.rows,
        rewards: rewardResult
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error completing mission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
