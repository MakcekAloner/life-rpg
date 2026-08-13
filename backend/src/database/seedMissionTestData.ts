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

const WAVE_CONFIG = [
  { missionTitle: 'Освоить подтягивания', waveTitle: 'Тренировка 1' },
  { missionTitle: 'Освоить выход на две руки', waveTitle: 'Тренировка 1' },
  { missionTitle: 'Привести подругу', waveTitle: 'Тренировка 1' },
];

const ENEMY_TEMPLATES = [
  { name: 'Подход 1', max_hp: 50, target_value: 5 },
  { name: 'Подход 2', max_hp: 50, target_value: 5 },
  { name: 'Подход 3', max_hp: 50, target_value: 5 },
];

async function seedMissionTestData() {
  const client = await pool.connect();
  
  try {
    console.log('Starting mission test data seed...');
    await client.query('BEGIN');
    
    for (const config of WAVE_CONFIG) {
      const missionResult = await client.query(
        'SELECT * FROM missions WHERE title = $1',
        [config.missionTitle]
      );
      
      if (missionResult.rows.length === 0) {
        console.log(`Mission not found: ${config.missionTitle}`);
        continue;
      }
      
      const mission = missionResult.rows[0];
      
      // Ensure at least one quest for the mission
      let questResult = await client.query(
        'SELECT * FROM quests WHERE mission_id = $1 ORDER BY "order" LIMIT 1',
        [mission.id]
      );
      
      let questId: string;
      if (questResult.rows.length === 0) {
        const insertQuest = await client.query(
          `INSERT INTO quests (mission_id, title, description, "order", xp_reward, currency_reward)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [mission.id, config.waveTitle, '', 1, 0, 0]
        );
        questId = insertQuest.rows[0].id;
        console.log(`Created quest for mission ${config.missionTitle}`);
      } else {
        questId = questResult.rows[0].id;
      }
      
      // Ensure at least one task/wave for the quest
      let taskResult = await client.query(
        'SELECT * FROM tasks WHERE quest_id = $1 ORDER BY wave_order LIMIT 1',
        [questId]
      );
      
      let taskId: string;
      if (taskResult.rows.length === 0) {
        const insertTask = await client.query(
          `INSERT INTO tasks (quest_id, character_id, title, description, difficulty, is_completed, wave_order, wave_status)
           VALUES ($1, $2, $3, $4, $5, false, 1, 'active') RETURNING *`,
          [questId, mission.character_id, config.waveTitle, '', 3]
        );
        taskId = insertTask.rows[0].id;
        console.log(`Created task for quest ${questId}`);
      } else {
        taskId = taskResult.rows[0].id;
      }
      
      // Ensure 3 enemies for the task
      const enemiesResult = await client.query(
        'SELECT * FROM enemies WHERE task_id = $1 ORDER BY enemy_order',
        [taskId]
      );
      
      if (enemiesResult.rows.length < 3) {
        const existingCount = enemiesResult.rows.length;
        for (let i = existingCount; i < 3; i++) {
          const template = ENEMY_TEMPLATES[i];
          await client.query(
            `INSERT INTO enemies 
             (task_id, name, description, enemy_order, max_hp, current_hp, damage_dealt, target_value, measurement_type, status, is_defeated, actual_value)
             VALUES ($1, $2, $3, $4, $5, $5, 0, $6, 'manual', 'not_engaged', false, 0)`,
            [taskId, template.name, '', i, template.max_hp, template.target_value]
          );
        }
        console.log(`Created ${3 - existingCount} enemies for task ${taskId}`);
      } else {
        console.log(`Task ${taskId} already has ${enemiesResult.rows.length} enemies`);
      }
      
      // Recalculate wave totals so new enemies are reflected
      const newEnemies = await client.query(
        'SELECT max_hp, current_hp, damage_dealt, is_defeated FROM enemies WHERE task_id = $1',
        [taskId]
      );
      const totalHp = newEnemies.rows.reduce((sum: number, e: any) => sum + Number(e.max_hp), 0);
      await client.query(
        `UPDATE tasks 
         SET wave_total_hp = $1, wave_current_hp = $1, wave_damage_dealt = 0
         WHERE id = $2`,
        [totalHp, taskId]
      );
    }
    
    await client.query('COMMIT');
    console.log('Mission test data seed completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Mission test data seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedMissionTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedMissionTestData };
