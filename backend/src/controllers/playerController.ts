import { Request, Response } from 'express';
import pool from '../database/connection';
import { XPService } from '../services/xpService';
import { CurrencyService } from '../services/currencyService';

export const getPlayer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM players WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPlayer = async (req: Request, res: Response) => {
  try {
    const { username, email, display_name, bio } = req.body;
    
    const result = await pool.query(
      `INSERT INTO players (username, email, display_name, bio, level, total_xp, current_xp, next_level_xp, currency, is_active)
       VALUES ($1, $2, $3, $4, 1, 0, 0, 100, 0, true)
       RETURNING *`,
      [username, email, display_name, bio]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePlayer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { display_name, bio, avatar_url } = req.body;
    
    const result = await pool.query(
      `UPDATE players 
       SET display_name = COALESCE($1, display_name),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING *`,
      [display_name, bio, avatar_url, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addXP = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, source, description, character_id } = req.body;
    
    // Get current player data
    const playerResult = await pool.query(
      'SELECT * FROM players WHERE id = $1',
      [id]
    );
    
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const player = playerResult.rows[0];
    
    // Add XP
    const newTotalXP = player.total_xp + amount;
    const newCurrentXP = player.current_xp + amount;
    
    // Check for level up
    let leveledUp = false;
    let newLevel = player.level;
    let newNextLevelXP = player.next_level_xp;
    
    if (XPService.shouldLevelUp(newCurrentXP, player.next_level_xp)) {
      newLevel = player.level + 1;
      newNextLevelXP = XPService.calculateNextLevelXP(newLevel);
      leveledUp = true;
    }
    
    // Update player
    await pool.query(
      `UPDATE players 
       SET total_xp = $1, current_xp = $2, level = $3, next_level_xp = $4
       WHERE id = $5`,
      [newTotalXP, newCurrentXP, newLevel, newNextLevelXP, id]
    );
    
    // Create XP entry
    await pool.query(
      `INSERT INTO xp_entries (player_id, character_id, amount, source, description, date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
      [id, character_id, amount, source, description]
    );
    
    // Get updated player
    const updatedPlayer = await pool.query(
      'SELECT * FROM players WHERE id = $1',
      [id]
    );
    
    res.json({
      player: updatedPlayer.rows[0],
      leveledUp,
      xpGained: amount
    });
  } catch (error) {
    console.error('Error adding XP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addCurrency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, transaction_type, source, description } = req.body;
    
    // Get current player data
    const playerResult = await pool.query(
      'SELECT * FROM players WHERE id = $1',
      [id]
    );
    
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const player = playerResult.rows[0];
    
    // Calculate new currency amount
    let newCurrency;
    if (transaction_type === 'spend' || transaction_type === 'penalty') {
      newCurrency = player.currency - amount;
      if (newCurrency < 0) {
        return res.status(400).json({ error: 'Insufficient currency' });
      }
    } else {
      newCurrency = player.currency + amount;
    }
    
    // Update player
    await pool.query(
      'UPDATE players SET currency = $1 WHERE id = $2',
      [newCurrency, id]
    );
    
    // Create currency entry
    await pool.query(
      `INSERT INTO currency_entries (player_id, amount, transaction_type, source, description, date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
      [id, amount, transaction_type, source, description]
    );
    
    // Get updated player
    const updatedPlayer = await pool.query(
      'SELECT * FROM players WHERE id = $1',
      [id]
    );
    
    res.json({
      player: updatedPlayer.rows[0],
      currencyChange: amount
    });
  } catch (error) {
    console.error('Error adding currency:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPlayerStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get basic player info
    const playerResult = await pool.query(
      'SELECT * FROM players WHERE id = $1',
      [id]
    );
    
    if (playerResult.rows[0].length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const player = playerResult.rows[0];
    
    // Get active characters count
    const charactersResult = await pool.query(
      'SELECT COUNT(*) as count FROM characters WHERE player_id = $1 AND is_active = true',
      [id]
    );
    
    // Get active campaigns count
    const campaignsResult = await pool.query(
      'SELECT COUNT(*) as count FROM campaigns WHERE player_id = $1 AND is_active = true',
      [id]
    );
    
    // Get completed missions count
    const missionsResult = await pool.query(
      'SELECT COUNT(*) as count FROM missions m JOIN campaigns c ON m.campaign_id = c.id WHERE c.player_id = $1 AND m.is_completed = true',
      [id]
    );
    
    // Get total achievements
    const achievementsResult = await pool.query(
      'SELECT COUNT(*) as count FROM player_achievements WHERE player_id = $1',
      [id]
    );
    
    // Get current streaks
    const streaksResult = await pool.query(
      'SELECT * FROM streaks WHERE player_id = $1 AND is_active = true',
      [id]
    );
    
    // Get active debuffs
    const debuffsResult = await pool.query(
      'SELECT * FROM debuffs WHERE player_id = $1 AND is_active = true',
      [id]
    );
    
    res.json({
      player,
      stats: {
        active_characters: parseInt(charactersResult.rows[0].count),
        active_campaigns: parseInt(campaignsResult.rows[0].count),
        completed_missions: parseInt(missionsResult.rows[0].count),
        total_achievements: parseInt(achievementsResult.rows[0].count),
        active_streaks: streaksResult.rows,
        active_debuffs: debuffsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};