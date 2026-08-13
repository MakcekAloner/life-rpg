import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'life_rpg',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function seedTasks() {
  const client = await pool.connect();
  
  try {
    console.log('Starting tasks seeding...');
    
    // Get existing character
    const characterResult = await client.query(
      "SELECT id FROM characters WHERE name = 'Дохляк' LIMIT 1"
    );
    
    if (characterResult.rows.length === 0) {
      console.log('Character not found, skipping task seeding');
      return;
    }
    
    const characterId = characterResult.rows[0].id;
    
    // Create sample tasks
    const tasks = [
      {
        id: uuidv4(),
        character_id: characterId,
        title: 'Выполнить 30 отжиманий',
        description: '3 подхода по 10 отжиманий с правильной техникой',
        difficulty: 3,
        xp_reward: 30,
        currency_reward: 15,
        deadline: new Date(Date.now() + 86400000), // Tomorrow
        estimated_duration: 15
      },
      {
        id: uuidv4(),
        character_id: characterId,
        title: 'Прочитать 10 страниц книги',
        description: 'Продолжить чтение книги по саморазвитию',
        difficulty: 2,
        xp_reward: 20,
        currency_reward: 10,
        estimated_duration: 30
      },
      {
        id: uuidv4(),
        character_id: characterId,
        title: 'Медитация 15 минут',
        description: 'Утренняя медитация для ясности ума',
        difficulty: 1,
        xp_reward: 10,
        currency_reward: 5,
        is_completed: true,
        completed_at: new Date(),
        estimated_duration: 15
      }
    ];
    
    for (const task of tasks) {
      try {
        await client.query(`
          INSERT INTO tasks (id, character_id, title, description, difficulty, xp_reward, currency_reward, deadline, estimated_duration, is_completed, completed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          task.id,
          task.character_id,
          task.title,
          task.description,
          task.difficulty,
          task.xp_reward,
          task.currency_reward,
          task.deadline,
          task.estimated_duration,
          task.is_completed || false,
          task.completed_at || null
        ]);
        console.log(`Created task: ${task.title}`);
      } catch (error) {
        console.log(`Task already exists or error: ${task.title}`);
      }
    }
    
    console.log('Tasks seeding completed successfully!');
    
  } catch (error) {
    console.error('Tasks seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedTasks()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedTasks };