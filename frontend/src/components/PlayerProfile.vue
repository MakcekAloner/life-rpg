<template>
  <div class="player-profile">
    <div class="profile-header">
      <div class="avatar-section">
        <div class="avatar">
          <img v-if="player.avatar_url" :src="player.avatar_url" :alt="player.display_name" />
          <div v-else class="avatar-placeholder">
            {{ player.display_name.charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="level-badge">
          LVL {{ player.level }}
        </div>
      </div>
      
      <div class="player-info">
        <h2 class="player-name">{{ player.display_name }}</h2>
        <p class="player-username">@{{ player.username }}</p>
        <p class="player-bio" v-if="player.bio">{{ player.bio }}</p>
      </div>
    </div>
    
    <div class="stats-section">
      <div class="xp-section">
        <div class="xp-header">
          <span class="xp-label">Опыт</span>
          <span class="xp-values">{{ player.current_xp }} / {{ player.next_level_xp }} XP</span>
        </div>
        <div class="xp-bar">
          <div class="xp-fill" :style="{ width: xpProgress + '%' }"></div>
        </div>
        <div class="xp-total">Всего XP: {{ player.total_xp }}</div>
      </div>
      
      <div class="currency-section">
        <div class="currency-icon">💰</div>
        <div class="currency-info">
          <span class="currency-label">Валюта</span>
          <span class="currency-value">{{ player.currency }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '../api/playerApi';

interface Props {
  player: Player;
}

const props = defineProps<Props>();

const xpProgress = computed(() => {
  return (props.player.current_xp / props.player.next_level_xp) * 100;
});
</script>

<style scoped>
.player-profile {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.avatar-section {
  position: relative;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #f39c12;
  background: linear-gradient(135deg, #2c3e50, #34495e);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: #f39c12;
}

.level-badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  border: 2px solid #1a1a2e;
}

.player-info {
  flex: 1;
}

.player-name {
  font-size: 1.5rem;
  font-weight: bold;
  color: #f39c12;
  margin-bottom: 4px;
}

.player-username {
  color: #95a5a6;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.player-bio {
  color: #bdc3c7;
  font-size: 0.95rem;
  line-height: 1.4;
}

.stats-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.xp-section {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.xp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.xp-label {
  color: #bdc3c7;
  font-size: 0.9rem;
}

.xp-values {
  color: #f39c12;
  font-weight: bold;
  font-size: 0.9rem;
}

.xp-bar {
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #e74c3c);
  transition: width 0.3s ease;
  border-radius: 6px;
}

.xp-total {
  color: #95a5a6;
  font-size: 0.8rem;
  text-align: right;
}

.currency-section {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.currency-icon {
  font-size: 2rem;
}

.currency-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.currency-label {
  color: #bdc3c7;
  font-size: 0.9rem;
}

.currency-value {
  color: #f39c12;
  font-weight: bold;
  font-size: 1.5rem;
}
</style>