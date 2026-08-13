# Life RPG

Система геймификации реальной жизни, которая одновременно является инструментом развития, игрой с персонажами и кампаниями, основой для контента и интерактивным сайтом.

## Структура проекта

```
life-rpg/
├── backend/          # Node.js + Express API
├── frontend/         # Vue 3 + TypeScript UI
├── shared/           # Общие типы и утилиты
└── package.json      # Root package.json
```

## Технологический стек

- **Frontend**: Vue 3 + TypeScript + Vite + Pinia + Vue Router
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Architecture**: Monorepo с workspaces

## Установка

1. Клонируйте репозиторий
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Настройте переменные окружения:
   ```bash
   cp backend/.env.example backend/.env
   ```
4. Настройте PostgreSQL базу данных
5. Запустите миграции:
   ```bash
   npm run migrate
   ```

## Запуск

### Development mode
```bash
npm run dev
```

### Отдельно:
```bash
# Backend
npm run dev:backend

# Frontend
npm run dev:frontend
```

## Основные концепции

### Иерархия прогресса
Actions → Tasks → Quests → Missions → Campaigns → Meta Progression

### Сущности системы
- **Player**: Главный игрок
- **Characters**: Персонажи для разных кампаний
- **Campaigns**: Крупные области развития
- **Missions**: Основные этапы кампании
- **Quests**: Подзадачи для миссий
- **Tasks**: Конкретные действия
- **Actions**: Базовые единицы активности
- **Skills**: Навыки и их деревья
- **XP**: Опыт для развития
- **Currency**: Игровая валюта
- **Achievements**: Достижения
- **Streaks**: Серии выполнений
- **Debuffs**: Временные негативные эффекты

## Особенности

- Система провалов и последствий (Consequence Engine)
- Redemption Quests для возвращения после поражений
- Survival Mode с повышенными ставками
- Reward Shop для обмена валюты на награды
- Event log для полной истории изменений
- Защита от читерства и фарминга

## Лицензия

MIT
