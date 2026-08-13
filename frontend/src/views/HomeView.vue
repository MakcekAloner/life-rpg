<template>
  <div class="home">
    <div class="hero-section" v-if="playerStore.isLoaded">
      <h1 class="title">Life RPG</h1>
      <p class="subtitle">Геймификация реальной жизни</p>
      
      <div class="player-info">
        <h2 class="player-name">{{ playerStore.currentPlayer?.display_name }}</h2>
        <p class="player-bio">{{ playerStore.currentPlayer?.bio }}</p>
      </div>
      
      <div class="stats-preview">
        <div class="stat-card">
          <span class="stat-label">Уровень</span>
          <span class="stat-value">{{ playerStore.currentPlayer?.level }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">XP</span>
          <span class="stat-value">{{ playerStore.currentPlayer?.current_xp }}/{{ playerStore.currentPlayer?.next_level_xp }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Валюта</span>
          <span class="stat-value">{{ playerStore.currentPlayer?.currency }}</span>
        </div>
      </div>
      
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: playerStore.xpProgress + '%' }"></div>
      </div>
      
      <div class="quick-stats" v-if="playerStore.playerStats">
        <div class="quick-stat">
          <span class="quick-stat-label">Активные персонажи</span>
          <span class="quick-stat-value">{{ playerStore.playerStats.stats.active_characters }}</span>
        </div>
        <div class="quick-stat">
          <span class="quick-stat-label">Активные кампании</span>
          <span class="quick-stat-value">{{ playerStore.playerStats.stats.active_campaigns }}</span>
        </div>
        <div class="quick-stat">
          <span class="quick-stat-label">Выполнено миссий</span>
          <span class="quick-stat-value">{{ playerStore.playerStats.stats.completed_missions }}</span>
        </div>
      </div>
      
      <button class="cta-button" @click="goToDashboard" :disabled="playerStore.loading">
        {{ playerStore.loading ? 'Загрузка...' : 'Перейти к дашборду' }}
      </button>
    </div>
    
    <div class="hero-section" v-else>
      <h1 class="title">Life RPG</h1>
      <p class="subtitle">Геймификация реальной жизни</p>
      <div class="loading">
        <p>Загрузка профиля игрока...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../stores/playerStore';

const router = useRouter();
const playerStore = usePlayerStore();

// Use the demo player ID from seed data
const DEMO_PLAYER_ID = 'df58dfec-7ced-436d-b55e-4c20d9874d19';

onMounted(async () => {
  try {
    // Try to fetch player - if it fails, we'll show the loading state
    await playerStore.fetchPlayer(DEMO_PLAYER_ID);
    await playerStore.fetchPlayerStats(DEMO_PLAYER_ID);
  } catch (error) {
    console.log('Demo player not found, user needs to create one');
  }
});

const goToDashboard = () => {
  router.push('/dashboard');
};
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.hero-section {
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.title {
  font-size: 4rem;
  font-weight: bold;
  margin-bottom: 10px;
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.5rem;
  color: #bdc3c7;
  margin-bottom: 40px;
}

.stats-preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #bdc3c7;
  margin-bottom: 8px;
}

.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: bold;
  color: #f39c12;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 30px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #e74c3c);
  transition: width 0.3s ease;
}

.cta-button {
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 1.2rem;
  border-radius: 30px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  font-weight: bold;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(243, 156, 18, 0.3);
}

.cta-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.player-info {
  margin-bottom: 30px;
}

.player-name {
  font-size: 1.8rem;
  color: #f39c12;
  margin-bottom: 10px;
}

.player-bio {
  color: #bdc3c7;
  font-size: 1rem;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.quick-stat {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.quick-stat-label {
  display: block;
  font-size: 0.8rem;
  color: #95a5a6;
  margin-bottom: 5px;
}

.quick-stat-value {
  display: block;
  font-size: 1.4rem;
  font-weight: bold;
  color: #e74c3c;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #bdc3c7;
}
</style>
