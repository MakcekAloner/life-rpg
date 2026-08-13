<template>
  <div class="main-screen">
    <div class="top-bar" v-if="playerStore.currentPlayer">
      <div class="player-info">
        <div class="player-avatar">🦸</div>
        <div class="player-meta">
          <div class="player-name">{{ playerStore.currentPlayer.display_name }}</div>
          <div class="player-level">LVL {{ playerStore.currentPlayer.level }}</div>
        </div>
      </div>
      <div class="resources">
        <div class="resource">
          <span class="resource-icon">⚡</span>
          <span class="resource-value">60/60</span>
        </div>
        <div class="resource">
          <span class="resource-icon">💎</span>
          <span class="resource-value">{{ playerStore.currentPlayer.currency }}</span>
        </div>
      </div>
    </div>
    
    <div class="side-menu left">
      <button class="side-btn" @click="goToDashboard">
        <span class="side-icon">📊</span>
        <span class="side-label">Dashboard</span>
      </button>
      <button class="side-btn" @click="goToBuilder">
        <span class="side-icon">⚙️</span>
        <span class="side-label">Builder</span>
      </button>
    </div>
    
    <div class="main-stage" v-if="playerStore.isLoaded">
      <div class="character-zone">
        <div class="character-avatar" :class="currentFormClass">
          {{ characterEmoji }}
        </div>
        <div class="character-name" v-if="currentCharacter">
          {{ currentCharacter.name }}
        </div>
        <div class="character-form" v-if="currentCharacter">
          {{ currentCharacter.current_form }}
        </div>
      </div>
      
      <div class="campaign-badge" v-if="activeCampaign">
        <span class="badge-label">Текущая кампания</span>
        <span class="badge-name">{{ activeCampaign.name }}</span>
        <span class="badge-progress">{{ campaignProgress }}%</span>
      </div>
      
      <button 
        class="start-button" 
        :disabled="!activeCampaign"
        @click="startCampaign"
      >
        <span class="start-label">СТАРТ</span>
      </button>
      
      <p v-if="!activeCampaign" class="no-campaign">
        Нет активной кампании. Создайте в Builder.
      </p>
    </div>
    
    <div class="side-menu right">
      <button class="side-btn" @click="goToMissions">
        <span class="side-icon">🎯</span>
        <span class="side-label">Missions</span>
      </button>
      <button class="side-btn" @click="goToCharacter">
        <span class="side-icon">🧍</span>
        <span class="side-label">Character</span>
      </button>
    </div>
    
    <div class="bottom-nav">
      <button class="nav-btn" @click="goToCharacter">
        <span class="nav-icon">🧍</span>
        <span>Персонаж</span>
      </button>
      <button class="nav-btn" @click="goToCampaignMap" :disabled="!activeCampaign">
        <span class="nav-icon">🗺️</span>
        <span>Кампания</span>
      </button>
      <button class="nav-btn" @click="goToDashboard">
        <span class="nav-icon">📊</span>
        <span>Дашборд</span>
      </button>
    </div>
    
    <div class="loading" v-if="!playerStore.isLoaded">
      <p>Загрузка профиля...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../stores/playerStore';
import { useCharacterStore } from '../stores/characterStore';
import { campaignApi } from '../api/campaignApi';

const router = useRouter();
const playerStore = usePlayerStore();
const characterStore = useCharacterStore();

const DEMO_PLAYER_ID = 'df58dfec-7ced-436d-b55e-4c20d9874d19';
const activeCampaign = ref<any>(null);

const currentCharacter = computed(() => characterStore.currentCharacter);

const currentFormClass = computed(() => {
  const form = currentCharacter.value?.current_form || 'starting';
  return `form-${form}`;
});

const characterEmoji = computed(() => {
  const form = currentCharacter.value?.current_form || 'starting';
  switch (form) {
    case 'weak': return '🥴';
    case 'rookie': return '🙂';
    case 'fighter': return '💪';
    case 'elite': return '🔥';
    case 'legendary': return '👑';
    default: return '😐';
  }
});

const campaignProgress = computed(() => {
  const c = activeCampaign.value;
  if (!c || !c.total_missions || !c.current_mission_order) return 0;
  return Math.min(100, Math.round((c.current_mission_order - 1) / c.total_missions * 100));
});

const startCampaign = () => {
  if (activeCampaign.value) {
    router.push(`/campaign/${activeCampaign.value.id}/play`);
  }
};

const goToDashboard = () => router.push('/dashboard');
const goToBuilder = () => activeCampaign.value ? router.push(`/campaign/${activeCampaign.value.id}`) : router.push('/dashboard');
const goToMissions = () => router.push('/dashboard');
const goToCharacter = () => currentCharacter.value ? router.push(`/character/${currentCharacter.value.id}`) : router.push('/dashboard');
const goToCampaignMap = () => activeCampaign.value ? router.push(`/campaign/${activeCampaign.value.id}/play`) : null;

onMounted(async () => {
  try {
    await playerStore.fetchPlayer(DEMO_PLAYER_ID);
    await playerStore.fetchPlayerStats(DEMO_PLAYER_ID);
    
    if (playerStore.currentPlayer) {
      await characterStore.fetchCharacters(playerStore.currentPlayer.id);
      if (characterStore.characters.length > 0) {
        characterStore.setCurrentCharacter(characterStore.characters[0]);
      }
      
      const campaigns = await campaignApi.getCampaigns(playerStore.currentPlayer.id);
      if (campaigns.length > 0) {
        activeCampaign.value = campaigns[0];
      }
    }
  } catch (error) {
    console.log('Main screen load error:', error);
  }
});
</script>

<style scoped>
.main-screen {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a3d1a 0%, #0f2a0f 100%);
  color: #f4e4a4;
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 80px 1fr 80px;
  grid-template-areas:
    "top top top"
    "left main right"
    "bottom bottom bottom";
  padding: 20px;
  gap: 16px;
}

.top-bar {
  grid-area: top;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 12px 20px;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a227, #8b7355);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem;
}

.player-name { font-weight: bold; font-size: 1rem; }
.player-level { font-size: 0.8rem; color: #c9a227; }

.resources { display: flex; gap: 16px; }
.resource {
  display: flex; align-items: center; gap: 6px;
  background: rgba(0,0,0,0.3);
  border-radius: 20px;
  padding: 6px 14px;
}
.resource-icon { font-size: 1.1rem; }
.resource-value { font-weight: bold; }

.side-menu {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-self: start;
  margin-top: 40px;
}

.side-menu.left { grid-area: left; }
.side-menu.right { grid-area: right; align-items: flex-end; }

.side-btn {
  width: 64px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 14px;
  padding: 12px 4px;
  color: #f4e4a4;
  cursor: pointer;
  transition: all 0.2s;
}
.side-btn:hover { border-color: #c9a227; transform: translateY(-2px); }

.side-icon { font-size: 1.4rem; }
.side-label { font-size: 0.65rem; text-align: center; }

.main-stage {
  grid-area: main;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  text-align: center;
  padding: 20px 0;
}

.character-zone { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.character-avatar {
  width: 160px; height: 160px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a3c2a, #2d2215);
  border: 6px solid #c9a227;
  display: flex; align-items: center; justify-content: center;
  font-size: 5rem;
  box-shadow: 0 0 40px rgba(201, 162, 39, 0.4);
  transition: all 0.3s;
}

.character-name { font-size: 1.6rem; font-weight: bold; }
.character-form { font-size: 1rem; color: #8b7355; }

.campaign-badge {
  background: rgba(74, 60, 42, 0.6);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 14px 30px;
  display: flex; flex-direction: column; gap: 4px;
  min-width: 220px;
}
.badge-label { font-size: 0.75rem; color: #8b7355; }
.badge-name { font-size: 1.1rem; font-weight: bold; color: #f4e4a4; }
.badge-progress { font-size: 0.85rem; color: #c9a227; }

.start-button {
  min-width: 240px;
  padding: 22px 50px;
  background: linear-gradient(180deg, #f1c40f, #d68910);
  border: 4px solid #f4e4a4;
  border-radius: 30px;
  color: #1a3d1a;
  font-size: 1.6rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(241, 196, 15, 0.4);
  transition: all 0.2s;
}
.start-button:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 16px 40px rgba(241, 196, 15, 0.6);
}
.start-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-campaign { color: #8b7355; font-size: 0.9rem; }

.bottom-nav {
  grid-area: bottom;
  display: flex;
  justify-content: center;
  gap: 12px;
  background: rgba(0,0,0,0.3);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 12px;
}

.nav-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 12px;
  padding: 10px 20px;
  color: #f4e4a4;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
}
.nav-btn:hover:not(:disabled) { border-color: #c9a227; }
.nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.nav-icon { font-size: 1.3rem; }

.loading { 
  grid-area: main; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: #8b7355; 
}

@media (max-width: 768px) {
  .main-screen {
    grid-template-columns: 1fr;
    grid-template-areas:
      "top"
      "main"
      "bottom";
  }
  .side-menu { display: none; }
  .character-avatar { width: 120px; height: 120px; font-size: 3.5rem; }
}
</style>
