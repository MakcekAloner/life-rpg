<template>
  <div class="character-card" :class="{ inactive: !character.is_active }">
    <div class="card-header">
      <div class="character-avatar">
        <img v-if="character.avatar_url" :src="character.avatar_url" :alt="character.name" />
        <div v-else class="avatar-placeholder">
          {{ character.name.charAt(0).toUpperCase() }}
        </div>
      </div>
      <div class="character-level">
        LVL {{ character.level }}
      </div>
    </div>
    
    <div class="card-body">
      <h3 class="character-name">{{ character.name }}</h3>
      <p class="character-title">{{ character.title }}</p>
      <p class="character-description">{{ character.description }}</p>
      
      <div class="character-forms">
        <div class="form">
          <span class="form-label">Начальная форма:</span>
          <span class="form-value">{{ character.starting_form }}</span>
        </div>
        <div class="form">
          <span class="form-label">Текущая форма:</span>
          <span class="form-value current">{{ character.current_form }}</span>
        </div>
        <div class="form">
          <span class="form-label">Финальная форма:</span>
          <span class="form-value final">{{ character.final_form }}</span>
        </div>
      </div>
      
      <div class="character-stats">
        <div class="stat" v-for="(value, stat) in mainStats" :key="stat">
          <span class="stat-label">{{ statLabels[stat as keyof typeof statLabels] }}</span>
          <div class="stat-bar">
            <div class="stat-fill" :style="{ width: (value / 10) * 100 + '%' }"></div>
          </div>
          <span class="stat-value">{{ value }}/10</span>
        </div>
      </div>
      
      <div class="character-xp">
        <div class="xp-header">
          <span class="xp-label">XP</span>
          <span class="xp-values">{{ character.current_xp }} / {{ character.next_level_xp }}</span>
        </div>
        <div class="xp-bar">
          <div class="xp-fill" :style="{ width: xpProgress + '%' }"></div>
        </div>
      </div>
      
      <div class="character-tags" v-if="character.weaknesses.length > 0 || character.abilities.length > 0">
        <div class="tag-group" v-if="character.weaknesses.length > 0">
          <span class="tag-label">Слабости:</span>
          <div class="tags">
            <span class="tag weakness" v-for="weakness in character.weaknesses" :key="weakness">
              {{ weakness }}
            </span>
          </div>
        </div>
        <div class="tag-group" v-if="character.abilities.length > 0">
          <span class="tag-label">Способности:</span>
          <div class="tags">
            <span class="tag ability" v-for="ability in character.abilities" :key="ability">
              {{ ability }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card-footer">
      <button class="btn-view" @click="$emit('view', character.id)">
        Подробнее
      </button>
      <button class="btn-select" @click="$emit('select', character.id)" :disabled="!character.is_active">
        {{ character.is_active ? 'Выбрать' : 'Неактивен' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Character } from '../api/characterApi';

interface Props {
  character: Character;
}

const props = defineProps<Props>();

defineEmits<{
  view: [id: string];
  select: [id: string];
}>();

const xpProgress = computed(() => {
  return (props.character.current_xp / props.character.next_level_xp) * 100;
});

const mainStats = computed(() => ({
  strength: props.character.strength,
  intelligence: props.character.intelligence,
  endurance: props.character.endurance,
  charisma: props.character.charisma,
  discipline: props.character.discipline,
  creativity: props.character.creativity,
}));

const statLabels = {
  strength: 'Сила',
  intelligence: 'Интеллект',
  endurance: 'Выносливость',
  charisma: 'Харизма',
  discipline: 'Дисциплина',
  creativity: 'Креативность',
};
</script>

<style scoped>
.character-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  backdrop-filter: blur(10px);
}

.character-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

.character-card.inactive {
  opacity: 0.6;
}

.card-header {
  position: relative;
  padding: 20px;
  background: linear-gradient(135deg, rgba(243, 156, 18, 0.1), rgba(231, 76, 60, 0.1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.character-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #f39c12;
  background: linear-gradient(135deg, #2c3e50, #34495e);
}

.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: #f39c12;
}

.character-level {
  position: absolute;
  top: 20px;
  right: 20px;
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
}

.card-body {
  padding: 20px;
}

.character-name {
  font-size: 1.3rem;
  font-weight: bold;
  color: #f39c12;
  margin-bottom: 4px;
}

.character-title {
  color: #e74c3c;
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.character-description {
  color: #bdc3c7;
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 16px;
}

.character-forms {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.form {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.form:last-child {
  margin-bottom: 0;
}

.form-label {
  color: #95a5a6;
  font-size: 0.85rem;
}

.form-value {
  color: #bdc3c7;
  font-size: 0.85rem;
  font-weight: 500;
}

.form-value.current {
  color: #f39c12;
}

.form-value.final {
  color: #e74c3c;
}

.character-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  color: #95a5a6;
  font-size: 0.75rem;
}

.stat-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #e74c3c);
  transition: width 0.3s ease;
}

.stat-value {
  color: #bdc3c7;
  font-size: 0.75rem;
  text-align: right;
}

.character-xp {
  margin-bottom: 16px;
}

.xp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.xp-label {
  color: #bdc3c7;
  font-size: 0.85rem;
}

.xp-values {
  color: #f39c12;
  font-weight: bold;
  font-size: 0.85rem;
}

.xp-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #e74c3c);
  transition: width 0.3s ease;
}

.character-tags {
  margin-bottom: 16px;
}

.tag-group {
  margin-bottom: 12px;
}

.tag-group:last-child {
  margin-bottom: 0;
}

.tag-label {
  color: #95a5a6;
  font-size: 0.8rem;
  display: block;
  margin-bottom: 6px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tag.weakness {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.tag.ability {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.card-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-view,
.btn-select {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view {
  background: rgba(255, 255, 255, 0.1);
  color: #bdc3c7;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-view:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #eaeaea;
}

.btn-select {
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  color: white;
}

.btn-select:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
}

.btn-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>