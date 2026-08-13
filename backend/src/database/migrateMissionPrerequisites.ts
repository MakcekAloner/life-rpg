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

async function migrateMissionPrerequisites() {
  const client = await pool.connect();
  
  try {
    console.log('Starting mission prerequisites migration...');
    await client.query('BEGIN');
    
    // Add columns for prerequisite-based progression
    await client.query(`
      ALTER TABLE missions
      ADD COLUMN IF NOT EXISTS prerequisite_mission_ids TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS is_boss BOOLEAN DEFAULT false
    `);
    
    // Get the Calisthenics Campaign and its missions
    const campaignResult = await client.query(
      "SELECT * FROM campaigns WHERE name = 'Calisthenics Campaign'"
    );
    
    if (campaignResult.rows.length > 0) {
      const campaignId = campaignResult.rows[0].id;
      const missions = (await client.query(
        'SELECT * FROM missions WHERE campaign_id = $1 ORDER BY "order"',
        [campaignId]
      )).rows;
      
      const missionByOrder: Record<number, string> = {};
      for (const m of missions) {
        missionByOrder[m.order] = m.id;
      }
      
      for (const m of missions) {
        let prereq: string[] = [];
        let isBoss = false;
        let isRequired = m.is_required;
        
        if (m.title === 'Освоить отжимания') {
          prereq = [];
        } else if (m.title === 'Освоить подтягивания') {
          prereq = missionByOrder[1] ? [missionByOrder[1]] : [];
        } else if (m.title === 'Освоить выход на две руки') {
          prereq = missionByOrder[2] ? [missionByOrder[2]] : [];
        } else if (m.title === 'Привести подругу') {
          // Optional side mission
          isRequired = false;
          prereq = [];
        } else if (m.title === 'FINAL BOSS' || m.is_boss) {
          isBoss = true;
          prereq = [missionByOrder[1], missionByOrder[2], missionByOrder[3]].filter(Boolean);
        } else if (m.title.includes('Boss') || m.title.includes('boss') || m.title.includes('BOSS')) {
          isBoss = true;
          prereq = [missionByOrder[1], missionByOrder[2], missionByOrder[3]].filter(Boolean);
        } else if (m.order > 1) {
          // Default linear prerequisite for unknown missions
          prereq = missionByOrder[m.order - 1] ? [missionByOrder[m.order - 1]] : [];
        }
        
        await client.query(
          'UPDATE missions SET prerequisite_mission_ids = $1, is_boss = $2, is_required = $3 WHERE id = $4',
          [prereq, isBoss, isRequired, m.id]
        );
      }
    }
    
    await client.query('COMMIT');
    console.log('Mission prerequisites migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Mission prerequisites migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateMissionPrerequisites()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateMissionPrerequisites };
