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

const ENEMY_TEMPLATES = [
  { name: 'Этап 1', max_hp: 60, target_value: 5 },
  { name: 'Этап 2', max_hp: 60, target_value: 5 },
  { name: 'Этап 3', max_hp: 60, target_value: 5 },
];

async function seedFinalBoss() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Final Boss seed...');
    await client.query('BEGIN');
    
    const campaign = (await client.query(
      "SELECT * FROM campaigns WHERE name = 'Calisthenics Campaign'"
    )).rows[0];
    
    if (!campaign) {
      console.log('Calisthenics Campaign not found, skipping Final Boss seed');
      await client.query('COMMIT');
      return;
    }
    
    // Ensure Mission 4 is optional
    await client.query(
      `UPDATE missions SET is_required = false WHERE campaign_id = $1 AND title = 'Привести подругу'`,
      [campaign.id]
    );
    
    // Find or create the final boss mission
    let bossMission = (await client.query(
      'SELECT * FROM missions WHERE campaign_id = $1 AND (is_boss = true OR title = $2) ORDER BY "order" LIMIT 1',
      [campaign.id, 'FINAL BOSS']
    )).rows[0];
    
    if (!bossMission) {
      const maxOrderResult = (await client.query(
        'SELECT COALESCE(MAX("order"), 0) as max_order FROM missions WHERE campaign_id = $1',
        [campaign.id]
      )).rows[0];
      const nextOrder = (maxOrderResult.max_order || 0) + 1;
      const prerequisiteMissions = (await client.query(
        'SELECT id, "order" FROM missions WHERE campaign_id = $1 AND "order" = ANY($2)',
        [campaign.id, [1, 2, 3]]
      )).rows;
      const prereqIds = prerequisiteMissions
        .filter((m: any) => [1, 2, 3].includes(m.order))
        .map((m: any) => m.id);
      
      const characterId = campaign.starting_character_id;
      
      const insert = await client.query(
        `INSERT INTO missions
         (campaign_id, character_id, title, description, "order", difficulty, xp_reward, currency_reward, success_criteria, is_required, is_boss, prerequisite_mission_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          campaign.id,
          characterId,
          'FINAL BOSS',
          'Финальное испытание кампании',
          nextOrder,
          7,
          200,
          100,
          [],
          true,
          true,
          prereqIds
        ]
      );
      bossMission = insert.rows[0];
      console.log(`Created Final Boss mission at order ${nextOrder}`);
    } else {
      console.log('Final Boss mission already exists');
    }
    
    // Ensure quest
    let quest = (await client.query(
      'SELECT * FROM quests WHERE mission_id = $1 ORDER BY "order" LIMIT 1',
      [bossMission.id]
    )).rows[0];
    
    let questId: string;
    if (!quest) {
      const insertQuest = await client.query(
        `INSERT INTO quests (mission_id, title, description, "order", xp_reward, currency_reward)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [bossMission.id, 'Финальное испытание', '', 1, 0, 0]
      );
      questId = insertQuest.rows[0].id;
      console.log('Created Final Boss quest');
    } else {
      questId = quest.id;
    }
    
    // Ensure wave
    let task = (await client.query(
      'SELECT * FROM tasks WHERE quest_id = $1 ORDER BY wave_order LIMIT 1',
      [questId]
    )).rows[0];
    
    let taskId: string;
    if (!task) {
      const insertTask = await client.query(
        `INSERT INTO tasks (quest_id, character_id, title, description, difficulty, is_completed, wave_order, wave_status)
         VALUES ($1, $2, $3, $4, $5, false, 1, 'active') RETURNING *`,
        [questId, bossMission.character_id, 'Финальное испытание', '', 5]
      );
      taskId = insertTask.rows[0].id;
      console.log('Created Final Boss wave');
    } else {
      taskId = task.id;
    }
    
    // Ensure 3 enemies
    const enemies = (await client.query(
      'SELECT * FROM enemies WHERE task_id = $1 ORDER BY enemy_order',
      [taskId]
    )).rows;
    
    if (enemies.length < 3) {
      for (let i = enemies.length; i < 3; i++) {
        const template = ENEMY_TEMPLATES[i];
        await client.query(
          `INSERT INTO enemies
           (task_id, name, description, enemy_order, max_hp, current_hp, damage_dealt, target_value, measurement_type, status, is_defeated, actual_value)
           VALUES ($1, $2, $3, $4, $5, $5, 0, $6, 'manual', 'not_engaged', false, 0)`,
          [taskId, template.name, '', i, template.max_hp, template.target_value]
        );
      }
      console.log(`Created ${3 - enemies.length} Final Boss enemies`);
    } else {
      console.log(`Final Boss task already has ${enemies.length} enemies`);
    }
    
    // Recalculate wave hp
    const allEnemies = (await client.query(
      'SELECT max_hp, current_hp, damage_dealt, is_defeated FROM enemies WHERE task_id = $1',
      [taskId]
    )).rows;
    const totalHp = allEnemies.reduce((sum: number, e: any) => sum + Number(e.max_hp), 0);
    await client.query(
      'UPDATE tasks SET wave_total_hp = $1, wave_current_hp = $1, wave_damage_dealt = 0 WHERE id = $2',
      [totalHp, taskId]
    );
    
    await client.query('COMMIT');
    console.log('Final Boss seed completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Final Boss seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedFinalBoss()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedFinalBoss };
