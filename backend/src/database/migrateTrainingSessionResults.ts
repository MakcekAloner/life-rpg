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

async function migrateTrainingSessionResults() {
  const client = await pool.connect();
  
  try {
    console.log('Starting training session results migration...');
    await client.query('BEGIN');
    
    await client.query(`
      ALTER TABLE training_sessions
      ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS total_effective_damage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS damage_by_enemy JSONB DEFAULT '{}'
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_session_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
        enemy_id UUID NOT NULL REFERENCES enemies(id) ON DELETE CASCADE,
        actual_value NUMERIC(10, 2) DEFAULT 0,
        damage_dealt INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (session_id, enemy_id)
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_session_results_session_id
      ON training_session_results(session_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_session_results_enemy_id
      ON training_session_results(enemy_id)
    `);
    
    await client.query('COMMIT');
    console.log('Training session results migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Training session results migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateTrainingSessionResults()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateTrainingSessionResults };
