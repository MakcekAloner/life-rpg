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
          <h2 class="section-title">🎯 Missions</h2>
          <button class="btn-add" @click="showAddMission = true">
            + Добавить Mission
          </button>
        </div>
        
        <div class="missions-list" v-if="missions.length > 0">
          <div 
            v-for="mission in orderedMissions" 
            :key="mission.id"
            class="mission-card"
            :class="{ completed: mission.is_completed }"
            @click="openMission(mission)"
          >
            <div class="mission-order">{{ mission.order }}</div>
            <div class="mission-info">
              <h3 class="mission-title">{{ mission.title }}</h3>
              <p v-if="mission.description" class="mission-description">{{ mission.description }}</p>
            </div>
            <div class="mission-arrow">→</div>
          </div>
        </div>
        
        <div class="empty-state" v-else>
          <p>В этой кампании пока нет Missions</p>
          <button class="btn-add" @click="showAddMission = true">+ Добавить Mission</button>
        </div>
      </section>
      
      <div v-if="showAddMission" class="modal-overlay" @click.self="showAddMission = false">
        <AddMissionForm
          :campaign="campaign"
          :character="character"
          @mission-created="onMissionCreated"
          @cancel="showAddMission = false"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { campaignApi } from '../api/campaignApi';
import { characterApi } from '../api/characterApi';
import Breadcrumbs from '../components/Breadcrumbs.vue';
import AddMissionForm from '../components/AddMissionForm.vue';

const route = useRoute();
const router = useRouter();

const campaignId = computed(() => route.params.id as string);
const campaign = ref<any>(null);
const character = ref<any>(null);
const missions = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showAddMission = ref(false);

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

const openMission = (mission: any) => {
  router.push(`/mission/${mission.id}`);
};

const onMissionCreated = async () => {
  showAddMission.value = false;
  await loadCampaign();
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

.section-title { font-size: 1.4rem; margin: 0; }

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
.btn-add:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(201,162,39,0.4); }

.missions-list { display: flex; flex-direction: column; gap: 15px; }
.mission-card {
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
.mission-card:hover { border-color: #c9a227; transform: translateX(5px); }
.mission-card.completed { opacity: 0.7; }
.mission-order {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a227, #8b7355);
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; color: #1a3d1a;
}
.mission-info { flex: 1; }
.mission-title { font-size: 1.2rem; margin: 0 0 5px; }
.mission-description { color: #8b7355; margin: 0; font-size: 0.9rem; }
.mission-arrow { font-size: 1.5rem; color: #8b7355; }

.empty-state { text-align: center; padding: 60px 20px; color: #8b7355; }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000; padding: 20px; overflow-y: auto;
}
</style>