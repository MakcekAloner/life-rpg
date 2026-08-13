<template>
  <div class="add-wave-form">
    <h3 class="section-title">🌊 Добавить волну</h3>
    
    <form @submit.prevent="handleSubmit" class="wave-form">
      <!-- Main Parameters -->
      <div class="form-section main-params">
        <h4 class="section-subtitle">Основные параметры</h4>
        
        <div class="form-group">
          <label class="form-label">Название Wave</label>
          <input
            v-model="formData.title"
            type="text"
            class="form-input"
            placeholder="Например: Тренировка A"
            required
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Описание (опционально)</label>
          <textarea
            v-model="formData.description"
            class="form-textarea"
            placeholder="Тяговая тренировка. Работа над базовой силой."
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-row three-cols">
          <div class="form-group">
            <label class="form-label">Персонаж</label>
            <select v-model="formData.character_id" class="form-select" required @change="onCharacterChange">
              <option value="">Выберите персонажа</option>
              <option v-for="character in activeCharacters" :key="character.id" :value="character.id">
                {{ character.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Кампания</label>
            <select v-model="formData.campaign_id" class="form-select" :disabled="!formData.character_id" @change="onCampaignChange" required>
              <option value="">Выберите кампанию</option>
              <option v-for="campaign in availableCampaigns" :key="campaign.id" :value="campaign.id">
                {{ campaign.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Миссия</label>
            <select v-model="formData.mission_id" class="form-select" :disabled="!formData.campaign_id" required>
              <option value="">Выберите миссию</option>
              <option v-for="mission in availableMissions" :key="mission.id" :value="mission.id">
                {{ mission.title }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-row two-cols">
          <div class="form-group">
            <label class="form-label">Дедлайн (опционально)</label>
            <input
              v-model="formData.deadline"
              type="datetime-local"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Сложность (1–5)</label>
            <select v-model.number="formData.difficulty" class="form-select">
              <option value="1">1 — Очень легко</option>
              <option value="2">2 — Легко</option>
              <option value="3">3 — Средне</option>
              <option value="4">4 — Сложно</option>
              <option value="5">5 — Очень сложно</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Enemies Constructor -->
      <div class="form-section enemies-section">
        <div class="enemies-header">
          <h4 class="section-subtitle">👾 Противники</h4>
          <div class="total-hp">
            <span class="total-hp-label">ОБЩИЙ HP WAVE</span>
            <span class="total-hp-value" :class="{ 'recommended': totalHp >= 90 && totalHp <= 110 }">{{ totalHp }} HP</span>
          </div>
        </div>
        
        <p class="recommendation-hint" v-if="totalHp < 80 || totalHp > 120">
          💡 Рекомендуемый размер обычной Wave: около 100 HP.
        </p>
        
        <div class="enemies-list">
          <div 
            v-for="(enemy, index) in enemies" 
            :key="enemy.tempId"
            class="enemy-card"
            :class="{ 'collapsed': enemy.collapsed }"
          >
            <div class="enemy-header-bar" @click="toggleEnemy(enemy)">
              <div class="enemy-drag-handle" @click.stop>≡</div>
              <div class="enemy-summary">
                <span class="enemy-order">#{{ index + 1 }}</span>
                <span class="enemy-name-preview">{{ enemy.name || 'Новый противник' }}</span>
                <span class="enemy-hp-preview">{{ enemy.max_hp }} HP</span>
              </div>
              <div class="enemy-actions">
                <button type="button" class="icon-btn" @click.stop="moveEnemy(index, -1)" :disabled="index === 0" title="Вверх">▲</button>
                <button type="button" class="icon-btn" @click.stop="moveEnemy(index, 1)" :disabled="index === enemies.length - 1" title="Вниз">▼</button>
                <button type="button" class="icon-btn" @click.stop="duplicateEnemy(index)" title="Дублировать">⧉</button>
                <button type="button" class="icon-btn delete" @click.stop="removeEnemy(index)" title="Удалить">×</button>
              </div>
            </div>
            
            <div class="enemy-body" v-if="!enemy.collapsed">
              <div class="form-row two-cols">
                <div class="form-group">
                  <label class="form-label">Название</label>
                  <input
                    v-model="enemy.name"
                    type="text"
                    class="form-input"
                    placeholder="Подтягивания"
                    required
                  />
                </div>
                
                <div class="form-group">
                  <label class="form-label">Max HP</label>
                  <input
                    v-model.number="enemy.max_hp"
                    type="number"
                    class="form-input"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Описание / условие (опционально)</label>
                <textarea
                  v-model="enemy.description"
                  class="form-textarea small"
                  placeholder="Рабочие подходы по тренировочной программе"
                  rows="2"
                ></textarea>
              </div>
              
              <div class="form-row two-cols">
                <div class="form-group">
                  <label class="form-label">Тип цели</label>
                  <select v-model="enemy.measurement_type" class="form-select" required>
                    <option value="binary">Выполнить / Не выполнить</option>
                    <option value="quantity">Количество</option>
                    <option value="duration">Время</option>
                    <option value="percentage">Процент</option>
                    <option value="manual">Ручной прогресс</option>
                  </select>
                </div>
                
                <div class="form-group" v-if="enemy.measurement_type !== 'binary'">
                  <label class="form-label">Цель: {{ unitLabel(enemy.measurement_type) }}</label>
                  <input
                    v-model.number="enemy.target_value"
                    type="number"
                    class="form-input"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>
              </div>
              
              <div class="enemy-hint">
                {{ typeHint(enemy.measurement_type) }}
              </div>
            </div>
          </div>
        </div>
        
        <button type="button" class="btn-add-enemy" @click="addEnemy">
          + ДОБАВИТЬ ПРОТИВНИКА
        </button>
      </div>
      
      <!-- Live Preview -->
      <div class="form-section preview-section" v-if="enemies.length > 0">
        <h4 class="section-subtitle">Предпросмотр Wave</h4>
        <div class="preview-card">
          <h5 class="preview-title">{{ formData.title || 'Новая Wave' }}</h5>
          <div class="preview-enemies">
            <div v-for="(enemy, index) in enemies" :key="enemy.tempId" class="preview-enemy">
              <span class="preview-number">#{{ index + 1 }}</span>
              <span class="preview-name">{{ enemy.name || 'Противник' }}</span>
              <span class="preview-hp">{{ enemy.max_hp }} HP</span>
            </div>
          </div>
          <div class="preview-total">
            TOTAL: {{ totalHp }} HP
          </div>
        </div>
      </div>
      
      <!-- Legacy Settings -->
      <div class="legacy-settings">
        <button type="button" class="btn-legacy" @click="showLegacy = !showLegacy">
          {{ showLegacy ? '▼' : '▶' }} Дополнительные / legacy-настройки
        </button>
        <div v-if="showLegacy" class="legacy-content">
          <div class="form-row two-cols">
            <div class="form-group">
              <label class="form-label">XP награда</label>
              <input v-model.number="formData.xp_reward" type="number" class="form-input" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Валюта</label>
              <input v-model.number="formData.currency_reward" type="number" class="form-input" min="0" />
            </div>
          </div>
          <p class="legacy-hint">XP и валюта позже будут рассчитываться автоматически.</p>
        </div>
      </div>
      
      <!-- Form Actions -->
      <div class="form-actions">
        <button type="submit" class="btn-submit" :disabled="loading || !isValid">
          {{ loading ? 'Создание...' : '✓ СОЗДАТЬ WAVE' }}
        </button>
        <button type="button" class="btn-cancel" @click="handleCancel">
          Отмена
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useCharacterStore } from '../stores/characterStore';
import { useTaskStore } from '../stores/taskStore';
import { campaignApi } from '../api/campaignApi';
import { enemyApi } from '../api/enemyApi';
import { questApi } from '../api/questApi';
import { v4 as uuidv4 } from 'uuid';

const characterStore = useCharacterStore();
const taskStore = useTaskStore();

const emit = defineEmits<{
  'add-wave': [wave: any];
  cancel: [];
}>();

const loading = ref(false);
const showLegacy = ref(false);
const activeCharacters = ref<any[]>([]);
const campaignsByCharacter = ref<Record<string, any[]>>({});
const missionsByCampaign = ref<Record<string, any[]>>({});

const formData = reactive({
  title: '',
  description: '',
  character_id: '',
  campaign_id: '',
  mission_id: '',
  quest_id: '',
  difficulty: 3,
  xp_reward: 0,
  currency_reward: 0,
  deadline: '',
});

const enemies = ref<any[]>([]);

type MeasurementType = 'binary' | 'quantity' | 'duration' | 'percentage' | 'manual';

const createEnemy = (): any => ({
  tempId: uuidv4(),
  name: '',
  description: '',
  max_hp: 10,
  measurement_type: 'quantity' as MeasurementType,
  target_value: 1,
  enemy_order: enemies.value.length,
  collapsed: false,
});

const addEnemy = () => {
  const newEnemy = createEnemy();
  newEnemy.enemy_order = enemies.value.length;
  enemies.value.push(newEnemy);
};

const removeEnemy = (index: number) => {
  enemies.value.splice(index, 1);
  reorderEnemies();
};

const duplicateEnemy = (index: number) => {
  const original = enemies.value[index];
  const copy = {
    ...original,
    tempId: uuidv4(),
    name: original.name ? `${original.name} (копия)` : '',
    collapsed: false,
  };
  enemies.value.splice(index + 1, 0, copy);
  reorderEnemies();
};

const moveEnemy = (index: number, direction: number) => {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= enemies.value.length) return;
  
  const temp = enemies.value[index];
  enemies.value[index] = enemies.value[newIndex];
  enemies.value[newIndex] = temp;
  reorderEnemies();
};

const toggleEnemy = (enemy: any) => {
  enemy.collapsed = !enemy.collapsed;
};

const reorderEnemies = () => {
  enemies.value.forEach((enemy, index) => {
    enemy.enemy_order = index;
  });
};

const unitLabel = (type: MeasurementType) => {
  switch (type) {
    case 'quantity': return 'шт.';
    case 'duration': return 'мин.';
    case 'percentage': return '%';
    case 'manual': return 'ед.';
    default: return '';
  }
};

const typeHint = (type: MeasurementType) => {
  switch (type) {
    case 'binary': return 'Отметь 1, если действие выполнено. 0 — если нет.';
    case 'quantity': return 'Сколько раз/подходов из целевого количества.';
    case 'duration': return 'Сколько минут из целевого времени.';
    case 'percentage': return 'Какой процент от целевого значения выполнено.';
    case 'manual': return 'Произвольное числовое значение по вашему усмотрению.';
    default: return '';
  }
};

const totalHp = computed(() => {
  return enemies.value.reduce((sum, enemy) => sum + (Number(enemy.max_hp) || 0), 0);
});

const isValid = computed(() => {
  return formData.title.trim() !== '' &&
         formData.character_id !== '' &&
         formData.campaign_id !== '' &&
         formData.mission_id !== '' &&
         enemies.value.length > 0 &&
         enemies.value.every(e => e.name.trim() !== '' && e.max_hp > 0);
});

const availableCampaigns = computed(() => {
  if (!formData.character_id) return [];
  return campaignsByCharacter.value[formData.character_id] || [];
});

const availableMissions = computed(() => {
  if (!formData.campaign_id) return [];
  return missionsByCampaign.value[formData.campaign_id] || [];
});

// Find quest_id for selected mission
watch(() => formData.mission_id, async (newMissionId) => {
  if (!newMissionId) {
    formData.quest_id = '';
    return;
  }
  
  // Find first quest for this mission, or create fallback
  try {
    // We need to get quests for the mission. For now, we'll fetch or use campaign with missions
    const response = await campaignApi.getCampaignWithMissions(formData.campaign_id);
    const mission = response.missions.find((m: any) => m.id === newMissionId);
    if (mission) {
      // Try to get or create a quest for this mission
      // For now, we will find existing quests by calling a new helper or assume first quest
      formData.quest_id = await getOrCreateQuest(newMissionId);
    }
  } catch (err) {
    console.error('Error loading mission quest:', err);
  }
});

const getOrCreateQuest = async (missionId: string): Promise<string> => {
  try {
    const quests = await questApi.getQuestsByMission(missionId);
    if (quests.length > 0) return quests[0].id;
  } catch (err) {
    console.error('Error fetching quests:', err);
  }
  
  // Create default quest if none exists
  try {
    const quest = await questApi.createQuest({
      mission_id: missionId,
      title: 'Основной Quest',
      description: 'Автоматически созданный Quest для Wave',
      order: 1,
      xp_reward: 0,
      currency_reward: 0
    });
    return quest.id;
  } catch (err) {
    console.error('Error creating quest:', err);
  }
  
  return '';
};

const onCharacterChange = async () => {
  formData.campaign_id = '';
  formData.mission_id = '';
  formData.quest_id = '';
  
  if (!formData.character_id) return;
  
  // Get player_id from character
  const character = activeCharacters.value.find(c => c.id === formData.character_id);
  if (!character || !character.player_id) return;
  
  // Load campaigns for this character's player
  try {
    const campaigns = await campaignApi.getCampaigns(character.player_id);
    // Filter campaigns starting with this character or all for player
    campaignsByCharacter.value[formData.character_id] = campaigns.filter(
      (c: any) => c.starting_character_id === formData.character_id || true
    );
  } catch (err) {
    console.error('Error loading campaigns:', err);
  }
};

const onCampaignChange = async () => {
  formData.mission_id = '';
  formData.quest_id = '';
  
  if (!formData.campaign_id) return;
  
  try {
    const response = await campaignApi.getCampaignWithMissions(formData.campaign_id);
    missionsByCampaign.value[formData.campaign_id] = response.missions;
  } catch (err) {
    console.error('Error loading missions:', err);
  }
};

onMounted(async () => {
  // Load active characters from store if available, otherwise fetch for demo player
  if (characterStore.characters.length > 0) {
    activeCharacters.value = characterStore.activeCharacters;
  } else {
    const DEMO_PLAYER_ID = 'df58dfec-7ced-436d-b55e-4c20d9874d19';
    await characterStore.fetchCharacters(DEMO_PLAYER_ID);
    activeCharacters.value = characterStore.activeCharacters;
    
    if (activeCharacters.value.length === 0) {
      activeCharacters.value = [
        {
          id: '59d73913-1f1b-41ff-b44e-9667bbaac17f',
          name: 'Дохляк',
          player_id: 'df58dfec-7ced-436d-b55e-4c20d9874d19'
        }
      ];
    }
  }
  
  // Add one default enemy
  if (enemies.value.length === 0) {
    addEnemy();
  }
});

const handleSubmit = async () => {
  if (!isValid.value) return;
  
  loading.value = true;
  
  try {
    // Create wave (task) with quest_id
    const waveData = {
      quest_id: formData.quest_id,
      character_id: formData.character_id,
      title: formData.title,
      description: formData.description,
      difficulty: formData.difficulty,
      xp_reward: formData.xp_reward || 0,
      currency_reward: formData.currency_reward || 0,
      deadline: formData.deadline,
      estimated_duration: undefined,
      is_completed: false,
    };
    
    const newWave = await taskStore.createTask(waveData);
    
    // Create enemies for this wave
    for (const enemy of enemies.value) {
      await enemyApi.createEnemy(newWave.id, {
        name: enemy.name,
        description: enemy.description,
        enemy_order: enemy.enemy_order,
        max_hp: enemy.max_hp,
        measurement_type: enemy.measurement_type,
        target_value: enemy.measurement_type === 'binary' ? 1 : enemy.target_value,
        actual_value: 0,
      });
    }
    
    emit('add-wave', newWave);
    resetForm();
  } catch (error) {
    console.error('Error creating wave:', error);
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  formData.title = '';
  formData.description = '';
  formData.character_id = '';
  formData.campaign_id = '';
  formData.mission_id = '';
  formData.quest_id = '';
  formData.difficulty = 3;
  formData.xp_reward = 0;
  formData.currency_reward = 0;
  formData.deadline = '';
  
  enemies.value = [createEnemy()];
};

const handleCancel = () => {
  resetForm();
  emit('cancel');
};
</script>

<style scoped>
.add-wave-form {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid #8b7355;
  border-radius: 20px;
  padding: 24px;
  backdrop-filter: blur(10px);
  max-height: 80vh;
  overflow-y: auto;
}

.add-wave-form::-webkit-scrollbar {
  width: 10px;
}

.add-wave-form::-webkit-scrollbar-track {
  background: #1a3d1a;
}

.add-wave-form::-webkit-scrollbar-thumb {
  background: #8b7355;
  border-radius: 5px;
}

.section-title {
  font-size: 1.4rem;
  font-weight: bold;
  color: #f4e4a4;
  margin-bottom: 20px;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
}

.wave-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  background: rgba(74, 60, 42, 0.3);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 20px;
}

.section-subtitle {
  font-size: 1.1rem;
  font-weight: bold;
  color: #f4e4a4;
  margin: 0 0 15px 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  color: #c9a227;
  font-size: 0.85rem;
  font-weight: 500;
}

.form-input,
.form-textarea,
.form-select {
  padding: 12px 15px;
  border: 2px solid #8b7355;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  color: #f4e4a4;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #c9a227;
}

.form-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-textarea.small {
  min-height: 60px;
  resize: vertical;
}

.form-row {
  display: grid;
  gap: 16px;
}

.form-row.two-cols {
  grid-template-columns: 1fr 1fr;
}

.form-row.three-cols {
  grid-template-columns: 1fr 1fr 1fr;
}

/* Enemies section */
.enemies-section {
  background: rgba(0, 0, 0, 0.3);
  border-color: #c9a227;
}

.enemies-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.total-hp {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.total-hp-label {
  font-size: 0.7rem;
  color: #8b7355;
  font-weight: bold;
}

.total-hp-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #f4e4a4;
}

.total-hp-value.recommended {
  color: #2ecc71;
}

.recommendation-hint {
  font-size: 0.85rem;
  color: #8b7355;
  margin: -5px 0 15px;
  font-style: italic;
}

.enemies-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 15px;
}

.enemy-card {
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 12px;
  overflow: hidden;
}

.enemy-card.collapsed .enemy-body {
  display: none;
}

.enemy-header-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(0, 0, 0, 0.2);
}

.enemy-header-bar:hover {
  background: rgba(0, 0, 0, 0.3);
}

.enemy-drag-handle {
  color: #8b7355;
  font-size: 1.2rem;
  cursor: grab;
  user-select: none;
}

.enemy-summary {
  flex: 1;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.enemy-order {
  font-size: 0.8rem;
  color: #8b7355;
  font-weight: bold;
}

.enemy-name-preview {
  color: #f4e4a4;
  font-weight: 500;
}

.enemy-hp-preview {
  color: #c9a227;
  font-weight: bold;
}

.enemy-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #8b7355;
  background: rgba(74, 60, 42, 0.8);
  color: #f4e4a4;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.icon-btn:hover:not(:disabled) {
  background: #c9a227;
  border-color: #c9a227;
  color: #1a3d1a;
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.icon-btn.delete:hover:not(:disabled) {
  background: #e74c3c;
  border-color: #e74c3c;
  color: white;
}

.enemy-body {
  padding: 15px;
  border-top: 1px solid #8b7355;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.enemy-hint {
  font-size: 0.8rem;
  color: #8b7355;
  font-style: italic;
}

.btn-add-enemy {
  width: 100%;
  padding: 15px;
  background: rgba(74, 60, 42, 0.6);
  border: 2px dashed #8b7355;
  border-radius: 12px;
  color: #f4e4a4;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-enemy:hover {
  background: rgba(74, 60, 42, 0.8);
  border-color: #c9a227;
}

/* Preview */
.preview-card {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid #4a3c2a;
  border-radius: 12px;
  padding: 15px;
}

.preview-title {
  font-size: 1.1rem;
  color: #c9a227;
  margin: 0 0 12px 0;
}

.preview-enemies {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.preview-enemy {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  background: rgba(74, 60, 42, 0.4);
  border-radius: 8px;
}

.preview-number {
  font-size: 0.8rem;
  color: #8b7355;
}

.preview-name {
  flex: 1;
  color: #f4e4a4;
}

.preview-hp {
  color: #c9a227;
  font-weight: bold;
  font-size: 0.9rem;
}

.preview-total {
  text-align: right;
  color: #f4e4a4;
  font-weight: bold;
  font-size: 1.1rem;
  border-top: 1px solid #8b7355;
  padding-top: 10px;
}

/* Legacy settings */
.legacy-settings {
  border: 1px solid #8b7355;
  border-radius: 12px;
  overflow: hidden;
}

.btn-legacy {
  width: 100%;
  padding: 12px 15px;
  background: rgba(74, 60, 42, 0.5);
  border: none;
  color: #8b7355;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.btn-legacy:hover {
  background: rgba(74, 60, 42, 0.7);
  color: #f4e4a4;
}

.legacy-content {
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legacy-hint {
  font-size: 0.8rem;
  color: #8b7355;
  margin: 0;
  font-style: italic;
}

/* Form actions */
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-submit {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  border-radius: 12px;
  padding: 15px 30px;
  color: #f4e4a4;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(201, 162, 39, 0.4);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: rgba(74, 60, 42, 0.6);
  border: 2px solid #8b7355;
  border-radius: 12px;
  padding: 15px 25px;
  color: #f4e4a4;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: rgba(74, 60, 42, 0.8);
  border-color: #c9a227;
}

@media (max-width: 768px) {
  .form-row.two-cols,
  .form-row.three-cols {
    grid-template-columns: 1fr;
  }
  
  .enemy-header-bar {
    flex-wrap: wrap;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn-submit,
  .btn-cancel {
    width: 100%;
  }
}
</style>