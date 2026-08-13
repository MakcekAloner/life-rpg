<template>
  <div class="character-page">
    <Breadcrumbs :custom="breadcrumbs" />
    
    <div class="loading-state" v-if="loading">
      <p>Загрузка персонажа...</p>
    </div>
    
    <div class="error-state" v-else-if="error">
      <p>{{ error }}</p>
      <button class="retry-button" @click="$router.go(-1)">Назад</button>
    </div>
    
    <template v-else-if="character">
      <header class="page-header">
        <div class="character-identity">
          <div class="avatar">{{ character.name.charAt(0) }}</div>
          <div class="character-info">
            <h1 class="page-title">{{ character.name }}</h1>
            <p class="character-title">{{ character.title }}</p>
            <p v-if="character.description" class="character-description">{{ character.description }}</p>
          </div>
        </div>
      </header>
      
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">🎯 Campaigns</h2>
        </div>
        
        <div class="campaigns-list" v-if="campaigns.length > 0">
          <div 
            v-for="campaign in campaigns" 
            :key="campaign.id"
            class="campaign-card"
            @click="openCampaign(campaign)"
          >
            <div class="campaign-icon">🗺️</div>
            <div class="campaign-info">
              <h3 class="campaign-name">{{ campaign.name }}</h3>
              <p v-if="campaign.description" class="campaign-description">{{ campaign.description }}</p>
              <div class="campaign-category">{{ campaign.category }}</div>
            </div>
            <div class="campaign-arrow">→</div>
          </div>
        </div>
        
        <div class="empty-state" v-else>
          <p>У этого персонажа пока нет кампаний</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { characterApi } from '../api/characterApi';
import { campaignApi } from '../api/campaignApi';
import Breadcrumbs from '../components/Breadcrumbs.vue';

const route = useRoute();
const router = useRouter();

const characterId = computed(() => route.params.id as string);
const character = ref<any>(null);
const campaigns = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const breadcrumbs = computed(() => [
  { label: character.value?.name || 'Персонаж', current: true }
]);

const loadCharacter = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    character.value = await characterApi.getCharacter(characterId.value);
    const allCampaigns = await campaignApi.getCampaigns(character.value.player_id);
    campaigns.value = allCampaigns.filter(
      (c: any) => c.starting_character_id === character.value.id || true
    );
  } catch (err) {
    console.error('Error loading character:', err);
    error.value = 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
};

const openCampaign = (campaign: any) => {
  router.push(`/campaign/${campaign.id}`);
};

onMounted(() => loadCharacter());
watch(() => route.params.id, () => loadCharacter());
</script>

<style scoped>
.character-page {
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
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 2px solid #8b7355;
}

.character-identity {
  display: flex;
  align-items: center;
  gap: 25px;
  max-width: 900px;
  margin: 0 auto;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a227, #8b7355);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: #1a3d1a;
  border: 4px solid #f4e4a4;
}

.character-info { flex: 1; }
.page-title { font-size: 2rem; margin: 0; }
.character-title { color: #c9a227; margin: 5px 0; }
.character-description { color: #8b7355; margin: 0; }

.content-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px 20px;
}

.section-header { margin-bottom: 25px; }
.section-title { font-size: 1.4rem; color: #f4e4a4; margin: 0; }

.campaigns-list { display: flex; flex-direction: column; gap: 15px; }
.campaign-card {
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
.campaign-card:hover { border-color: #c9a227; transform: translateX(5px); }
.campaign-icon { font-size: 2rem; }
.campaign-info { flex: 1; }
.campaign-name { font-size: 1.3rem; margin: 0 0 5px; }
.campaign-description { color: #8b7355; margin: 0 0 8px; font-size: 0.9rem; }
.campaign-category {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
  font-size: 0.8rem;
  color: #c9a227;
}
.campaign-arrow { font-size: 1.5rem; color: #8b7355; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #8b7355;
}
</style>