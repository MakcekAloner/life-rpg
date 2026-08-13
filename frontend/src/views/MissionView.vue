<template>
  <div class="mission-page">
    <Breadcrumbs :custom="breadcrumbs" />
    
    <div class="loading-state" v-if="loading">
      <div class="loading-spinner"></div>
      <p>Загрузка миссии...</p>
    </div>
    
    <div class="error-state" v-else-if="error">
      <p>{{ error }}</p>
      <button class="retry-button" @click="$router.go(-1)">Назад</button>
    </div>
    
    <template v-else-if="mission">
      <header class="page-header">
        <h1 class="page-title">{{ mission.title }}</h1>
        <p v-if="mission.description" class="page-description">{{ mission.description }}</p>
      </header>
      
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">🌊 Waves</h2>
          <button class="btn-add" @click="showAddWave = true">
            + Добавить Wave
          </button>
        </div>
        
        <div class="waves-list" v-if="waves.length > 0">
          <div 
            v-for="(wave, index) in waves" 
            :key="wave.id"
            class="wave-card"
            :class="{ completed: wave.is_completed }"
            @click="openWave(wave)"
          >
            <div class="wave-number">#{{ index + 1 }}</div>
            <div class="wave-info">
              <h3 class="wave-title">{{ wave.title }}</h3>
              <p v-if="wave.description" class="wave-description">{{ wave.description }}</p>
              <div class="wave-meta">
                <span v-if="wave.is_completed" class="status-badge" :class="wave.wave_status">
                  {{ waveStatusLabel(wave.wave_status) }}
                </span>
                <span v-else class="status-badge active">Active</span>
                <span class="hp-badge">{{ wave.wave_damage_dealt || 0 }} / {{ wave.wave_total_hp || 0 }} HP</span>
              </div>
            </div>
            <div class="wave-arrow">→</div>
          </div>
        </div>
        
        <div class="empty-state" v-else>
          <p>В этой миссии пока нет Waves</p>
          <button class="btn-add" @click="showAddWave = true">+ Добавить Wave</button>
        </div>
      </section>
      
      <div v-if="showAddWave" class="modal-overlay" @click.self="showAddWave = false">
        <AddWaveForm
          :mission="mission"
          :character="character"
          :campaign="campaign"
          @wave-created="onWaveCreated"
          @cancel="showAddWave = false"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { missionApi } from '../api/missionApi';
import { campaignApi } from '../api/campaignApi';
import { characterApi } from '../api/characterApi';
import Breadcrumbs from '../components/Breadcrumbs.vue';
import AddWaveForm from '../components/AddWaveForm.vue';

const route = useRoute();
const router = useRouter();

const missionId = computed(() => route.params.id as string);
const mission = ref<any>(null);
const character = ref<any>(null);
const campaign = ref<any>(null);
const waves = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showAddWave = ref(false);

const breadcrumbs = computed(() => {
  const items: any[] = [];
  if (character.value) {
    items.push({ label: character.value.name, route: `/character/${character.value.id}` });
  }
  if (campaign.value) {
    items.push({ label: campaign.value.name, route: `/campaign/${campaign.value.id}` });
  }
  items.push({ label: mission.value?.title || 'Mission', current: true });
  return items;
});

const loadMission = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const { mission: m, waves: w } = await missionApi.getMission(missionId.value);
    mission.value = m;
    waves.value = w;
    
    // Load campaign and character
    if (m.campaign_id) {
      campaign.value = await campaignApi.getCampaign(m.campaign_id);
    }
    if (m.character_id) {
      character.value = await characterApi.getCharacter(m.character_id);
    }
  } catch (err) {
    console.error('Error loading mission:', err);
    error.value = 'Ошибка загрузки миссии';
  } finally {
    loading.value = false;
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

const openWave = (wave: any) => {
  router.push(`/wave/${wave.id}`);
};

const onWaveCreated = async () => {
  showAddWave.value = false;
  await loadMission();
};

onMounted(() => {
  loadMission();
});

watch(() => route.params.id, () => {
  loadMission();
});
</script>

<style scoped>
.mission-page {
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
  padding: 30px;
  text-align: center;
  border-bottom: 2px solid #8b7355;
  background: rgba(0, 0, 0, 0.3);
}

.page-title {
  font-size: 2rem;
  margin: 0 0 10px;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
}

.page-description {
  color: #8b7355;
  margin: 0;
}

.content-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.section-title {
  font-size: 1.4rem;
  color: #f4e4a4;
  margin: 0;
}

.btn-add {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  border-radius: 10px;
  padding: 12px 20px;
  color: #f4e4a4;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(201, 162, 39, 0.4);
}

.waves-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.wave-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(74, 60, 42, 0.4);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.wave-card:hover {
  border-color: #c9a227;
  transform: translateX(5px);
}

.wave-card.completed {
  opacity: 0.8;
}

.wave-number {
  font-size: 1.5rem;
  font-weight: bold;
  color: #8b7355;
  min-width: 40px;
}

.wave-info {
  flex: 1;
}

.wave-title {
  font-size: 1.2rem;
  margin: 0 0 5px;
}

.wave-description {
  color: #8b7355;
  margin: 0 0 10px;
  font-size: 0.9rem;
}

.wave-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.8rem;
}

.status-badge,
.hp-badge {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #8b7355;
}

.status-badge.active {
  background: rgba(46, 204, 113, 0.2);
  border-color: #2ecc71;
  color: #2ecc71;
}

.status-badge.missed { background: rgba(108,122,137,0.2); border-color: #6c7a89; color: #95a5a6; }
.status-badge.complete { background: rgba(201,162,39,0.2); border-color: #c9a227; color: #c9a227; }
.status-badge.perfect_clear { background: rgba(46,204,113,0.2); border-color: #2ecc71; color: #2ecc71; }

.wave-arrow {
  font-size: 1.5rem;
  color: #8b7355;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #8b7355;
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}
</style>