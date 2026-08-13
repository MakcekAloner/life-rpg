import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
import playerRoutes from './routes/playerRoutes';
import characterRoutes from './routes/characterRoutes';
import campaignRoutes from './routes/campaignRoutes';
import missionRoutes from './routes/missionRoutes';
import questRoutes from './routes/questRoutes';
import taskRoutes from './routes/taskRoutes';
import enemyRoutes from './routes/enemyRoutes';

// Basic route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Life RPG API is running' });
});

// API routes
app.use('/api/players', playerRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/waves', enemyRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Life RPG Backend is running on port ${PORT}`);
});
