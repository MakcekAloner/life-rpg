import { Request, Response } from 'express';
import pool from '../database/connection';
import { XPService } from '../services/xpService';

export const getCharacters = async (req: Request, res: Response) => {
  try {
    const { player_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM characters WHERE player_id = $1 ORDER BY created_at DESC',
      [player_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCharacter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM characters WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCharacter = async (req: Request, res: Response) => {
  try {
    const {
      player_id,
      name,
      title,
      description,
      starting_form,
      final_form,
      current_form,
      story_arc,
      weaknesses,
      abilities
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO characters 
       (player_id, name, title, description, starting_form, final_form, current_form, 
        story_arc, weaknesses, abilities, level, current_xp, next_level_xp, 
        strength, intelligence, endurance, charisma, discipline, creativity, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 0, 100, 1, 1, 1, 1, 1, 1, true)
       RETURNING *`,
      [player_id, name, title, description, starting_form, final_form, current_form, 
       story_arc, weaknesses, abilities]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCharacter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { current_form, level, current_xp, story_arc, is_active } = req.body;
    
    // Calculate next level XP if level changed
    let next_level_xp;
    if (level) {
      next_level_xp = XPService.calculateNextLevelXP(level);
    }
    
    const result = await pool.query(
      `UPDATE characters 
       SET current_form = COALESCE($1, current_form),
           level = COALESCE($2, level),
           current_xp = COALESCE($3, current_xp),
           next_level_xp = COALESCE($4, next_level_xp),
           story_arc = COALESCE($5, story_arc),
           is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [current_form, level, current_xp, next_level_xp, story_arc, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addCharacterXP = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, source, description } = req.body;
    
    // Get current character data
    const characterResult = await pool.query(
      'SELECT * FROM characters WHERE id = $1',
      [id]
    );
    
    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    
    // Add XP
    const newCurrentXP = character.current_xp + amount;
    
    // Check for level up
    let leveledUp = false;
    let newLevel = character.level;
    let newNextLevelXP = character.next_level_xp;
    
    if (XPService.shouldLevelUp(newCurrentXP, character.next_level_xp)) {
      newLevel = character.level + 1;
      newNextLevelXP = XPService.calculateNextLevelXP(newLevel);
      leveledUp = true;
    }
    
    // Update character
    await pool.query(
      `UPDATE characters 
       SET current_xp = $1, level = $2, next_level_xp = $3
       WHERE id = $4`,
      [newCurrentXP, newLevel, newNextLevelXP, id]
    );
    
    // Also add to player total XP
    await pool.query(
      `UPDATE players 
       SET total_xp = total_xp + $1
       WHERE id = $2`,
      [amount, character.player_id]
    );
    
    // Create XP entry
    await pool.query(
      `INSERT INTO xp_entries (player_id, character_id, amount, source, description, date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
      [character.player_id, id, amount, source, description]
    );
    
    // Get updated character
    const updatedCharacter = await pool.query(
      'SELECT * FROM characters WHERE id = $1',
      [id]
    );
    
    res.json({
      character: updatedCharacter.rows[0],
      leveledUp,
      xpGained: amount
    });
  } catch (error) {
    console.error('Error adding character XP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCharacter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM characters WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};