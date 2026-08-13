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

async function migrateTrainingSessions() {
  const client = await pool.connect();
  
  try {
    console.log('Starting training sessions migration...');
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        starting_wave_damage_dealt INTEGER NOT NULL DEFAULT 0,
        total_damage INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_sessions_task_id
      ON training_sessions(task_id)
    `);
    
    await client.query('COMMIT');
    console.log('Training sessions migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Training sessions migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateTrainingSessions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateTrainingSessions };
