import { Request, Response } from 'express';
import pool from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Calculate damage based on actual vs target and max_hp
function calculateDamage(
  actualValue: number,
  targetValue: number,
  maxHp: number,
  measurementType: string
): { damage: number; currentHp: number; isDefeated: boolean } {
  if (measurementType === 'binary') {
    const isDone = actualValue >= 1;
    const damage = isDone ? maxHp : 0;
    return {
      damage,
      currentHp: maxHp - damage,
      isDefeated: isDone
    };
  }
  
  if (measurementType === 'percentage' || measurementType === 'manual') {
    // For percentage and manual, the actual value is already a percentage or direct value
    const progress = Math.min(Math.max(actualValue, 0), targetValue);
    const ratio = targetValue > 0 ? progress / targetValue : 0;
    const damage = Math.round(ratio * maxHp);
    return {
      damage,
      currentHp: Math.max(0, maxHp - damage),
      isDefeated: damage >= maxHp
    };
  }
  
  // quantity and duration
  const progress = Math.min(Math.max(actualValue, 0), targetValue);
  const ratio = targetValue > 0 ? progress / targetValue : 0;
  const damage = Math.round(ratio * maxHp);
  
  return {
    damage,
    currentHp: Math.max(0, maxHp - damage),
    isDefeated: damage >= maxHp
  };
}

function getStatus(damage: number, maxHp: number, isDefeated: boolean): string {
  if (damage <= 0) return 'not_engaged';
  if (isDefeated || damage >= maxHp) return 'defeated';
  return 'damaged';
}

// Get all enemies for a task
export const getEnemiesByTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM enemies 
       WHERE task_id = $1 
       ORDER BY enemy_order, created_at`,
      [taskId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enemies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single enemy with logs
export const getEnemy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const enemyResult = await pool.query(
      'SELECT * FROM enemies WHERE id = $1',
      [id]
    );
    
    if (enemyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Enemy not found' });
    }
    
    const logsResult = await pool.query(
      'SELECT * FROM enemy_logs WHERE enemy_id = $1 ORDER BY created_at DESC',
      [id]
    );
    
    res.json({
      enemy: enemyResult.rows[0],
      logs: logsResult.rows
    });
  } catch (error) {
    console.error('Error fetching enemy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new enemy for a task
export const createEnemy = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const {
      name,
      description,
      enemy_order,
      max_hp,
      measurement_type,
      target_value,
      actual_value,
      notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO enemies 
       (task_id, name, description, enemy_order, max_hp, current_hp, measurement_type, target_value, actual_value, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        taskId,
        name,
        description,
        enemy_order || 0,
        max_hp || 10,
        max_hp || 10,
        measurement_type || 'binary',
        target_value || 1,
        actual_value || 0,
        notes
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating enemy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update enemy actual value and calculate damage
export const updateEnemy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actual_value, notes } = req.body;
    
    const enemyResult = await pool.query(
      'SELECT * FROM enemies WHERE id = $1',
      [id]
    );
    
    if (enemyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Enemy not found' });
    }
    
    const enemy = enemyResult.rows[0];
    const newActual = actual_value !== undefined ? Number(actual_value) : Number(enemy.actual_value);
    const previousActual = Number(enemy.actual_value);
    const maxHp = Number(enemy.max_hp);
    const currentHp = Number(enemy.current_hp);
    const targetValue = Number(enemy.target_value);
    const measurementType = enemy.measurement_type;
    
    // Calculate potential damage for this session (actual is per-session, resets each training session)
    const { damage: newPotentialDamage } = calculateDamage(newActual, targetValue, maxHp, measurementType);
    const { damage: oldPotentialDamage } = calculateDamage(previousActual, targetValue, maxHp, measurementType);
    let thisAttackDamage = Math.max(0, newPotentialDamage - oldPotentialDamage);
    
    // Overkill protection: damage cannot exceed current HP
    const effectiveDamage = Math.min(thisAttackDamage, currentHp);
    const newDamageDealt = Number(enemy.damage_dealt) + effectiveDamage;
    const newCurrentHp = Math.max(0, currentHp - effectiveDamage);
    const isDefeated = newCurrentHp <= 0;
    const status = getStatus(newDamageDealt, maxHp, isDefeated);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Ensure active session exists (per-session actuals)
      const session = await getOrCreateActiveSession(client, enemy.task_id);
      const actualResult = await client.query('SELECT actual_value FROM enemies WHERE id = $1', [id]);
      const previousActual = Number(actualResult.rows[0].actual_value);
      
      // Recalculate with the real previous actual after session reset
      const { damage: newPotentialDamage } = calculateDamage(newActual, targetValue, maxHp, measurementType);
      const { damage: oldPotentialDamage } = calculateDamage(previousActual, targetValue, maxHp, measurementType);
      let thisAttackDamage = Math.max(0, newPotentialDamage - oldPotentialDamage);
      const effectiveDamage = Math.min(thisAttackDamage, currentHp);
      const newDamageDealt = Number(enemy.damage_dealt) + effectiveDamage;
      const newCurrentHp = Math.max(0, currentHp - effectiveDamage);
      const isDefeated = newCurrentHp <= 0;
      const status = getStatus(newDamageDealt, maxHp, isDefeated);
      
      // Update enemy
      const updateResult = await client.query(
        `UPDATE enemies 
         SET actual_value = $1,
             current_hp = $2,
             damage_dealt = $3,
             status = $4,
             is_defeated = $5,
             notes = $6
         WHERE id = $7
         RETURNING *`,
        [newActual, newCurrentHp, newDamageDealt, status, isDefeated, notes || enemy.notes, id]
      );
      
      // Log the attack
      await client.query(
        `INSERT INTO enemy_logs 
         (enemy_id, task_id, previous_actual, new_actual, damage_dealt, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, enemy.task_id, previousActual, newActual, effectiveDamage, notes]
      );
      
      // Log this attack to the current training session
      await client.query(
        `INSERT INTO training_session_results (session_id, enemy_id, actual_value, damage_dealt)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, enemy_id) DO UPDATE
         SET actual_value = EXCLUDED.actual_value,
             damage_dealt = training_session_results.damage_dealt + EXCLUDED.damage_dealt`,
        [session.id, id, newActual, effectiveDamage]
      );
      
      // Recalculate task wave totals
      await recalculateTaskWaveTotals(client, enemy.task_id);
      
      await client.query('COMMIT');
      
      res.json({
        enemy: updateResult.rows[0],
        thisAttackDamage: effectiveDamage,
        isDefeated
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating enemy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk attack multiple enemies at once
export const attackEnemies = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { attacks } = req.body; // Array of { enemy_id, actual_value, notes }
    
    if (!Array.isArray(attacks) || attacks.length === 0) {
      return res.status(400).json({ error: 'No attacks provided' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const session = await getOrCreateActiveSession(client, taskId);
      const results: any[] = [];
      let totalWaveDamage = 0;
      
      for (const attack of attacks) {
        const enemyId = attack.enemy_id;
        const newActual = Number(attack.actual_value);
        const notes = attack.notes;
        
        const enemyResult = await client.query(
          'SELECT * FROM enemies WHERE id = $1 AND task_id = $2',
          [enemyId, taskId]
        );
        
        if (enemyResult.rows.length === 0) {
          continue;
        }
        
        const enemy = enemyResult.rows[0];
        
        // Get current actual value after session reset
        const actualResult = await client.query('SELECT actual_value FROM enemies WHERE id = $1', [enemyId]);
        const previousActual = Number(actualResult.rows[0].actual_value);
        const maxHp = Number(enemy.max_hp);
        const currentHp = Number(enemy.current_hp);
        const targetValue = Number(enemy.target_value);
        const measurementType = enemy.measurement_type;
        
        const { damage: newPotentialDamage } = calculateDamage(newActual, targetValue, maxHp, measurementType);
        const { damage: oldPotentialDamage } = calculateDamage(previousActual, targetValue, maxHp, measurementType);
        let thisAttackDamage = Math.max(0, newPotentialDamage - oldPotentialDamage);
        const effectiveDamage = Math.min(thisAttackDamage, currentHp);
        
        const newDamageDealt = Number(enemy.damage_dealt) + effectiveDamage;
        const newCurrentHp = Math.max(0, currentHp - effectiveDamage);
        const isDefeated = newCurrentHp <= 0;
        const status = getStatus(newDamageDealt, maxHp, isDefeated);
        
        // Update enemy
        const updateResult = await client.query(
          `UPDATE enemies 
           SET actual_value = $1,
               current_hp = $2,
               damage_dealt = $3,
               status = $4,
               is_defeated = $5,
               notes = $6
           WHERE id = $7
           RETURNING *`,
          [newActual, newCurrentHp, newDamageDealt, status, isDefeated, notes || enemy.notes, enemyId]
        );
        
        // Log
        await client.query(
          `INSERT INTO enemy_logs 
           (enemy_id, task_id, previous_actual, new_actual, damage_dealt, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [enemyId, taskId, previousActual, newActual, effectiveDamage, notes]
        );
        
        // Log to training session
        await client.query(
          `INSERT INTO training_session_results (session_id, enemy_id, actual_value, damage_dealt)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (session_id, enemy_id) DO UPDATE
           SET actual_value = EXCLUDED.actual_value,
               damage_dealt = training_session_results.damage_dealt + EXCLUDED.damage_dealt`,
          [session.id, enemyId, newActual, effectiveDamage]
        );
        
        results.push({
          enemy: updateResult.rows[0],
          thisAttackDamage: effectiveDamage,
          isDefeated
        });
        
        totalWaveDamage += effectiveDamage;
      }
      
      // Recalculate task wave totals
      const waveTotals = await recalculateTaskWaveTotals(client, taskId);
      
      await client.query('COMMIT');
      
      res.json({
        results,
        totalWaveDamage,
        waveTotals
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error attacking enemies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper to recalculate task wave totals
async function recalculateTaskWaveTotals(client: any, taskId: string) {
  const enemiesResult = await client.query(
    'SELECT max_hp, current_hp, damage_dealt, is_defeated FROM enemies WHERE task_id = $1',
    [taskId]
  );
  
  const totalHp = enemiesResult.rows.reduce((sum: number, e: any) => sum + Number(e.max_hp), 0);
  const damageDealt = enemiesResult.rows.reduce((sum: number, e: any) => sum + Number(e.damage_dealt), 0);
  const currentHp = enemiesResult.rows.reduce((sum: number, e: any) => sum + Number(e.current_hp), 0);
  const allDefeated = enemiesResult.rows.length > 0 && enemiesResult.rows.every((e: any) => e.is_defeated);
  const anyDamage = damageDealt > 0;
  
  const waveStatus = allDefeated ? 'perfect_clear' : (anyDamage ? 'active' : 'active');
  
  const taskResult = await client.query(
    `UPDATE tasks 
     SET wave_total_hp = $1,
         wave_current_hp = $2,
         wave_damage_dealt = $3,
         engagement_started = $4,
         all_enemies_defeated = $5,
         is_completed = $5,
         wave_status = CASE WHEN $5 THEN $6 ELSE COALESCE(wave_status, 'active') END,
         completed_at = CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE completed_at END
     WHERE id = $7
     RETURNING *`,
    [totalHp, currentHp, damageDealt, anyDamage, allDefeated, waveStatus, taskId]
  );
  
  return {
    totalHp,
    currentHp,
    damageDealt,
    allDefeated,
    task: taskResult.rows[0]
  };
}

// Get task with all enemies and active session
export const getTaskWithEnemies = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const taskResult = await pool.query(
      `SELECT t.*, c.name as character_name, c.player_id
       FROM tasks t
       LEFT JOIN characters c ON t.character_id = c.id
       WHERE t.id = $1`,
      [taskId]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const enemiesResult = await pool.query(
      `SELECT * FROM enemies WHERE task_id = $1 ORDER BY enemy_order, created_at`,
      [taskId]
    );
    
    const sessionsResult = await pool.query(
      `SELECT * FROM training_sessions WHERE task_id = $1 ORDER BY started_at`,
      [taskId]
    );
    
    const activeSession = sessionsResult.rows.find((s: any) => s.status === 'active') 
      || sessionsResult.rows[sessionsResult.rows.length - 1] 
      || null;
    
    res.json({
      task: taskResult.rows[0],
      enemies: enemiesResult.rows,
      sessions: sessionsResult.rows,
      active_session: activeSession
    });
  } catch (error) {
    console.error('Error fetching task with enemies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper: get or create an active training session for a task
async function getOrCreateActiveSession(client: any, taskId: string, task: any = null) {
  const activeSession = await client.query(
    `SELECT * FROM training_sessions 
     WHERE task_id = $1 AND status = 'active' 
     ORDER BY started_at DESC 
     LIMIT 1`,
    [taskId]
  );
  
  if (activeSession.rows.length > 0) {
    return activeSession.rows[0];
  }
  
  // No active session: create a new one
  const countResult = await client.query(
    'SELECT COUNT(*)::int as count FROM training_sessions WHERE task_id = $1',
    [taskId]
  );
  const sessionNumber = (countResult.rows[0]?.count || 0) + 1;
  
  if (!task) {
    const taskResult = await client.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    task = taskResult.rows[0];
  }
  const startingDamage = Number(task?.wave_damage_dealt) || 0;
  
  const sessionResult = await client.query(
    `INSERT INTO training_sessions (task_id, session_number, starting_wave_damage_dealt, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING *`,
    [taskId, sessionNumber, startingDamage]
  );
  
  // Reset enemy actual values for the new session
  await client.query(
    `UPDATE enemies 
     SET actual_value = 0,
         updated_at = CURRENT_TIMESTAMP
     WHERE task_id = $1`,
    [taskId]
  );
  
  return sessionResult.rows[0];
}

// Start a new training session for a wave
export const startTrainingSession = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const taskResult = await client.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      if (taskResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const task = taskResult.rows[0];
      
      // Close any stale active sessions before starting a new one
      await client.query(
        `UPDATE training_sessions 
         SET status = 'completed', total_damage = 0, completed_at = CURRENT_TIMESTAMP
         WHERE task_id = $1 AND status = 'active'`,
        [taskId]
      );
      
      const session = await getOrCreateActiveSession(client, taskId, task);
      
      const enemiesResult = await client.query('SELECT * FROM enemies WHERE task_id = $1', [taskId]);
      const sessionsResult = await client.query(
        `SELECT * FROM training_sessions WHERE task_id = $1 ORDER BY started_at`,
        [taskId]
      );
      
      await client.query('COMMIT');
      
      res.json({
        task: { ...task, wave_damage_dealt: session.starting_wave_damage_dealt },
        enemies: enemiesResult.rows,
        sessions: sessionsResult.rows,
        session
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error starting training session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Complete a wave with final result
export const completeWave = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const taskResult = await client.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      if (taskResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const enemiesResult = await client.query('SELECT * FROM enemies WHERE task_id = $1', [taskId]);
      
      const task = taskResult.rows[0];
      const enemies = enemiesResult.rows;
      
      const totalHp = enemies.length > 0 
        ? enemies.reduce((sum: number, e: any) => sum + Number(e.max_hp), 0)
        : Number(task.wave_total_hp) || 0;
      
      const damageDealt = enemies.length > 0
        ? enemies.reduce((sum: number, e: any) => sum + Number(e.damage_dealt), 0)
        : Number(task.wave_damage_dealt) || 0;
      
      const percent = totalHp > 0 ? Math.round((damageDealt / totalHp) * 100 * 100) / 100 : 0;
      const defeatedCount = enemies.filter((e: any) => e.is_defeated).length;
      const damagedCount = enemies.filter((e: any) => e.damage_dealt > 0 && !e.is_defeated).length;
      const allDefeated = defeatedCount === enemies.length && enemies.length > 0;
      
      // Find or create active session and calculate session effective damage
      const session = await getOrCreateActiveSession(client, taskId, task);
      const startingDamage = Number(session.starting_wave_damage_dealt);
      const sessionDamage = Math.max(0, damageDealt - startingDamage);
      
      const resultsResult = await client.query(
        `SELECT r.enemy_id, r.damage_dealt, e.name
         FROM training_session_results r
         JOIN enemies e ON r.enemy_id = e.id
         WHERE r.session_id = $1`,
        [session.id]
      );
      
      const damageByEnemy: Record<string, { name: string; damage: number }> = {};
      let totalEffectiveDamage = 0;
      for (const row of resultsResult.rows) {
        const key = row.enemy_id as string;
        damageByEnemy[key] = { name: row.name, damage: Number(row.damage_dealt) };
        totalEffectiveDamage += Number(row.damage_dealt);
      }
      
      await client.query(
        `UPDATE training_sessions 
         SET status = 'completed', 
             total_damage = $1, 
             total_effective_damage = $2,
             damage_by_enemy = $3,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [sessionDamage, totalEffectiveDamage, JSON.stringify(damageByEnemy), session.id]
      );
      
      // Determine wave status. Wave is only complete if all enemies are defeated.
      let waveStatus = task.wave_status || 'active';
      let completedAt = task.completed_at;
      let isCompleted = task.is_completed || false;
      
      if (allDefeated) {
        waveStatus = 'perfect_clear';
        isCompleted = true;
        completedAt = completedAt || new Date().toISOString();
      } else if (sessionDamage <= 0) {
        waveStatus = 'missed';
      }
      
      const updateResult = await client.query(
        `UPDATE tasks 
         SET is_completed = $1,
             completed_at = $2,
             wave_status = $3,
             wave_completed_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE wave_completed_at END,
             result_percent = $4,
             wave_damage_dealt = $5,
             wave_total_hp = $6,
             enemies_defeated_count = $7,
             enemies_damaged_count = $8,
             all_enemies_defeated = $9
         WHERE id = $10
         RETURNING *`,
        [isCompleted, completedAt, waveStatus, percent, damageDealt, totalHp, defeatedCount, damagedCount, allDefeated, taskId]
      );
      
      // Update mission stats if task has quest/mission
      if (task.quest_id) {
        const questResult = await client.query(
          'SELECT mission_id FROM quests WHERE id = $1',
          [task.quest_id]
        );
        
        if (questResult.rows.length > 0 && questResult.rows[0].mission_id) {
          await recalculateMissionStats(client, questResult.rows[0].mission_id);
        }
      }
      
      await client.query('COMMIT');
      
      const message = allDefeated 
        ? 'WAVE COMPLETE' 
        : (sessionDamage > 0 ? 'TRAINING SESSION RECORDED' : 'TRAINING MISSED');
      
      res.json({
        task: updateResult.rows[0],
        waveStatus,
        damageDealt,
        totalHp,
        percent,
        defeatedCount,
        damagedCount,
        sessionDamage,
        message
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error completing wave:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function getWaveCompletionMessage(status: string): string {
  switch (status) {
    case 'missed':
      return 'TRAINING MISSED';
    case 'complete':
    case 'perfect_clear':
      return 'WAVE COMPLETE';
    default:
      return 'TRAINING RECORDED';
  }
}

// Helper to recalculate campaign progress
export async function recalculateCampaignProgress(client: any, campaignId: string) {
  const result = await client.query(
    `SELECT 
      COUNT(*) as total_missions,
      COUNT(*) FILTER (WHERE is_completed) as completed_missions,
      MIN("order") FILTER (WHERE NOT is_completed) as next_order
     FROM missions
     WHERE campaign_id = $1`,
    [campaignId]
  );
  
  const stats = result.rows[0];
  const totalMissions = Number(stats.total_missions) || 0;
  const completedMissions = Number(stats.completed_missions) || 0;
  const allCompleted = totalMissions > 0 && completedMissions === totalMissions;
  const nextOrder = allCompleted ? totalMissions + 1 : (Number(stats.next_order) || 1);
  
  await client.query(
    `UPDATE campaigns
     SET current_mission_order = $1,
         is_completed = $2,
         completed_at = CASE WHEN $2 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [nextOrder, allCompleted, campaignId]
  );
}

// Helper to recalculate mission stats
export async function recalculateMissionStats(client: any, missionId: string) {
  const result = await client.query(
    `SELECT 
      COUNT(t.id) as total_waves,
      COUNT(t.id) FILTER (WHERE t.is_completed) as completed_waves,
      COALESCE(SUM(t.wave_damage_dealt), 0) as total_damage,
      COALESCE(SUM(t.wave_total_hp), 0) as max_possible_damage,
      COUNT(t.id) FILTER (WHERE t.wave_status = 'perfect_clear') as perfect_clears,
      COALESCE(SUM(t.enemies_defeated_count), 0) as enemies_defeated_count,
      (SELECT COUNT(*) FROM training_sessions s
       JOIN tasks t2 ON s.task_id = t2.id
       JOIN quests q2 ON t2.quest_id = q2.id
       WHERE q2.mission_id = $1 AND s.status = 'completed') as total_sessions
     FROM tasks t
     JOIN quests q ON t.quest_id = q.id
     WHERE q.mission_id = $1`,
    [missionId]
  );
  
  const stats = result.rows[0];
  
  const missionResult = await client.query(
    `SELECT campaign_id FROM missions WHERE id = $1`,
    [missionId]
  );
  
  await client.query(
    `UPDATE missions 
     SET total_waves = $1,
         completed_waves = $2,
         total_damage = $3,
         max_possible_damage = $4,
         perfect_clears = $5,
         enemies_defeated_count = $6,
         total_sessions = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8`,
    [
      Number(stats.total_waves),
      Number(stats.completed_waves),
      Number(stats.total_damage),
      Number(stats.max_possible_damage),
      Number(stats.perfect_clears),
      Number(stats.enemies_defeated_count),
      Number(stats.total_sessions || 0),
      missionId
    ]
  );
}

// Get mission stats
export const getMissionStats = async (req: Request, res: Response) => {
  try {
    const { missionId } = req.params;
    
    const missionResult = await pool.query(
      'SELECT * FROM missions WHERE id = $1',
      [missionId]
    );
    
    if (missionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mission not found' });
    }
    
    const wavesResult = await pool.query(
      `SELECT 
        t.id,
        t.title,
        t.wave_status,
        t.wave_damage_dealt,
        t.wave_total_hp,
        t.result_percent,
        t.enemies_defeated_count,
        t.is_completed,
        t.wave_completed_at
       FROM tasks t
       JOIN quests q ON t.quest_id = q.id
       WHERE q.mission_id = $1
       ORDER BY t.created_at`,
      [missionId]
    );
    
    const mission = missionResult.rows[0];
    const waves = wavesResult.rows;
    
    const totalDamage = waves.reduce((sum: number, w: any) => sum + Number(w.wave_damage_dealt || 0), 0);
    const maxDamage = waves.reduce((sum: number, w: any) => sum + Number(w.wave_total_hp || 0), 0);
    const completedWaves = waves.filter((w: any) => w.is_completed).length;
    const perfectClears = waves.filter((w: any) => w.wave_status === 'perfect_clear').length;
    const totalEnemiesDefeated = waves.reduce((sum: number, w: any) => sum + Number(w.enemies_defeated_count || 0), 0);
    
    res.json({
      mission,
      waves,
      stats: {
        totalDamage,
        maxDamage,
        averageDamage: waves.length > 0 ? Math.round((totalDamage / waves.length) * 100) / 100 : 0,
        percent: maxDamage > 0 ? Math.round((totalDamage / maxDamage) * 100 * 100) / 100 : 0,
        wavesCompleted: completedWaves,
        totalWaves: waves.length,
        perfectClears,
        totalEnemiesDefeated
      }
    });
  } catch (error) {
    console.error('Error fetching mission stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete enemy
export const deleteEnemy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM enemies WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enemy not found' });
    }
    
    res.json({ message: 'Enemy deleted successfully' });
  } catch (error) {
    console.error('Error deleting enemy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
