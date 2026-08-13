import { Request, Response } from 'express';
import pool from '../database/connection';

export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const { player_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM campaigns WHERE player_id = $1 ORDER BY created_at DESC',
      [player_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const {
      player_id,
      name,
      description,
      category,
      starting_character_id,
      final_character_form,
      difficulty
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO campaigns 
       (player_id, name, description, category, starting_character_id, final_character_form, difficulty, is_active, is_completed, current_mission_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, false, 1)
       RETURNING *`,
      [player_id, name, description, category, starting_character_id, final_character_form, difficulty]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active, is_completed, current_mission_order, started_at, completed_at } = req.body;
    
    const result = await pool.query(
      `UPDATE campaigns 
       SET is_active = COALESCE($1, is_active),
           is_completed = COALESCE($2, is_completed),
           current_mission_order = COALESCE($3, current_mission_order),
           started_at = COALESCE($4, started_at),
           completed_at = COALESCE($5, completed_at)
       WHERE id = $6
       RETURNING *`,
      [is_active, is_completed, current_mission_order, started_at, completed_at, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM campaigns WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaignWithMissions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get campaign
    const campaignResult = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1',
      [id]
    );
    
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Get missions for this campaign
    const missionsResult = await pool.query(
      'SELECT * FROM missions WHERE campaign_id = $1 ORDER BY "order" ASC',
      [id]
    );
    
    res.json({
      campaign: campaignResult.rows[0],
      missions: missionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching campaign with missions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};