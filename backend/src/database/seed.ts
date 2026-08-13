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

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seeding...');
    
    // Create sample player
    const playerId = uuidv4();
    await client.query(`
      INSERT INTO players (id, username, email, display_name, level, total_xp, current_xp, next_level_xp, currency, bio)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      playerId,
      'life_player',
      'player@liferpg.com',
      'Life RPG Player',
      1,
      0,
      0,
      100,
      50,
      'Первый игрок Life RPG'
    ]);
    
    // Create sample character for calisthenics campaign
    const characterId = uuidv4();
    await client.query(`
      INSERT INTO characters (id, player_id, name, title, description, starting_form, final_form, current_form, level, current_xp, next_level_xp, strength, intelligence, endurance, charisma, discipline, creativity, weaknesses, abilities, story_arc, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      characterId,
      playerId,
      'Дохляк',
      'Новичок калистеники',
      'Только начинаю свой путь в калистенике',
      'Дохляк',
      'Мастер калистеники',
      'Дохляк',
      1,
      0,
      100,
      2,
      3,
      1,
      2,
      2,
      3,
      ['Слабая выносливость', 'Низкая сила'],
      ['Базовая мотивация'],
      'От полного новичка до мастера калистеники',
      true
    ]);
    
    // Create sample campaign
    const campaignId = uuidv4();
    await client.query(`
      INSERT INTO campaigns (id, player_id, name, description, category, starting_character_id, final_character_form, difficulty, is_active, is_completed, current_mission_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      campaignId,
      playerId,
      'Calisthenics Campaign',
      'Кампания по освоению калистеники от базовых элементов до сложных связок',
      'fitness',
      characterId,
      'Мастер калистеники',
      7,
      true,
      false,
      1
    ]);
    
    // Update character with campaign
    await client.query(`
      UPDATE characters SET campaign_id = $1 WHERE id = $2
    `, [campaignId, characterId]);
    
    // Create sample missions
    const missions = [
      {
        id: uuidv4(),
        title: 'Освоить отжимания',
        description: 'Научиться правильно выполнять отжимания с полной амплитудой',
        order: 1,
        difficulty: 3,
        xp_reward: 50,
        currency_reward: 25,
        success_criteria: ['30 отжиманий за подход', 'Правильная техника', '3 подхода по 30 повторений']
      },
      {
        id: uuidv4(),
        title: 'Освоить подтягивания',
        description: 'Научиться выполнять подтягивания с полной амплитудой',
        order: 2,
        difficulty: 5,
        xp_reward: 75,
        currency_reward: 40,
        success_criteria: ['10 подтягиваний за подход', 'Правильная техника', '3 подхода по 10 повторений']
      },
      {
        id: uuidv4(),
        title: 'Освоить выход на две руки',
        description: 'Выполнить выход на две руки с правильной техникой',
        order: 3,
        difficulty: 7,
        xp_reward: 100,
        currency_reward: 60,
        success_criteria: ['Чистый выход на две руки', 'Контроль в верхней точке', '5 повторений']
      }
    ];
    
    for (const mission of missions) {
      await client.query(`
        INSERT INTO missions (id, campaign_id, character_id, title, description, "order", difficulty, xp_reward, currency_reward, success_criteria)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        mission.id,
        campaignId,
        characterId,
        mission.title,
        mission.description,
        mission.order,
        mission.difficulty,
        mission.xp_reward,
        mission.currency_reward,
        mission.success_criteria
      ]);
    }
    
    // Create sample skills
    const skills = [
      {
        id: uuidv4(),
        name: 'Базовая сила',
        description: 'Фундаментальная физическая сила',
        category: 'physical',
        level: 1,
        max_level: 10,
        xp_required: 50,
        current_xp: 10
      },
      {
        id: uuidv4(),
        name: 'Выносливость',
        description: 'Способность выполнять длительные нагрузки',
        category: 'physical',
        level: 0,
        max_level: 10,
        xp_required: 75,
        current_xp: 0
      },
      {
        id: uuidv4(),
        name: 'Техника выполнения',
        description: 'Правильная техника упражнений',
        category: 'technical',
        level: 0,
        max_level: 10,
        xp_required: 100,
        current_xp: 0
      }
    ];
    
    for (const skill of skills) {
      await client.query(`
        INSERT INTO skills (id, character_id, name, description, category, level, max_level, xp_required, current_xp, is_unlocked)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        skill.id,
        characterId,
        skill.name,
        skill.description,
        skill.category,
        skill.level,
        skill.max_level,
        skill.xp_required,
        skill.current_xp,
        skill.level > 0
      ]);
    }
    
    // Create sample rewards
    const rewards = [
      {
        id: uuidv4(),
        name: 'Дополнительный день отдыха',
        description: 'Право на один дополнительный выходной',
        category: 'small',
        cost: 50
      },
      {
        id: uuidv4(),
        name: 'Вечер видеоигр',
        description: '3 часа на видеоигры без чувства вины',
        category: 'medium',
        cost: 150
      },
      {
        id: uuidv4(),
        name: 'Покупка желаемого',
        description: 'Покупка чего-то из списка желаний до $100',
        category: 'large',
        cost: 500
      },
      {
        id: uuidv4(),
        name: 'Выходной в спа',
        description: 'Полный день в спа или массаж',
        category: 'rare',
        cost: 1000
      },
      {
        id: uuidv4(),
        name: 'Путешествие',
        description: 'Уикенд в любом городе',
        category: 'legendary',
        cost: 5000
      }
    ];
    
    for (const reward of rewards) {
      await client.query(`
        INSERT INTO rewards (id, name, description, category, cost)
        VALUES ($1, $2, $3, $4, $5)
      `, [reward.id, reward.name, reward.description, reward.category, reward.cost]);
    }
    
    // Create sample achievements
    const achievements = [
      {
        id: uuidv4(),
        name: 'Первые шаги',
        description: 'Завершить первую миссию',
        category: 'progress',
        xp_reward: 25,
        currency_reward: 15
      },
      {
        id: uuidv4(),
        name: 'Неделя без провалов',
        description: '7 дней подряд без нарушений',
        category: 'streak',
        xp_reward: 50,
        currency_reward: 30
      },
      {
        id: uuidv4(),
        name: 'Мастер уровня 5',
        description: 'Достичь 5 уровня на любом персонаже',
        category: 'level',
        xp_reward: 100,
        currency_reward: 75
      }
    ];
    
    for (const achievement of achievements) {
      await client.query(`
        INSERT INTO achievements (id, name, description, category, xp_reward, currency_reward)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        achievement.id,
        achievement.name,
        achievement.description,
        achievement.category,
        achievement.xp_reward,
        achievement.currency_reward
      ]);
    }
    
    // Create player settings
    await client.query(`
      INSERT INTO player_settings (player_id, email_enabled, push_enabled, streak_reminders, deadline_reminders, achievement_alerts, profile_public, progress_public, achievements_public, show_real_name, difficulty_preference, failure_tolerance, auto_currency_conversion, streak_freeze_enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      playerId,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      5,
      8,
      false,
      true
    ]);
    
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
    }
    
    console.log('Database seeding completed successfully!');
    console.log(`Created player: ${playerId}`);
    console.log(`Created character: ${characterId}`);
    console.log(`Created campaign: ${campaignId}`);
    
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedDatabase };