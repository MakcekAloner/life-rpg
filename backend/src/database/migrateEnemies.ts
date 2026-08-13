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

async function migrateEnemies() {
  const client = await pool.connect();
  
  try {
    console.log('Starting enemies migration...');
    
    await client.query('BEGIN');
    
    // Enemies table - subtasks within a wave/task
    await client.query(`
      CREATE TABLE IF NOT EXISTS enemies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        enemy_order INTEGER NOT NULL DEFAULT 0,
        max_hp INTEGER NOT NULL DEFAULT 10,
        current_hp INTEGER NOT NULL DEFAULT 10,
        damage_dealt INTEGER NOT NULL DEFAULT 0,
        measurement_type VARCHAR(20) NOT NULL DEFAULT 'binary' CHECK (measurement_type IN ('binary', 'quantity', 'duration', 'percentage', 'manual')),
        target_value NUMERIC(10, 2) DEFAULT 1,
        actual_value NUMERIC(10, 2) DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'not_engaged' CHECK (status IN ('not_engaged', 'damaged', 'defeated')),
        is_defeated BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Enemy logs table - history of attacks/progress
    await client.query(`
      CREATE TABLE IF NOT EXISTS enemy_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        enemy_id UUID NOT NULL REFERENCES enemies(id) ON DELETE CASCADE,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        previous_actual NUMERIC(10, 2) DEFAULT 0,
        new_actual NUMERIC(10, 2) NOT NULL,
        damage_dealt INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add wave tracking to tasks
    await client.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS wave_total_hp INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS wave_current_hp INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS wave_damage_dealt INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS engagement_started BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS all_enemies_defeated BOOLEAN DEFAULT false
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enemies_task_id ON enemies(task_id);
      CREATE INDEX IF NOT EXISTS idx_enemy_logs_enemy_id ON enemy_logs(enemy_id);
      CREATE INDEX IF NOT EXISTS idx_enemy_logs_task_id ON enemy_logs(task_id);
    `);
    
    // Create trigger function if not exists
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    // Create triggers for enemies
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'update_enemies_updated_at'
        ) THEN
          CREATE TRIGGER update_enemies_updated_at
          BEFORE UPDATE ON enemies
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);
    
    await client.query('COMMIT');
    
    console.log('Enemies migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Enemies migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateEnemies()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateEnemies };