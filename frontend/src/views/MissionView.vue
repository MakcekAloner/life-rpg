<template>
  <div class="mission-page">
    <Breadcrumbs :custom="breadcrumbs" />
    
    <div class="loading-state" v-if="loading">
      <div class="loading-spinner"></div>
      <p>Загрузка миссии...</p>
    </div>
    
    <div class="error-state" v-else-if="error">
      <p>{{ error }}</p>
      <button class="retry-button" @click="$router.push(campaignRoute)">Назад к кампании</button>
    </div>
    
    <template v-else-if="mission && activeWave">
      <!-- Mission Header -->
      <header class="mission-header">
        <h1 class="mission-title">{{ mission.title }}</h1>
        <p v-if="mission.description" class="mission-description">{{ mission.description }}</p>
      </header>
      
      <!-- Current Wave Section -->
      <section class="wave-section">
        <div class="wave-label">ТРЕНИРОВКА {{ activeWaveIndex + 1 }}</div>
        <h2 class="wave-title">{{ activeWave.title }}</h2>
        
        <div class="wave-progress">
          <div class="progress-row">
            <span class="progress-label">Урон тренировке</span>
            <span class="progress-value">{{ activeWave.wave_damage_dealt || 0 }} / {{ activeWave.wave_total_hp || totalEnemyHp }}</span>
          </div>
          <div class="wave-hp-bar">
            <div class="wave-hp-fill" :style="{ width: waveProgressPercent + '%' }"></div>
          </div>
        </div>
        
        <!-- Enemy Battlefield -->
        <div class="battlefield" v-if="activeEnemies.length > 0">
          <div
            v-for="enemy in activeEnemies"
            :key="enemy.id"
            class="enemy-card"
            :class="{
              'full': enemy.current_hp === enemy.max_hp,
              'damaged': enemy.current_hp > 0 && enemy.current_hp < enemy.max_hp,
              'defeated': enemy.is_defeated
            }"
          >
            <div class="enemy-portrait">
              <span v-if="enemy.is_defeated" class="portrait-icon">💀</span>
              <span v-else class="portrait-icon">👹</span>
            </div>
            <h3 class="enemy-name">{{ enemy.name }}</h3>
            <div class="enemy-state">{{ enemyState(enemy) }}</div>
            <div class="enemy-hp-bar">
              <div class="enemy-hp-fill" :style="{ width: enemyProgressPercent(enemy) + '%' }"></div>
              <div class="enemy-hp-lost" :style="{ width: (100 - enemyProgressPercent(enemy)) + '%', left: enemyProgressPercent(enemy) + '%' }"></div>
            </div>
            <div class="enemy-hp-text">
              <span>{{ enemy.current_hp }} / {{ enemy.max_hp }} HP</span>
              <span v-if="enemy.damage_dealt > 0" class="enemy-damage">-{{ enemy.damage_dealt }}</span>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-enemies">
          <p>В этой тренировке пока нет противников</p>
        </div>
        
        <!-- CTA -->
        <div class="cta-area">
          <button v-if="!activeWave.is_completed" class="training-btn" @click="openTraining" :disabled="!activeEnemies.length">
            <span class="cta-icon">⚔️</span>
            <span>{{ ctaLabel }}</span>
          </button>
          <button v-else class="training-btn completed" disabled>
            <span class="cta-icon">✓</span>
            <span>ТРЕНИРОВКА ЗАВЕРШЕНА</span>
          </button>
        </div>
      </section>
      
      <!-- Mission Footer -->
      <div class="mission-footer">
        <button class="back-btn" @click="$router.push(campaignRoute)">
          ← Кампания
        </button>
      </div>
      
      <!-- Wave Battle -->
      <WaveBattle
        v-if="showWaveBattle"
        :task="activeWave"
        @close="showWaveBattle = false"
        @updated="handleTrainingUpdated"
      />
    </template>
    
    <div class="empty-state" v-else-if="!loading && mission && !activeWave">
      <p>В этой миссии пока нет тренировок</p>
      <button class="back-btn" @click="$router.push(campaignRoute)">← Кампания</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { missionApi } from '../api/missionApi';
import { campaignApi } from '../api/campaignApi';
import { characterApi } from '../api/characterApi';
import { enemyApi } from '../api/enemyApi';
import Breadcrumbs from '../components/Breadcrumbs.vue';
import WaveBattle from '../components/WaveBattle.vue';

const route = useRoute();

const missionId = computed(() => route.params.id as string);
const mission = ref<any>(null);
const character = ref<any>(null);
const campaign = ref<any>(null);
const waves = ref<any[]>([]);
const activeWave = ref<any>(null);
const activeWaveIndex = ref(0);
const activeEnemies = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showWaveBattle = ref(false);

const campaignRoute = computed(() => campaign.value ? `/campaign/${campaign.value.id}/play` : '/');

const breadcrumbs = computed(() => {
  const items: any[] = [];
  if (character.value) items.push({ label: character.value.name, route: `/character/${character.value.id}` });
  if (campaign.value) items.push({ label: campaign.value.name, route: `/campaign/${campaign.value.id}` });
  items.push({ label: mission.value?.title || 'Mission', current: true });
  return items;
});

const totalEnemyHp = computed(() => activeEnemies.value.reduce((sum, e) => sum + e.max_hp, 0));

const waveProgressPercent = computed(() => {
  const total = activeWave.value?.wave_total_hp || totalEnemyHp.value;
  const damage = activeWave.value?.wave_damage_dealt || 0;
  return total > 0 ? Math.round((damage / total) * 100) : 0;
});

const enemyProgressPercent = (enemy: any) => {
  return enemy.max_hp > 0 ? Math.max(0, (enemy.current_hp / enemy.max_hp) * 100) : 100;
};

const enemyState = (enemy: any) => {
  if (enemy.is_defeated) return 'DEFEATED';
  if (enemy.damage_dealt > 0) return 'DAMAGED';
  return 'FULL HP';
};

const ctaLabel = computed(() => {
  if (!activeWave.value) return 'НАЧАТЬ ТРЕНИРОВКУ';
  if (activeWave.value.wave_damage_dealt > 0) return 'ПРОДОЛЖИТЬ ТРЕНИРОВКУ';
  return 'НАЧАТЬ ТРЕНИРОВКУ';
});

const loadMission = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const { mission: m, waves: w } = await missionApi.getMission(missionId.value);
    mission.value = m;
    waves.value = w;
    
    if (m.campaign_id) campaign.value = await campaignApi.getCampaign(m.campaign_id);
    if (m.character_id) character.value = await characterApi.getCharacter(m.character_id);
    
    const index = w.findIndex((wave: any) => !wave.is_completed);
    const currentWave = index !== -1 ? w[index] : w[0];
    activeWaveIndex.value = index !== -1 ? index : 0;
    
    if (currentWave) {
      await loadWaveDetails(currentWave.id);
    }
  } catch (err) {
    console.error('Error loading mission:', err);
    error.value = 'Ошибка загрузки миссии';
  } finally {
    loading.value = false;
  }
};

const loadWaveDetails = async (waveId: string) => {
  try {
    const response = await enemyApi.getTaskWithEnemies(waveId);
    activeWave.value = response.data.task;
    activeEnemies.value = response.data.enemies;
  } catch (err) {
    console.error('Error loading wave details:', err);
  }
};

const openTraining = () => {
  if (!activeWave.value) return;
  showWaveBattle.value = true;
};

const handleTrainingUpdated = async () => {
  showWaveBattle.value = false;
  await loadMission();
};

onMounted(() => loadMission());
watch(() => route.params.id, () => loadMission());
</script>

<style scoped>
.mission-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #143314 0%, #1a3d1a 40%, #0f2a0f 100%);
  color: #f4e4a4;
  display: flex;
  flex-direction: column;
}

.loading-state,
.error-state {
  flex: 1;
  padding: 60px 20px;
  text-align: center;
}

.mission-header {
  padding: 30px;
  text-align: center;
  border-bottom: 2px solid #8b7355;
  background: rgba(0, 0, 0, 0.3);
}

.mission-title {
  font-size: 2rem;
  margin: 0 0 10px;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
}

.mission-description {
  color: #8b7355;
  margin: 0;
  font-size: 1rem;
}

.wave-section {
  flex: 1;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.wave-label {
  text-align: center;
  color: #8b7355;
  font-size: 0.85rem;
  font-weight: bold;
  letter-spacing: 1px;
}

.wave-title {
  text-align: center;
  font-size: 1.5rem;
  margin: 0;
}

.wave-progress {
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 16px 20px;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.progress-label { font-size: 0.8rem; color: #8b7355; font-weight: bold; }
.progress-value { font-size: 1.1rem; font-weight: bold; }

.wave-hp-bar {
  width: 100%; height: 18px;
  background: rgba(0,0,0,0.5);
  border: 2px solid #8b7355;
  border-radius: 9px;
  overflow: hidden;
}
.wave-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #c9a227);
  transition: width 0.5s ease;
}

.battlefield {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  padding: 20px 0;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.enemy-card {
  position: relative;
  background: rgba(0, 0, 0, 0.35);
  border: 3px solid #8b7355;
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  transition: all 0.3s;
}

.enemy-card.full { border-color: #4caf50; }
.enemy-card.damaged { border-color: #c9a227; box-shadow: 0 0 20px rgba(201, 162, 39, 0.25); }
.enemy-card.defeated {
  border-color: #555;
  background: rgba(0, 0, 0, 0.2);
  opacity: 0.7;
}

.enemy-portrait {
  width: 100px; height: 100px;
  border-radius: 50%;
  background: rgba(74, 60, 42, 0.6);
  border: 3px solid #8b7355;
  display: flex; align-items: center; justify-content: center;
  font-size: 3.5rem;
}
.enemy-card.damaged .enemy-portrait { border-color: #c9a227; }
.enemy-card.defeated .enemy-portrait { border-color: #555; background: rgba(0,0,0,0.2); }

.enemy-name { font-size: 1.3rem; margin: 0; }
.enemy-state {
  font-size: 0.75rem;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
}

.enemy-hp-bar {
  position: relative;
  width: 100%; height: 22px;
  background: #2d2215;
  border: 2px solid #8b7355;
  border-radius: 11px;
  overflow: hidden;
}
.enemy-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.5s ease;
}
.enemy-hp-lost {
  position: absolute;
  top: 0; height: 100%;
  background: linear-gradient(90deg, #e74c3c, #c9a227);
  opacity: 0.7;
  transition: width 0.5s ease, left 0.5s ease;
}
.enemy-hp-text {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
}
.enemy-damage { color: #c9a227; font-weight: bold; }

.empty-enemies {
  text-align: center;
  color: #8b7355;
  padding: 40px;
}

.cta-area {
  text-align: center;
  padding: 20px 0;
}

.training-btn {
  min-width: 280px;
  padding: 20px 40px;
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 3px solid #f4e4a4;
  border-radius: 16px;
  color: #1a3d1a;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.training-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(201, 162, 39, 0.4);
}
.training-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.training-btn.completed {
  background: rgba(74, 60, 42, 0.6);
  border-color: #8b7355;
  color: #f4e4a4;
}

.cta-icon { font-size: 1.4rem; }

.mission-footer {
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 2px solid #8b7355;
  display: flex;
  justify-content: center;
}

.back-btn {
  padding: 12px 24px;
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 12px;
  color: #f4e4a4;
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn:hover { border-color: #c9a227; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: #8b7355;
  padding: 60px 20px;
}

.retry-button, .back-btn { font-size: 1rem; }

@media (max-width: 768px) {
  .mission-title { font-size: 1.6rem; }
  .wave-title { font-size: 1.2rem; }
  .battlefield { grid-template-columns: 1fr; }
  .enemy-portrait { width: 80px; height: 80px; font-size: 2.8rem; }
  .training-btn { min-width: 220px; padding: 16px 30px; font-size: 1rem; }
}
</style>
