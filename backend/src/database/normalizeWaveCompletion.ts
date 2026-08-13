import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'life_rpg',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function normalizeWaveCompletion() {
  const client = await pool.connect();
  
  try {
    console.log('Starting wave completion normalization...');
    await client.query('BEGIN');
    
    // Fix wave (task) completion: a wave is only complete if ALL enemies have current_hp = 0
    await client.query(`
      UPDATE tasks t
      SET
        wave_total_hp = sub.total_hp,
        wave_current_hp = sub.current_hp,
        wave_damage_dealt = sub.damage,
        all_enemies_defeated = sub.all_defeated,
        is_completed = sub.all_defeated,
        completed_at = CASE WHEN sub.all_defeated THEN COALESCE(t.completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
        wave_status = CASE 
          WHEN sub.all_defeated THEN 'perfect_clear' 
          WHEN sub.damage > 0 THEN 'active' 
          ELSE 'active' 
        END,
        enemies_defeated_count = sub.defeated_count,
        updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT 
          task_id,
          COALESCE(SUM(max_hp), 0) as total_hp,
          COALESCE(SUM(current_hp), 0) as current_hp,
          COALESCE(SUM(damage_dealt), 0) as damage,
          COALESCE(bool_and(current_hp = 0), false) as all_defeated,
          COUNT(*) FILTER (WHERE current_hp = 0) as defeated_count
        FROM enemies
        GROUP BY task_id
      ) sub
      WHERE t.id = sub.task_id
    `);
    
    // Recalculate mission wave completion stats
    await client.query(`
      UPDATE missions m
      SET
        completed_waves = sub.completed,
        is_completed = sub.all_completed,
        completed_at = CASE WHEN sub.all_completed THEN COALESCE(m.completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT 
          q.mission_id,
          COUNT(*) FILTER (WHERE t.is_completed) as completed,
          COALESCE(bool_and(t.is_completed), false) as all_completed
        FROM tasks t
        JOIN quests q ON t.quest_id = q.id
        GROUP BY q.mission_id
      ) sub
      WHERE m.id = sub.mission_id
    `);
    
    // Recalculate campaign progress
    await client.query(`
      UPDATE campaigns c
      SET
        current_mission_order = COALESCE(
          sub.next_order,
          (SELECT COUNT(*) + 1 FROM missions WHERE campaign_id = c.id)
        ),
        is_completed = sub.all_completed,
        completed_at = CASE WHEN sub.all_completed THEN COALESCE(c.completed_at, CURRENT_TIMESTAMP) ELSE c.completed_at END,
        updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT 
          campaign_id,
          MIN("order") FILTER (WHERE NOT is_completed) as next_order,
          COALESCE(bool_and(is_completed), false) as all_completed
        FROM missions
        GROUP BY campaign_id
      ) sub
      WHERE c.id = sub.campaign_id
    `);
    
    await client.query('COMMIT');
    console.log('Wave completion normalization completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Wave completion normalization failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  normalizeWaveCompletion()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { normalizeWaveCompletion };
