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

async function migrateSkillMilestones() {
  const client = await pool.connect();
  
  try {
    console.log('Starting skill milestones migration...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS skill_milestones (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        "order" INTEGER NOT NULL DEFAULT 1,
        is_achieved BOOLEAN DEFAULT false,
        achieved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_skill_milestones_skill_id
      ON skill_milestones(skill_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_skill_milestones_character_id
      ON skill_milestones(character_id)
    `);
    
    console.log('Skill milestones migration completed successfully!');
  } catch (error) {
    console.error('Skill milestones migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateSkillMilestones()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateSkillMilestones };
