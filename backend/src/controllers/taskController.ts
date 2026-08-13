import { Request, Response } from 'express';
import pool from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { character_id } = req.params;
    const result = await pool.query(
      `SELECT t.*, c.name as character_name 
       FROM tasks t 
       LEFT JOIN characters c ON t.character_id = c.id 
       WHERE t.character_id = $1 
       ORDER BY t.created_at DESC`,
      [character_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const { player_id } = req.params;
    const result = await pool.query(
      `SELECT t.*, c.name as character_name 
       FROM tasks t 
       LEFT JOIN characters c ON t.character_id = c.id 
       WHERE c.player_id = $1 
       ORDER BY t.created_at DESC`,
      [player_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, c.name as character_name 
       FROM tasks t 
       LEFT JOIN characters c ON t.character_id = c.id 
       WHERE t.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const {
      quest_id,
      character_id,
      title,
      description,
      difficulty,
      xp_reward,
      currency_reward,
      deadline,
      estimated_duration
    } = req.body;
    
    // Handle empty deadline as null
    const deadlineValue = deadline && deadline.trim() !== '' ? deadline : null;
    
    const result = await pool.query(
      `INSERT INTO tasks 
       (quest_id, character_id, title, description, difficulty, xp_reward, currency_reward, deadline, estimated_duration, is_completed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
       RETURNING *`,
      [quest_id, character_id, title, description, difficulty, xp_reward, currency_reward, deadlineValue, estimated_duration]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, difficulty, xp_reward, currency_reward, deadline, is_completed } = req.body;
    
    const completed_at = is_completed ? new Date() : null;
    const deadlineValue = deadline && deadline.trim() !== '' ? deadline : null;
    
    const result = await pool.query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           difficulty = COALESCE($3, difficulty),
           xp_reward = COALESCE($4, xp_reward),
           currency_reward = COALESCE($5, currency_reward),
           deadline = COALESCE($6, deadline),
           is_completed = COALESCE($7, is_completed),
           completed_at = COALESCE($8, completed_at)
       WHERE id = $9
       RETURNING *`,
      [title, description, difficulty, xp_reward, currency_reward, deadlineValue, is_completed, completed_at, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const completeTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get task data first
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = taskResult.rows[0];
    
    if (task.is_completed) {
      return res.status(400).json({ error: 'Task already completed' });
    }
    
    // Update task as completed
    const updateResult = await pool.query(
      `UPDATE tasks 
       SET is_completed = true, completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    // Get character data for player_id
    const characterResult = await pool.query(
      'SELECT * FROM characters WHERE id = $1',
      [task.character_id]
    );
    
    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    
    let leveledUp = false;
    
    // Add XP to character
    if (task.xp_reward > 0) {
      await pool.query(
        `UPDATE characters 
         SET current_xp = current_xp + $1
         WHERE id = $2`,
        [task.xp_reward, task.character_id]
      );
      
      // Check for level up with updated character data
      const updatedCharacterResult = await pool.query(
        'SELECT * FROM characters WHERE id = $1',
        [task.character_id]
      );
      
      const updatedCharacter = updatedCharacterResult.rows[0];
      let leveledUp = false;
      let newLevel = updatedCharacter.level;
      let newNextLevelXP = updatedCharacter.next_level_xp;
      
      if (updatedCharacter.current_xp >= updatedCharacter.next_level_xp) {
        newLevel = updatedCharacter.level + 1;
        newNextLevelXP = Math.floor(100 * Math.pow(1.5, newLevel - 1));
        leveledUp = true;
        
        await pool.query(
          `UPDATE characters 
           SET level = $1, next_level_xp = $2
           WHERE id = $3`,
          [newLevel, newNextLevelXP, task.character_id]
        );
      }
      
      // Create XP entry
      await pool.query(
        `INSERT INTO xp_entries (player_id, character_id, amount, source, description, date)
         VALUES ($1, $2, $3, 'task', $4, CURRENT_DATE)`,
        [character.player_id, task.character_id, task.xp_reward, task.title]
      );
    }
    
    // Add currency to player
    if (task.currency_reward > 0) {
      await pool.query(
        `UPDATE players 
         SET currency = currency + $1
         WHERE id = $2`,
        [task.currency_reward, character.player_id]
      );
      
      // Create currency entry
      await pool.query(
        `INSERT INTO currency_entries (player_id, amount, transaction_type, source, description, date)
         VALUES ($1, $2, 'earn', 'task', $3, CURRENT_DATE)`,
        [character.player_id, task.currency_reward, task.title]
      );
    }
    
    res.json({
      task: updateResult.rows[0],
      leveledUp,
      xpGained: task.xp_reward,
      currencyGained: task.currency_reward
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};