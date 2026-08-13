<template>
  <div class="map-page">
    <header class="map-header" v-if="campaign && character">
      <div class="header-left">
        <div class="character-thumb">{{ characterEmoji }}</div>
        <div class="character-info">
          <div class="character-name">{{ character.name }}</div>
          <div class="character-level">LVL {{ character.level || 1 }}</div>
        </div>
      </div>
      <div class="header-center">
        <div class="campaign-name">{{ campaign.name }}</div>
        <div class="campaign-meta">Campaign progress {{ campaignProgress }}%</div>
      </div>
      <div class="header-right">
        <div class="stars">⭐ {{ stars }}</div>
      </div>
    </header>
    
    <div class="map-container" v-if="missions.length > 0">
      <svg class="map-path" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline :points="pathPoints" fill="none" stroke="#8b7355" stroke-width="1.5" stroke-dasharray="4 3" />
        <polyline :points="traveledPoints" fill="none" stroke="#c9a227" stroke-width="2" />
      </svg>
      
      <div class="map-start" :style="startPosition">START</div>
      
      <div
        v-for="mission in mapMissions"
        :key="mission.id"
        class="mission-node"
        :class="mission.state"
        :style="mission.style"
        @click="handleMissionClick(mission)"
      >
        <div class="node-connector"></div>
        <div class="node-badge">{{ String(mission.order).padStart(2, '0') }}</div>
        <div class="node-content">
          <div class="node-title">{{ mission.title }}</div>
          <div class="node-status" v-if="mission.state === 'in-progress'">{{ missionProgressText(mission) }}</div>
          <div class="node-stars" v-else-if="mission.state === 'completed'">
            {{ missionStars() }}
          </div>
          <div class="node-lock" v-else-if="mission.state === 'locked'">🔒</div>
        </div>
      </div>
      
      <div class="boss-node" :style="bossPosition" v-if="showBoss">
        <div class="boss-icon">👹</div>
        <div class="boss-label">FINAL BOSS</div>
      </div>
    </div>
    
    <div class="empty-map" v-else>
      <p>В этой кампании нет миссий</p>
      <button class="btn" @click="goToBuilder">Открыть Builder</button>
    </div>
    
    <div class="map-footer">
      <button class="footer-btn" @click="goToCharacter">Персонаж</button>
      <button class="footer-btn" @click="goToBuilder">Редактор</button>
      <button class="footer-btn" @click="goToDashboard">Дашборд</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { campaignApi } from '../api/campaignApi';
import { characterApi } from '../api/characterApi';
import { missionApi } from '../api/missionApi';

const route = useRoute();
const router = useRouter();

const campaignId = computed(() => route.params.id as string);
const campaign = ref<any>(null);
const character = ref<any>(null);
const missions = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const characterEmoji = computed(() => {
  const form = character.value?.current_form || 'starting';
  switch (form) {
    case 'weak': return '🥴';
    case 'rookie': return '🙂';
    case 'fighter': return '💪';
    case 'elite': return '🔥';
    case 'legendary': return '👑';
    default: return '😐';
  }
});

const currentOrder = computed(() => campaign.value?.current_mission_order || 1);
const campaignProgress = computed(() => {
  if (!missions.value.length) return 0;
  const completed = missions.value.filter(m => m.is_completed).length;
  return Math.round(completed / missions.value.length * 100);
});

const stars = computed(() => {
  return missions.value.filter(m => m.is_completed).length * 3;
});

const showBoss = computed(() => missions.value.length > 0);

const mapMissions = computed(() => {
  const total = missions.value.length;
  return missions.value.map((m, index) => {
    const row = index;
    const even = row % 2 === 0;
    const x = even ? 22 : 78;
    const y = (index + 1) * (85 / (total + 1));
    const state = getMissionState(m);
    return {
      ...m,
      state,
      style: {
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      },
    };
  });
});

const getMissionState = (m: any) => {
  if (m.is_completed) return 'completed';
  if (m.order <= currentOrder.value) return 'in-progress';
  return 'locked';
};

const pathPoints = computed(() => {
  const total = missions.value.length;
  if (total === 0) return '';
  const points: string[] = ['50,92'];
  missions.value.forEach((_, index) => {
    const even = index % 2 === 0;
    const x = even ? 22 : 78;
    const y = (index + 1) * (85 / (total + 1));
    points.push(`${x},${y}`);
  });
  const lastEven = (total - 1) % 2 === 0;
  const bossX = lastEven ? 78 : 22;
  points.push(`${bossX},8`);
  return points.join(' ');
});

const traveledPoints = computed(() => {
  const total = missions.value.length;
  if (total === 0) return '';
  const current = currentOrder.value;
  const points: string[] = ['50,92'];
  missions.value.forEach((m, index) => {
    if (m.order > current && !m.is_completed) return;
    const even = index % 2 === 0;
    const x = even ? 22 : 78;
    const y = (index + 1) * (85 / (total + 1));
    points.push(`${x},${y}`);
  });
  if (points.length <= 1) return '';
  return points.join(' ');
});

const startPosition = computed(() => ({ left: '50%', top: '92%' }));
const bossPosition = computed(() => ({ left: '50%', top: '8%' }));

const missionProgressText = (m: any) => {
  if (m.waves_count) return `Waves ${m.completed_waves || 0} / ${m.waves_count}`;
  return 'AVAILABLE';
};

const missionStars = () => {
  return '⭐⭐⭐';
};

const handleMissionClick = (m: any) => {
  if (m.state === 'locked') return;
  router.push(`/mission/${m.id}`);
};

const goToBuilder = () => router.push(`/campaign/${campaignId.value}`);
const goToCharacter = () => character.value ? router.push(`/character/${character.value.id}`) : router.push('/');
const goToDashboard = () => router.push('/dashboard');

const loadMap = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const { campaign: c, missions: ms } = await campaignApi.getCampaignWithMissions(campaignId.value);
    campaign.value = c;
    missions.value = ms;
    
    if (c.starting_character_id) {
      character.value = await characterApi.getCharacter(c.starting_character_id);
    }
    
    // Load wave counts for missions
    for (const mission of missions.value) {
      try {
        const { waves } = await missionApi.getMission(mission.id);
        mission.waves_count = waves.length;
        mission.completed_waves = waves.filter((w: any) => w.is_completed).length;
      } catch (err) {
        console.error('Error loading waves for mission:', err);
      }
    }
  } catch (err) {
    console.error('Error loading campaign map:', err);
    error.value = 'Ошибка загрузки карты';
  } finally {
    loading.value = false;
  }
};

onMounted(() => loadMap());
watch(() => route.params.id, () => loadMap());
</script>

<style scoped>
.map-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a3d1a 0%, #0f2a0f 100%);
  color: #f4e4a4;
  display: flex;
  flex-direction: column;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(0,0,0,0.3);
  border-bottom: 2px solid #8b7355;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left { display: flex; align-items: center; gap: 12px; }
.character-thumb {
  width: 46px; height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a227, #8b7355);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem;
}
.character-name { font-weight: bold; }
.character-level { font-size: 0.8rem; color: #c9a227; }

.header-center { text-align: center; }
.campaign-name { font-size: 1.2rem; font-weight: bold; }
.campaign-meta { font-size: 0.8rem; color: #8b7355; }

.header-right .stars { font-size: 1.2rem; font-weight: bold; color: #f1c40f; }

.map-container {
  flex: 1;
  position: relative;
  min-height: 100vh;
  padding: 60px 20px;
  overflow-y: auto;
}

.map-path {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
}

.map-start {
  position: absolute;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.4);
  border: 2px solid #8b7355;
  border-radius: 20px;
  padding: 8px 20px;
  font-size: 0.9rem;
  color: #8b7355;
  z-index: 1;
}

.mission-node {
  position: absolute;
  width: 220px;
  background: rgba(74, 60, 42, 0.8);
  border: 3px solid #8b7355;
  border-radius: 20px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.mission-node:hover:not(.locked) {
  transform: translate(-50%, -50%) scale(1.03);
  border-color: #c9a227;
}

.node-badge {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: #1a3d1a;
  border: 2px solid #c9a227;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold;
  color: #c9a227;
  flex-shrink: 0;
}

.node-content { flex: 1; }
.node-title { font-size: 1rem; font-weight: bold; margin-bottom: 4px; }
.node-status { font-size: 0.75rem; color: #2ecc71; }
.node-stars { font-size: 0.9rem; }
.node-lock { font-size: 1.3rem; }

.mission-node.in-progress {
  border-color: #2ecc71;
  box-shadow: 0 0 20px rgba(46, 204, 113, 0.4);
  animation: pulse 1.5s infinite;
}

.mission-node.completed {
  border-color: #f1c40f;
  background: rgba(241, 196, 15, 0.15);
  box-shadow: 0 0 15px rgba(241, 196, 15, 0.3);
}

.mission-node.locked {
  opacity: 0.5;
  border-color: #6c7a89;
  background: rgba(108, 122, 137, 0.15);
  cursor: not-allowed;
}

.boss-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}
.boss-icon { font-size: 3.5rem; }
.boss-label {
  background: rgba(231, 76, 60, 0.2);
  border: 2px solid #e74c3c;
  border-radius: 12px;
  padding: 6px 16px;
  color: #e74c3c;
  font-weight: bold;
  font-size: 0.9rem;
}

.empty-map {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px;
  padding: 60px 20px;
  color: #8b7355;
}

.map-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: rgba(0,0,0,0.3);
  border-top: 2px solid #8b7355;
}

.footer-btn {
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 10px;
  padding: 10px 20px;
  color: #f4e4a4;
  cursor: pointer;
  transition: all 0.2s;
}
.footer-btn:hover { border-color: #c9a227; }

.btn {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  border-radius: 10px;
  padding: 12px 24px;
  color: #1a3d1a;
  font-weight: bold;
  cursor: pointer;
}

@keyframes pulse {
  0% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.4); }
  50% { box-shadow: 0 0 35px rgba(46, 204, 113, 0.7); }
  100% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.4); }
}

@media (max-width: 768px) {
  .mission-node { width: 160px; padding: 10px; }
  .node-title { font-size: 0.85rem; }
  .node-badge { width: 34px; height: 34px; font-size: 0.85rem; }
  .map-header { flex-wrap: wrap; gap: 10px; justify-content: center; }
  .header-center { order: -1; width: 100%; }
}
</style>
