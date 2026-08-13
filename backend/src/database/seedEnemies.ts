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

async function seedEnemies() {
  const client = await pool.connect();
  
  try {
    console.log('Starting enemies seeding...');
    await client.query('BEGIN');
    
    // Find all tasks that don't have enemies yet
    const tasksResult = await client.query(
      `SELECT t.id, t.title, t.description 
       FROM tasks t
       WHERE NOT EXISTS (
         SELECT 1 FROM enemies e WHERE e.task_id = t.id
       )`
    );
    
    console.log(`Found ${tasksResult.rows.length} tasks without enemies`);
    
    for (const task of tasksResult.rows) {
      let enemies: any[] = [];
      
      // Generate enemies based on task title
      const title = task.title.toLowerCase();
      
      if (title.includes('отжим')) {
        enemies = [
          { name: 'Разминка', max_hp: 10, type: 'binary', target: 1 },
          { name: 'Подход 1', max_hp: 8, type: 'quantity', target: 1 },
          { name: 'Подход 2', max_hp: 8, type: 'quantity', target: 1 },
          { name: 'Подход 3', max_hp: 8, type: 'quantity', target: 1 },
          { name: 'Заминка', max_hp: 6, type: 'binary', target: 1 },
        ];
      } else if (title.includes('книг') || title.includes('читать')) {
        enemies = [
          { name: 'Страницы 1-3', max_hp: 10, type: 'quantity', target: 3 },
          { name: 'Страницы 4-7', max_hp: 10, type: 'quantity', target: 4 },
          { name: 'Страницы 8-10', max_hp: 10, type: 'quantity', target: 3 },
        ];
      } else if (title.includes('медитац')) {
        enemies = [
          { name: 'Первая 5 минут', max_hp: 15, type: 'duration', target: 5 },
          { name: 'Вторая 5 минут', max_hp: 15, type: 'duration', target: 5 },
          { name: 'Финальные 5 минут', max_hp: 20, type: 'duration', target: 5 },
        ];
      } else if (title.includes('тренировк') || title.includes('workout') || title.includes('калистеник')) {
        enemies = [
          { name: 'Разминка', max_hp: 10, type: 'binary', target: 1 },
          { name: 'Подтягивания', max_hp: 30, type: 'quantity', target: 4 },
          { name: 'Брусья', max_hp: 30, type: 'quantity', target: 4 },
          { name: 'Core', max_hp: 20, type: 'duration', target: 10 },
          { name: 'Заминка', max_hp: 10, type: 'binary', target: 1 },
        ];
      } else {
        // Default generic enemies for any task
        enemies = [
          { name: 'Начало', max_hp: 25, type: 'percentage', target: 100 },
          { name: 'Середина', max_hp: 40, type: 'percentage', target: 100 },
          { name: 'Финал', max_hp: 35, type: 'percentage', target: 100 },
        ];
      }
      
      let totalHp = 0;
      
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        await client.query(`
          INSERT INTO enemies 
          (task_id, name, description, enemy_order, max_hp, current_hp, measurement_type, target_value, actual_value, status, is_defeated)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 'not_engaged', false)
        `, [
          task.id,
          enemy.name,
          `Подзадача внутри "${task.title}"`,
          i,
          enemy.max_hp,
          enemy.max_hp,
          enemy.type,
          enemy.target
        ]);
        totalHp += enemy.max_hp;
      }
      
      // Update task wave totals
      await client.query(`
        UPDATE tasks 
        SET wave_total_hp = $1,
            wave_current_hp = $1,
            engagement_started = false
        WHERE id = $2
      `, [totalHp, task.id]);
      
      console.log(`Created ${enemies.length} enemies for task: ${task.title}`);
    }
    
    await client.query('COMMIT');
    console.log('Enemies seeding completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Enemies seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedEnemies()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedEnemies };