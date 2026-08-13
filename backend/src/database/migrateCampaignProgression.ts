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

async function migrateCampaignProgression() {
  const client = await pool.connect();
  
  try {
    console.log('Starting campaign progression migration...');
    await client.query('BEGIN');
    
    // Mission progression/stats columns
    await client.query(`
      ALTER TABLE missions
      ADD COLUMN IF NOT EXISTS total_waves INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_waves INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_damage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_possible_damage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS perfect_clears INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS enemies_defeated_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rewards_claimed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true
    `);
    
    // Wave order inside mission
    await client.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS wave_order INTEGER DEFAULT 1
    `);
    
    // Normalize wave_order per mission by created_at
    await client.query(`
      UPDATE tasks t
      SET wave_order = sub.row_number
      FROM (
        SELECT t.id, ROW_NUMBER() OVER (PARTITION BY q.mission_id ORDER BY t.created_at) as row_number
        FROM tasks t
        JOIN quests q ON t.quest_id = q.id
      ) sub
      WHERE t.id = sub.id
    `);
    
    // Default rewards_claimed for already completed missions to true to avoid double reward
    await client.query(`
      UPDATE missions
      SET rewards_claimed = true
      WHERE is_completed AND rewards_claimed IS NULL
    `);
    
    await client.query('COMMIT');
    console.log('Campaign progression migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Campaign progression migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateCampaignProgression()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateCampaignProgression };
