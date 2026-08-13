<template>
  <nav v-if="showNav" class="global-nav">
    <button class="home-btn" @click="goHome">
      <span class="home-icon">🏠</span>
      <span class="home-label">Главная</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const showNav = computed(() => route.name !== 'home');

const goHome = () => {
  const isTrainingRoute = route.path.startsWith('/wave/');
  
  if (isTrainingRoute) {
    const confirmed = window.confirm(
      'У вас может быть незавершённая тренировка. Вернуться на главный экран?'
    );
    if (!confirmed) return;
  }
  
  router.push('/');
};
</script>

<style scoped>
.global-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  display: flex;
  justify-content: flex-start;
  padding: 12px 16px;
  pointer-events: none;
}

.home-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #8b7355;
  border-radius: 12px;
  padding: 8px 16px;
  color: #f4e4a4;
  font-size: 0.9rem;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.2s;
  backdrop-filter: blur(6px);
}

.home-btn:hover {
  border-color: #c9a227;
  background: rgba(0, 0, 0, 0.7);
}

.home-icon { font-size: 1.1rem; }
.home-label { font-weight: 500; }
</style>
