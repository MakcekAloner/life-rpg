<template>
  <div class="campaign-page">
    <Breadcrumbs :custom="breadcrumbs" />
    
    <div class="loading-state" v-if="loading">
      <p>Загрузка кампании...</p>
    </div>
    
    <div class="error-state" v-else-if="error">
      <p>{{ error }}</p>
      <button class="retry-button" @click="$router.go(-1)">Назад</button>
    </div>
    
    <template v-else-if="campaign">
      <header class="page-header">
        <h1 class="page-title">{{ campaign.name }}</h1>
        <p v-if="campaign.description" class="page-description">{{ campaign.description }}</p>
        <div class="campaign-category">{{ campaign.category }}</div>
      </header>
      
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">🎯 Campaign Builder</h2>
        </div>
        
        <div class="missions-list" v-if="missions.length > 0">
          <div 
            v-for="mission in orderedMissions" 
            :key="mission.id"
            class="mission-card"
            :class="{ expanded: expandedMissions[mission.id] }"
          >
            <div class="mission-header" @click="toggleMission(mission)">
              <span class="mission-toggle">{{ expandedMissions[mission.id] ? '▾' : '▸' }}</span>
              <span class="mission-order">{{ String(mission.order).padStart(2, '0') }}</span>
              <span class="mission-title">{{ mission.title }}</span>
              <span class="mission-count">{{ (missionWaves[mission.id] || []).length }} Waves</span>
              <button 
                class="btn-icon" 
                @click.stop="addingWaveForMissionId = mission.id"
                title="Добавить Wave"
              >+ Wave</button>
            </div>
            
            <div class="mission-body" v-if="expandedMissions[mission.id]" @click.stop>
              <p v-if="mission.description" class="mission-description">{{ mission.description }}</p>
              
              <div class="waves-list" v-if="(missionWaves[mission.id] || []).length > 0">
                <div 
                  v-for="(wave, index) in missionWaves[mission.id]" 
                  :key="wave.id"
                  class="wave-card"
                  :class="{ expanded: expandedWaves[wave.id] }"
                >
                  <div class="wave-header" @click="toggleWave(wave)">
                    <span class="wave-toggle">{{ expandedWaves[wave.id] ? '▾' : '▸' }}</span>
                    <span class="wave-number">Wave {{ index + 1 }}</span>
                    <span class="wave-title">{{ wave.title }}</span>
                    <span class="wave-hp">{{ wave.wave_total_hp || 0 }} HP</span>
                    <span v-if="wave.is_completed" class="wave-status" :class="wave.wave_status">
                      {{ waveStatusLabel(wave.wave_status) }}
                    </span>
                    <span v-else class="wave-status active">Active</span>
                  </div>
                  
                  <div class="wave-body" v-if="expandedWaves[wave.id]" @click.stop>
                    <div class="enemies-list" v-if="(waveEnemies[wave.id] || []).length > 0">
                      <div 
                        v-for="enemy in waveEnemies[wave.id]" 
                        :key="enemy.id"
                        class="enemy-row"
                      >
                        <span class="enemy-drag">≡</span>
                        <span class="enemy-name">{{ enemy.name }}</span>
                        <span class="enemy-hp">{{ enemy.max_hp }} HP</span>
                        <span class="enemy-target" v-if="enemy.measurement_type !== 'binary'">
                          {{ enemy.target_value }}{{ unitLabel(enemy.measurement_type) }}
                        </span>
                        <span class="enemy-actions">
                          <button class="icon-btn" @click="openWavePage(wave)" title="Открыть Wave">→</button>
                        </span>
                      </div>
                    </div>
                    
                    <div class="enemies-empty" v-else>
                      <p>Нет противников</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="waves-empty" v-else>
                <p>В этой миссии пока нет Waves</p>
              </div>
              
              <div v-if="addingWaveForMissionId === mission.id" class="inline-wave-editor">
                <AddWaveForm
                  :mission="mission"
                  :character="character"
                  :campaign="campaign"
                  inline
                  @wave-created="onWaveCreated(mission.id)"
                  @cancel="addingWaveForMissionId = null"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div class="empty-state" v-else>
          <p>В этой кампании пока нет Missions</p>
        </div>
        
        <div class="add-mission-area">
          <button v-if="!addingMission" class="btn-add-mission" @click="startAddMission">
            + Добавить Mission
          </button>
          
          <form v-else @submit.prevent="createMission" class="inline-mission-form">
            <div class="form-row">
              <input 
                v-model="newMission.title"
                type="text" 
                class="form-input" 
                placeholder="Название Mission"
                required
                autofocus
              />
              <input 
                v-model="newMission.description"
                type="text" 
                class="form-input" 
                placeholder="Описание (опционально)"
              />
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-submit" :disabled="!newMission.title.trim()">
                Сохранить
              </button>
              <button type="button" class="btn-cancel" @click="cancelAddMission">Отмена</button>
            </div>
          </form>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { campaignApi } from '../api/campaignApi';
import { characterApi } from '../api/characterApi';
import { missionApi } from '../api/missionApi';
import { enemyApi } from '../api/enemyApi';
import Breadcrumbs from '../components/Breadcrumbs.vue';
import AddWaveForm from '../components/AddWaveForm.vue';

const route = useRoute();
const router = useRouter();

const campaignId = computed(() => route.params.id as string);
const campaign = ref<any>(null);
const character = ref<any>(null);
const missions = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const expandedMissions = ref<Record<string, boolean>>({});
const expandedWaves = ref<Record<string, boolean>>({});
const missionWaves = ref<Record<string, any[]>>({});
const waveEnemies = ref<Record<string, any[]>>({});

const addingMission = ref(false);
const addingWaveForMissionId = ref<string | null>(null);

const newMission = reactive({
  title: '',
  description: '',
  order: 1,
});

const breadcrumbs = computed(() => {
  const items: any[] = [];
  if (character.value) {
    items.push({ label: character.value.name, route: `/character/${character.value.id}` });
  }
  items.push({ label: campaign.value?.name || 'Campaign', current: true });
  return items;
});

const orderedMissions = computed(() => {
  return [...missions.value].sort((a, b) => a.order - b.order);
});

const loadCampaign = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await campaignApi.getCampaignWithMissions(campaignId.value);
    campaign.value = response.campaign;
    missions.value = response.missions;
    
    if (campaign.value.starting_character_id) {
      character.value = await characterApi.getCharacter(campaign.value.starting_character_id);
    }
  } catch (err) {
    console.error('Error loading campaign:', err);
    error.value = 'Ошибка загрузки кампании';
  } finally {
    loading.value = false;
  }
};

const loadMissionWaves = async (missionId: string) => {
  try {
    const { waves } = await missionApi.getMission(missionId);
    missionWaves.value[missionId] = waves;
  } catch (err) {
    console.error('Error loading waves:', err);
  }
};

const loadWaveEnemies = async (waveId: string) => {
  try {
    const response = await enemyApi.getEnemiesByTask(waveId);
    waveEnemies.value[waveId] = response.data;
  } catch (err) {
    console.error('Error loading enemies:', err);
  }
};

const toggleMission = async (mission: any) => {
  const id = mission.id;
  expandedMissions.value[id] = !expandedMissions.value[id];
  
  if (expandedMissions.value[id] && !missionWaves.value[id]) {
    await loadMissionWaves(id);
  }
};

const toggleWave = async (wave: any) => {
  const id = wave.id;
  expandedWaves.value[id] = !expandedWaves.value[id];
  
  if (expandedWaves.value[id] && !waveEnemies.value[id]) {
    await loadWaveEnemies(id);
  }
};

const waveStatusLabel = (status: string) => {
  switch (status) {
    case 'missed': return 'MISSED';
    case 'complete': return 'COMPLETE';
    case 'perfect_clear': return 'PERFECT';
    default: return 'COMPLETE';
  }
};

const unitLabel = (type: string) => {
  switch (type) {
    case 'quantity': return ' шт.';
    case 'duration': return ' мин.';
    case 'percentage': return '%';
    case 'manual': return ' ед.';
    default: return '';
  }
};

const openWavePage = (wave: any) => {
  router.push(`/wave/${wave.id}`);
};

const onWaveCreated = (missionId: string) => async (_wave: any) => {
  addingWaveForMissionId.value = null;
  await loadMissionWaves(missionId);
};

const startAddMission = () => {
  newMission.order = missions.value.length + 1;
  addingMission.value = true;
};

const cancelAddMission = () => {
  newMission.title = '';
  newMission.description = '';
  addingMission.value = false;
};

const createMission = async () => {
  if (!newMission.title.trim()) return;
  
  try {
    await missionApi.createMission({
      campaign_id: campaign.value.id,
      character_id: character.value?.id || campaign.value.starting_character_id,
      title: newMission.title,
      description: newMission.description,
      order: newMission.order,
      difficulty: 5,
      xp_reward: 0,
      currency_reward: 0,
      success_criteria: [],
      failure_criteria: [],
      max_attempts: 3,
    });
    
    cancelAddMission();
    await loadCampaign();
  } catch (err) {
    console.error('Error creating mission:', err);
  }
};

onMounted(() => loadCampaign());
watch(() => route.params.id, () => loadCampaign());
</script>

<style scoped>
.campaign-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a3d1a 0%, #0f2a0f 100%);
  color: #f4e4a4;
}

.loading-state,
.error-state {
  padding: 60px 20px;
  text-align: center;
}

.page-header {
  padding: 40px 30px;
  text-align: center;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 2px solid #8b7355;
}

.page-title { font-size: 2rem; margin: 0 0 10px; }
.page-description { color: #8b7355; margin: 0 0 10px; }
.campaign-category {
  display: inline-block;
  padding: 5px 15px;
  background: rgba(0,0,0,0.3);
  border-radius: 10px;
  color: #c9a227;
  font-size: 0.85rem;
}

.content-section {
  max-width: 1000px;
  margin: 0 auto;
  padding: 30px 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.section-title { font-size: 1.4rem; margin: 0; color: #f4e4a4; }

.missions-list { display: flex; flex-direction: column; gap: 15px; }
.mission-card {
  background: rgba(74, 60, 42, 0.4);
  border: 2px solid #8b7355;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s;
}
.mission-card.expanded { border-color: #c9a227; }

.mission-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  cursor: pointer;
  background: rgba(0,0,0,0.2);
  transition: background 0.2s;
}
.mission-header:hover { background: rgba(0,0,0,0.3); }

.mission-toggle { font-size: 1.2rem; color: #c9a227; min-width: 20px; }
.mission-order {
  font-weight: bold;
  color: #c9a227;
  min-width: 36px;
}
.mission-title { flex: 1; font-size: 1.15rem; }
.mission-count { color: #8b7355; font-size: 0.85rem; }

.btn-icon {
  background: rgba(201, 162, 39, 0.2);
  border: 1px solid #c9a227;
  border-radius: 8px;
  padding: 6px 12px;
  color: #c9a227;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-icon:hover { background: #c9a227; color: #1a3d1a; }

.mission-body {
  padding: 0 20px 20px;
  border-top: 1px solid #8b7355;
}

.mission-description { color: #8b7355; margin: 15px 0; font-size: 0.9rem; }

.waves-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; }
.wave-card {
  background: rgba(0,0,0,0.2);
  border: 1px solid #8b7355;
  border-radius: 12px;
  overflow: hidden;
}
.wave-card.expanded { border-color: #c9a227; }

.wave-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.wave-header:hover { background: rgba(255,255,255,0.03); }

.wave-toggle { color: #c9a227; min-width: 20px; }
.wave-number { color: #8b7355; font-size: 0.85rem; min-width: 70px; }
.wave-title { flex: 1; }
.wave-hp { color: #f4e4a4; font-weight: bold; }

.wave-status {
  font-size: 0.7rem;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid;
}
.wave-status.active { background: rgba(46,204,113,0.15); border-color: #2ecc71; color: #2ecc71; }
.wave-status.missed { background: rgba(108,122,137,0.15); border-color: #6c7a89; color: #95a5a6; }
.wave-status.complete { background: rgba(201,162,39,0.15); border-color: #c9a227; color: #c9a227; }
.wave-status.perfect_clear { background: rgba(46,204,113,0.25); border-color: #2ecc71; color: #2ecc71; }

.wave-body {
  padding: 0 16px 16px;
  border-top: 1px solid #4a3c2a;
}

.enemies-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.enemy-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(74, 60, 42, 0.4);
  border-radius: 10px;
}
.enemy-drag { color: #8b7355; cursor: grab; }
.enemy-name { flex: 1; }
.enemy-hp { color: #f4e4a4; font-weight: bold; }
.enemy-target { color: #8b7355; font-size: 0.85rem; }
.enemy-actions { display: flex; gap: 6px; }

.icon-btn {
  width: 28px; height: 28px;
  border-radius: 6px;
  border: 1px solid #8b7355;
  background: rgba(0,0,0,0.3);
  color: #f4e4a4;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.icon-btn:hover { border-color: #c9a227; color: #c9a227; }

.waves-empty,
.enemies-empty {
  padding: 20px;
  text-align: center;
  color: #8b7355;
  font-size: 0.9rem;
}

.inline-wave-editor {
  margin-top: 15px;
  padding: 15px;
  background: rgba(0,0,0,0.2);
  border: 1px dashed #8b7355;
  border-radius: 14px;
}

.add-mission-area {
  margin-top: 25px;
}

.btn-add-mission {
  width: 100%;
  padding: 18px;
  background: rgba(74, 60, 42, 0.4);
  border: 2px dashed #8b7355;
  border-radius: 14px;
  color: #f4e4a4;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-add-mission:hover { border-color: #c9a227; color: #c9a227; background: rgba(74, 60, 42, 0.6); }

.inline-mission-form {
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.form-input {
  flex: 1;
  min-width: 200px;
  padding: 12px 15px;
  border: 2px solid #8b7355;
  border-radius: 10px;
  background: rgba(0,0,0,0.3);
  color: #f4e4a4;
  font-size: 1rem;
}
.form-input:focus { outline: none; border-color: #c9a227; }

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.btn-submit {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  border-radius: 10px;
  padding: 12px 25px;
  color: #f4e4a4;
  font-weight: bold;
  cursor: pointer;
}
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel {
  background: rgba(74,60,42,0.6);
  border: 2px solid #8b7355;
  border-radius: 10px;
  padding: 12px 20px;
  color: #f4e4a4;
  cursor: pointer;
}
.btn-cancel:hover { border-color: #c9a227; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #8b7355;
}

@media (max-width: 768px) {
  .mission-header { flex-wrap: wrap; }
  .wave-header { flex-wrap: wrap; }
  .form-row { flex-direction: column; }
  .form-input { min-width: 0; }
}
</style>
