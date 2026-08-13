<template>
  <div class="map-page" v-if="campaign && character">
    <header class="map-hud">
      <div class="hud-main">
        <span class="hud-char">{{ character.name }} · LVL {{ character.level || 1 }}</span>
        <span class="hud-campaign">{{ campaign.name }} · {{ campaignProgress }}%</span>
        <span class="hud-resources">⚡ 60/60 · 💎 {{ playerStore.currentPlayer?.currency ?? 0 }}</span>
      </div>
    </header>
    
    <div class="map-stage" v-if="missions.length > 0">
      <svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path :d="roadPath" class="road-road" fill="none" stroke="#3d2b1f" stroke-width="6" stroke-linecap="round" />
        <path :d="roadPath" class="road-line" fill="none" stroke="#c9a227" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 2" />
      </svg>
      
      <div class="start-label" :style="{ left: '50%', top: '90%' }">START</div>
      
      <div
        v-for="mission in mapMissions"
        :key="mission.id"
        class="mission-node"
        :class="mission.state"
        :style="mission.style"
        @click="handleMissionClick(mission)"
      >
        <div class="node-dot">
          <span v-if="mission.state === 'locked'" class="dot-lock">🔒</span>
          <span v-else-if="mission.state === 'completed'" class="dot-check">✓</span>
          <span v-else class="dot-order">{{ String(mission.order).padStart(2, '0') }}</span>
        </div>
        <div class="node-label">
          <div class="node-title">{{ mission.title }}</div>
          <div class="node-stars" v-if="mission.state === 'completed'">
            {{ missionStars(mission) }}
          </div>
          <div class="node-sub" v-else-if="mission.state === 'in-progress'">
            {{ missionProgressText(mission) }}
          </div>
          <div class="node-sub" v-else-if="mission.state === 'available'">PLAY</div>
          <div class="node-sub" v-else-if="mission.state === 'locked'">Locked</div>
        </div>
      </div>
      
      <div class="boss-node" :style="bossPosition">
        <div class="boss-dot">👹</div>
        <div class="boss-label">FINAL BOSS</div>
      </div>
    </div>
    
    <div class="empty-map" v-else>
      <p>В этой кампании нет миссий</p>
      <button class="btn" @click="goToBuilder">Открыть Builder</button>
    </div>
    
    <div class="map-footer">
      <button class="footer-btn" @click="goToBack">← Назад</button>
      <button class="footer-btn" @click="goToBuilder">⚙ Builder</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { campaignApi } from '../api/campaignApi';
import { characterApi } from '../api/characterApi';
import { missionApi } from '../api/missionApi';
import { usePlayerStore } from '../stores/playerStore';

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();

const campaignId = computed(() => route.params.id as string);
const campaign = ref<any>(null);
const character = ref<any>(null);
const missions = ref<any[]>([]);

const currentOrder = computed(() => campaign.value?.current_mission_order || 1);
const requiredMissions = computed(() => missions.value.filter(m => m.is_required !== false));
const campaignProgress = computed(() => {
  const required = requiredMissions.value;
  if (!required.length) return 0;
  const completed = required.filter(m => m.is_completed).length;
  return Math.round(completed / required.length * 100);
});

const mapPoints = computed(() => {
  const total = missions.value.length;
  const points: { x: number; y: number }[] = [{ x: 50, y: 90 }];
  
  missions.value.forEach((_, index) => {
    const even = index % 2 === 0;
    points.push({
      x: even ? 26 : 74,
      y: 80 - (index + 1) * (66 / (total + 1)),
    });
  });
  
  points.push({ x: 50, y: 12 });
  return points;
});

const roadPath = computed(() => {
  const points = mapPoints.value;
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const my = (a.y + b.y) / 2;
    d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }
  return d;
});

const mapMissions = computed(() => {
  const points = mapPoints.value;
  return missions.value.map((m, index) => {
    const p = points[index + 1];
    const state = getMissionState(m);
    return {
      ...m,
      state,
      style: {
        left: `${p.x}%`,
        top: `${p.y}%`,
      },
    };
  });
});

const bossPosition = computed(() => ({
  left: '50%',
  top: '12%',
}));

const getMissionState = (m: any) => {
  if (m.is_completed) return 'completed';
  if (m.order > currentOrder.value) return 'locked';
  const hasProgress = (m.completed_waves || 0) > 0 || (m.total_sessions || 0) > 0;
  if (hasProgress) return 'in-progress';
  return 'available';
};

const missionStars = (m: any) => {
  if (!m.waves_count) return '⭐';
  const ratio = (m.completed_waves || 0) / m.waves_count;
  if (ratio >= 1) return '⭐⭐⭐';
  if (ratio >= 0.5) return '⭐⭐';
  return '⭐';
};

const missionProgressText = (m: any) => {
  if (m.is_completed) return 'COMPLETED';
  if (m.waves_count) return `Waves ${m.completed_waves || 0}/${m.waves_count}`;
  return 'PLAY';
};

const handleMissionClick = (m: any) => {
  if (m.state === 'locked') return;
  router.push(`/mission/${m.id}`);
};

const goToBuilder = () => router.push(`/campaign/${campaignId.value}`);
const goToBack = () => router.push('/');

const loadMap = async () => {
  try {
    const { campaign: c, missions: ms } = await campaignApi.getCampaignWithMissions(campaignId.value);
    campaign.value = c;
    missions.value = ms;
    
    if (c.player_id) {
      await playerStore.fetchPlayer(c.player_id);
    }
    
    if (c.starting_character_id) {
      character.value = await characterApi.getCharacter(c.starting_character_id);
    }
    
    for (const mission of missions.value) {
      try {
        const { waves } = await missionApi.getMission(mission.id);
        mission.waves_count = waves.length;
        mission.completed_waves = waves.filter((w: any) => w.is_completed).length;
      } catch (err) {
        console.error('Error loading waves:', err);
      }
    }
  } catch (err) {
    console.error('Error loading map:', err);
  }
};

onMounted(() => loadMap());
watch(() => route.params.id, () => loadMap());
</script>

<style scoped>
.map-page {
  height: 100vh;
  background: linear-gradient(180deg, #143314 0%, #1a3d1a 40%, #0f2a0f 100%);
  color: #f4e4a4;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.map-hud {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  padding: 14px 20px;
  background: rgba(0,0,0,0.35);
  border-bottom: 2px solid #8b7355;
  z-index: 10;
}

.hud-main {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px 28px;
  background: rgba(26, 61, 26, 0.7);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 10px 28px;
  color: #f4e4a4;
  font-size: 0.95rem;
}

.hud-campaign { font-weight: bold; color: #c9a227; }
.hud-resources { color: #f1c40f; }

.map-stage {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.map-svg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
  filter: drop-shadow(0 0 8px rgba(0,0,0,0.5));
}

.road-road { opacity: 0.9; }
.road-line { opacity: 0.8; }

.start-label {
  position: absolute;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.4);
  border: 2px solid #8b7355;
  border-radius: 20px;
  padding: 8px 18px;
  font-size: 0.85rem;
  color: #8b7355;
  z-index: 1;
}

.mission-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 2;
  cursor: pointer;
  transition: all 0.2s;
}

.mission-node.locked { cursor: not-allowed; }
.mission-node:not(.locked):hover { transform: translate(-50%, -50%) scale(1.08); }

.node-dot {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: rgba(74, 60, 42, 0.9);
  border: 4px solid #8b7355;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem;
  font-weight: bold;
  color: #f4e4a4;
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  transition: all 0.2s;
}

.node-label {
  text-align: center;
  max-width: 180px;
}

.node-title {
  font-size: 0.9rem;
  font-weight: bold;
  color: #f4e4a4;
  text-shadow: 0 2px 4px rgba(0,0,0,0.6);
  white-space: nowrap;
}

.node-stars { font-size: 0.85rem; color: #f1c40f; }
.node-sub { font-size: 0.7rem; color: #8b7355; }

.mission-node.in-progress .node-dot {
  border-color: #2ecc71;
  background: rgba(46, 204, 113, 0.15);
  box-shadow: 0 0 25px rgba(46, 204, 113, 0.6);
  animation: node-pulse 1.6s infinite;
}

.mission-node.available .node-dot {
  border-color: #f1c40f;
  background: rgba(241, 196, 15, 0.15);
  box-shadow: 0 0 25px rgba(241, 196, 15, 0.7);
  animation: node-pulse 2s infinite;
}

.mission-node.completed .node-dot {
  border-color: #f1c40f;
  background: rgba(241, 196, 15, 0.2);
  box-shadow: 0 0 20px rgba(241, 196, 15, 0.4);
}

.mission-node.locked .node-dot {
  opacity: 0.45;
  border-color: #6c7a89;
  background: rgba(108, 122, 137, 0.15);
}

.boss-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center;
  gap: 6px;
  z-index: 2;
}

.boss-dot {
  width: 88px; height: 88px;
  border-radius: 50%;
  background: rgba(231, 76, 60, 0.2);
  border: 4px solid #e74c3c;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.6rem;
  box-shadow: 0 0 30px rgba(231, 76, 60, 0.5);
  animation: boss-glow 2s infinite;
}

.boss-label {
  font-size: 0.8rem;
  font-weight: bold;
  color: #e74c3c;
  text-shadow: 0 2px 4px rgba(0,0,0,0.6);
}

.map-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0,0,0,0.35);
  border-top: 2px solid #8b7355;
}

.footer-btn {
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 10px;
  padding: 8px 18px;
  color: #f4e4a4;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.footer-btn:hover { border-color: #c9a227; }

.empty-map {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px;
  padding: 60px 20px;
  color: #8b7355;
}

.btn {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  border-radius: 10px;
  padding: 12px 24px;
  color: #1a3d1a;
  font-weight: bold;
  cursor: pointer;
}

@keyframes node-pulse {
  0% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.5); }
  50% { box-shadow: 0 0 35px rgba(46, 204, 113, 0.85); }
  100% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.5); }
}

@keyframes boss-glow {
  0% { box-shadow: 0 0 20px rgba(231, 76, 60, 0.5); }
  50% { box-shadow: 0 0 40px rgba(231, 76, 60, 0.8); }
  100% { box-shadow: 0 0 20px rgba(231, 76, 60, 0.5); }
}

@media (max-width: 768px) {
  .hud-main { flex-direction: column; gap: 4px; padding: 10px 16px; }
  .node-dot { width: 56px; height: 56px; font-size: 1.1rem; }
  .boss-dot { width: 68px; height: 68px; font-size: 2rem; }
  .node-title { font-size: 0.75rem; }
}
</style>
