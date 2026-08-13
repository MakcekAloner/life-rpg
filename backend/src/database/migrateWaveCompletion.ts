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

async function migrateWaveCompletion() {
  const client = await pool.connect();
  
  try {
    console.log('Starting wave completion migration...');
    await client.query('BEGIN');
    
    // Add wave completion tracking to tasks
    await client.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS wave_status VARCHAR(20) DEFAULT 'active' CHECK (wave_status IN ('active', 'missed', 'complete', 'perfect_clear')),
      ADD COLUMN IF NOT EXISTS wave_completed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS result_percent NUMERIC(5, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS enemies_defeated_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS enemies_damaged_count INTEGER DEFAULT 0
    `);
    
    // Add mission stats tracking
    await client.query(`
      ALTER TABLE missions
      ADD COLUMN IF NOT EXISTS total_waves INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_waves INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_damage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_possible_damage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS perfect_clears INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS enemies_defeated_count INTEGER DEFAULT 0
    `);
    
    await client.query('COMMIT');
    console.log('Wave completion migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Wave completion migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateWaveCompletion()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateWaveCompletion };