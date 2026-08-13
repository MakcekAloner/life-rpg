<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1 class="dashboard-title">🎮 Dashboard</h1>
      <p class="dashboard-subtitle">Приватный дашборд для управления геймификацией</p>
    </div>
    
    <div class="dashboard-content" v-if="playerStore.isLoaded">
      <div class="dashboard-grid">
        <!-- Left Column -->
        <div class="dashboard-column">
          <PlayerProfile :player="playerStore.currentPlayer!" />
          
          <div class="dashboard-section">
            <h3 class="section-title">👥 Активные персонажи</h3>
            <div class="characters-list" v-if="characterStore.characters.length > 0">
              <CharacterCard
                v-for="character in characterStore.activeCharacters"
                :key="character.id"
                :character="character"
                @view="viewCharacter"
                @select="selectCharacter"
              />
            </div>
            <div v-else class="empty-state">
              <p>Нет активных персонажей</p>
              <button class="btn-create" @click="showCreateCharacter = true">
                + Создать персонажа
              </button>
            </div>
          </div>
        </div>
        
        <!-- Right Column -->
        <div class="dashboard-column">
          <div class="dashboard-section">
            <TaskList 
              :tasks="tasks" 
              @complete="handleTaskComplete"
              @toggle="handleTaskToggle"
              @add-task="showAddTaskForm = true"
              @open-battle="openWaveBattle"
            />
          </div>
          
          <div class="dashboard-section">
            <h3 class="section-title">🌊 Создать Wave</h3>
            <p class="hierarchy-hint">
              Используй иерархию: Персонаж → Кампания → Миссия → Wave
            </p>
            <button class="btn-add-task-dashboard" @click="goToCharacters">
              🏹 Перейти к персонажам
            </button>
          </div>
          
          <div class="dashboard-section">
            <h3 class="section-title">📊 Быстрая статистика</h3>
            <div class="quick-stats" v-if="playerStore.playerStats">
              <div class="stat-item">
                <span class="stat-icon">🎯</span>
                <div class="stat-info">
                  <span class="stat-label">Активные кампании</span>
                  <span class="stat-value">{{ playerStore.playerStats.stats.active_campaigns }}</span>
                </div>
              </div>
              <div class="stat-item">
                <span class="stat-icon">✅</span>
                <div class="stat-info">
                  <span class="stat-label">Выполнено миссий</span>
                  <span class="stat-value">{{ playerStore.playerStats.stats.completed_missions }}</span>
                </div>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🏆</span>
                <div class="stat-info">
                  <span class="stat-label">Достижения</span>
                  <span class="stat-value">{{ playerStore.playerStats.stats.total_achievements }}</span>
                </div>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🔥</span>
                <div class="stat-info">
                  <span class="stat-label">Активные серии</span>
                  <span class="stat-value">{{ playerStore.playerStats.stats.active_streaks.length }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="dashboard-section" v-if="activeDebuffs.length > 0">
            <h3 class="section-title">⚠️ Активные дебаффы</h3>
            <div class="debuffs-list">
              <div
                class="debuff-item"
                v-for="debuff in activeDebuffs"
                :key="debuff.id"
              >
                <div class="debuff-header">
                  <span class="debuff-name">{{ debuff.name }}</span>
                  <span class="debuff-severity">Серьезность: {{ debuff.severity }}/10</span>
                </div>
                <p class="debuff-description">{{ debuff.description }}</p>
                <div class="debuff-effects">
                  <span
                    class="debuff-effect"
                    v-for="effect in debuff.effects"
                    :key="effect.type"
                  >
                    {{ effect.description }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="loading-state" v-else>
      <p>Загрузка дашборда...</p>
    </div>
    
    <WaveBattle 
      v-if="showWaveBattle" 
      :task="selectedTask" 
      @close="showWaveBattle = false"
      @updated="handleWaveUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../stores/playerStore';
import { useCharacterStore } from '../stores/characterStore';
import { useTaskStore } from '../stores/taskStore';
import PlayerProfile from '../components/PlayerProfile.vue';
import CharacterCard from '../components/CharacterCard.vue';
import TaskList from '../components/TaskList.vue';
import WaveBattle from '../components/WaveBattle.vue';

const router = useRouter();
const playerStore = usePlayerStore();
const characterStore = useCharacterStore();
const taskStore = useTaskStore();

const showCreateCharacter = ref(false);
const showAddTaskForm = ref(false);
const showWaveBattle = ref(false);
const selectedTask = ref<any>(null);

const activeDebuffs = computed(() => playerStore.playerStats?.stats?.active_debuffs ?? []);
const tasks = computed(() => taskStore.tasks);

onMounted(async () => {
  try {
    const DEMO_PLAYER_ID = 'df58dfec-7ced-436d-b55e-4c20d9874d19';
    await playerStore.fetchPlayer(DEMO_PLAYER_ID);
    await playerStore.fetchPlayerStats(DEMO_PLAYER_ID);
    
    if (playerStore.currentPlayer) {
      await characterStore.fetchCharacters(playerStore.currentPlayer.id);
      await taskStore.fetchAllTasks(playerStore.currentPlayer.id);
    }
  } catch (error) {
    console.log('Unable to load dashboard data');
  }
});

const viewCharacter = (characterId: string) => {
  router.push(`/character/${characterId}`);
};

const selectCharacter = (characterId: string) => {
  characterStore.setCurrentCharacter(characterStore.characterById(characterId) || null);
};

const goToCharacters = () => {
  router.push('/');
};

const handleTaskComplete = async (task: any) => {
  try {
    // Use taskStore to complete task and get rewards
    const result = await taskStore.completeTask(task.id);
    
    // Refresh tasks to get updated state
    if (playerStore.currentPlayer) {
      await taskStore.fetchAllTasks(playerStore.currentPlayer.id);
    }
    
    // Refresh player data to show updated XP and currency
    if (playerStore.currentPlayer) {
      await playerStore.fetchPlayer(playerStore.currentPlayer.id);
      await playerStore.fetchPlayerStats(playerStore.currentPlayer.id);
    }
    
    // Refresh character data to show updated XP
    if (task.character_id) {
      await characterStore.fetchCharacter(task.character_id);
    }
    
    console.log('Task completed with rewards:', result);
  } catch (error) {
    console.error('Error completing task:', error);
  }
};

const handleTaskToggle = async (task: any) => {
  try {
    // If trying to complete an incomplete task, use completeTask instead
    if (!task.is_completed) {
      await handleTaskComplete(task);
      return;
    }
    
    // If trying to uncomplete a task, just update the status
    await taskStore.updateTask(task.id, { is_completed: false });
  } catch (error) {
    console.error('Error toggling task:', error);
  }
};

const openWaveBattle = (task: any) => {
  selectedTask.value = task;
  showWaveBattle.value = true;
};

const handleWaveUpdated = async (result: any) => {
  // Refresh task data after battle
  if (playerStore.currentPlayer) {
    await taskStore.fetchAllTasks(playerStore.currentPlayer.id);
  }
  
  // Refresh player/character if wave completed
  if (result.task?.is_completed) {
    if (playerStore.currentPlayer) {
      await playerStore.fetchPlayer(playerStore.currentPlayer.id);
      await playerStore.fetchPlayerStats(playerStore.currentPlayer.id);
    }
    
    if (result.task?.character_id) {
      await characterStore.fetchCharacter(result.task.character_id);
    }
  }
};
</script>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 32px;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #f39c12;
  margin-bottom: 8px;
}

.dashboard-subtitle {
  color: #bdc3c7;
  font-size: 1.1rem;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.dashboard-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.section-title {
  font-size: 1.3rem;
  font-weight: bold;
  color: #f39c12;
  margin-bottom: 20px;
}

.characters-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.empty-state p {
  margin-bottom: 16px;
}

.btn-create {
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
}

.btn-add-task-dashboard {
  width: 100%;
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-add-task-dashboard:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(243, 156, 18, 0.4);
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.stat-icon {
  font-size: 2rem;
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  color: #95a5a6;
  font-size: 0.85rem;
}

.stat-value {
  color: #f39c12;
  font-weight: bold;
  font-size: 1.2rem;
}

.debuffs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.debuff-item {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 12px;
  padding: 16px;
}

.debuff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.debuff-name {
  color: #e74c3c;
  font-weight: bold;
  font-size: 1rem;
}

.debuff-severity {
  color: #c0392b;
  font-size: 0.85rem;
}

.debuff-description {
  color: #bdc3c7;
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.debuff-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.debuff-effect {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
  font-size: 1.1rem;
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-stats {
    grid-template-columns: 1fr;
  }
}
</style>
