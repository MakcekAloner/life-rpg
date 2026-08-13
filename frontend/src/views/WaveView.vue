<template>
  <div class="wave-page">
    <Breadcrumbs :custom="breadcrumbs" />
    
    <div class="loading-state" v-if="loading">
      <p>Загрузка волны...</p>
    </div>
    
    <div class="error-state" v-else-if="error">
      <p>{{ error }}</p>
    </div>
    
    <template v-else-if="wave">
      <header class="page-header">
        <h1 class="page-title">{{ wave.title }}</h1>
        <p v-if="wave.description" class="page-description">{{ wave.description }}</p>
        <div class="wave-total-hp">
          <span class="total-label">TOTAL HP</span>
          <span class="total-value">{{ wave.wave_total_hp || totalEnemyHp }}</span>
        </div>
      </header>
      
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">👾 Enemies</h2>
          <button class="btn-add" @click="showWaveBattle = true" v-if="!wave.is_completed">
            ⚔️ В бой
          </button>
        </div>
        
        <div class="enemies-list" v-if="enemies.length > 0">
          <div 
            v-for="enemy in enemies" 
            :key="enemy.id"
            class="enemy-card"
            :class="enemy.status"
          >
            <div class="enemy-name">{{ enemy.name }}</div>
            <div class="enemy-hp-bar">
              <div class="enemy-hp-fill" :style="{ width: enemyHpPercent(enemy) + '%' }"></div>
            </div>
            <div class="enemy-hp-text">
              {{ enemy.current_hp }} / {{ enemy.max_hp }} HP
              <span v-if="enemy.damage_dealt > 0" class="damage-dealt">{{ enemy.damage_dealt }} DAMAGE</span>
            </div>
          </div>
        </div>
      </section>
      
      <WaveBattle 
        v-if="showWaveBattle" 
        :task="wave" 
        @close="showWaveBattle = false"
        @updated="handleWaveUpdated"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { enemyApi } from '../api/enemyApi';
import { questApi } from '../api/questApi';
import { missionApi } from '../api/missionApi';
import { campaignApi } from '../api/campaignApi';
import { characterApi } from '../api/characterApi';
import Breadcrumbs from '../components/Breadcrumbs.vue';
import WaveBattle from '../components/WaveBattle.vue';

const route = useRoute();
const waveId = computed(() => route.params.id as string);

const wave = ref<any>(null);
const enemies = ref<any[]>([]);
const mission = ref<any>(null);
const campaign = ref<any>(null);
const character = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showWaveBattle = ref(false);

const totalEnemyHp = computed(() => enemies.value.reduce((sum, e) => sum + e.max_hp, 0));

const breadcrumbs = computed(() => {
  const items: any[] = [];
  if (character.value) items.push({ label: character.value.name, route: `/character/${character.value.id}` });
  if (campaign.value) items.push({ label: campaign.value.name, route: `/campaign/${campaign.value.id}` });
  if (mission.value) items.push({ label: mission.value.title, route: `/mission/${mission.value.id}` });
  items.push({ label: wave.value?.title || 'Wave', current: true });
  return items;
});

const enemyHpPercent = (enemy: any) => {
  return enemy.max_hp > 0 ? (enemy.current_hp / enemy.max_hp) * 100 : 100;
};

const loadWave = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await enemyApi.getTaskWithEnemies(waveId.value);
    wave.value = response.data.task;
    enemies.value = response.data.enemies;
    
    if (wave.value.quest_id) {
      const missionResult = await fetchMissionFromQuest(wave.value.quest_id);
      if (missionResult) {
        mission.value = missionResult;
        const campaignResult = await campaignApi.getCampaign(mission.value.campaign_id);
        campaign.value = campaignResult;
        character.value = await characterApi.getCharacter(mission.value.character_id);
      }
    }
  } catch (err) {
    console.error('Error loading wave:', err);
    error.value = 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
};

const fetchMissionFromQuest = async (questId: string) => {
  try {
    const quest = await questApi.getQuest(questId);
    const missionResponse = await missionApi.getMission(quest.mission_id);
    return missionResponse.mission;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const handleWaveUpdated = async () => {
  await loadWave();
};

onMounted(() => loadWave());
watch(() => route.params.id, () => loadWave());
</script>

<style scoped>
.wave-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a3d1a 0%, #0f2a0f 100%);
  color: #f4e4a4;
}

.loading-state, .error-state { padding: 60px 20px; text-align: center; }
.page-header { padding: 40px 30px; text-align: center; background: rgba(0,0,0,0.3); border-bottom: 2px solid #8b7355; }
.page-title { font-size: 2rem; margin: 0 0 10px; }
.page-description { color: #8b7355; margin: 0 0 15px; }
.wave-total-hp { display: inline-block; padding: 10px 20px; background: rgba(0,0,0,0.3); border-radius: 10px; }
.total-label { font-size: 0.7rem; color: #8b7355; display: block; }
.total-value { font-size: 1.3rem; font-weight: bold; color: #f4e4a4; }

.content-section { max-width: 900px; margin: 0 auto; padding: 30px 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.section-title { font-size: 1.4rem; margin: 0; }

.btn-add {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4; border-radius: 10px; padding: 12px 25px;
  color: #f4e4a4; font-weight: bold; cursor: pointer;
}
.btn-add:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(201,162,39,0.4); }

.enemies-list { display: flex; flex-direction: column; gap: 15px; }
.enemy-card {
  background: rgba(74,60,42,0.4);
  border: 2px solid #8b7355;
  border-radius: 12px;
  padding: 20px;
}
.enemy-name { font-size: 1.2rem; margin: 0 0 10px; }
.enemy-hp-bar {
  width: 100%; height: 12px;
  background: #2d2215;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #8b7355;
  margin-bottom: 8px;
}
.enemy-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.5s;
}
.enemy-hp-text {
  display: flex; justify-content: space-between;
  font-size: 0.9rem;
}
.damage-dealt { color: #c9a227; font-weight: bold; }
</style>