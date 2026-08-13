import { Request, Response } from 'express';
import pool from '../database/connection';
import { recalculateMissionStats, recalculateCampaignProgress } from '../controllers/enemyController';

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
       ORDER BY t.created_at ASC`,
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
      
      if (allWavesDone) {
        await client.query(
          `UPDATE missions
           SET is_completed = true,
               completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id]
        );
        await recalculateCampaignProgress(client, mission.campaign_id);
      }
      
      await client.query('COMMIT');
      
      const wavesResult = await client.query(
        `SELECT t.* FROM tasks t
         JOIN quests q ON t.quest_id = q.id
         WHERE q.mission_id = $1 ORDER BY t.created_at`,
        [id]
      );
      
      res.json({
        mission: (await client.query('SELECT * FROM missions WHERE id = $1', [id])).rows[0],
        waves: wavesResult.rows
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
