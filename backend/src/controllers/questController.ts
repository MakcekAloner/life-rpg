import { Request, Response } from 'express';
import pool from '../database/connection';

export const getQuest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM quests WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching quest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuestsByMission = async (req: Request, res: Response) => {
  try {
    const { mission_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM quests WHERE mission_id = $1 ORDER BY "order" ASC, created_at ASC',
      [mission_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quests by mission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createQuest = async (req: Request, res: Response) => {
  try {
    const {
      mission_id,
      title,
      description,
      order,
      xp_reward,
      currency_reward,
      deadline,
      dependencies
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO quests 
       (mission_id, title, description, "order", xp_reward, currency_reward, deadline, dependencies)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        mission_id,
        title,
        description,
        order || 1,
        xp_reward || 0,
        currency_reward || 0,
        deadline || null,
        dependencies || []
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating quest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
