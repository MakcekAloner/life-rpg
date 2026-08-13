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

async function migrateMissionStats() {
  const client = await pool.connect();
  
  try {
    console.log('Starting mission stats migration...');
    await client.query('BEGIN');
    
    await client.query(`
      ALTER TABLE missions
      ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0
    `);
    
    await client.query('COMMIT');
    console.log('Mission stats migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Mission stats migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateMissionStats()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateMissionStats };
