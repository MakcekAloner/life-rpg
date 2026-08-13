<template>
  <div class="add-wave-form" :class="{ 'inline-mode': props.inline }">
    <h3 class="section-title" v-if="!props.inline">🌊 Добавить Wave</h3>
    
    <form @submit.prevent="handleSubmit" class="wave-form">
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
        
        <div class="form-group">
          <label class="form-label">Дедлайн (опционально)</label>
          <input
            v-model="formData.deadline"
            type="datetime-local"
            class="form-input"
          />
        </div>
      </div>
      
      <div class="form-section enemies-section">
        <div class="enemies-header">
          <h4 class="section-subtitle">👾 Противники</h4>
          <div class="total-hp">
            <span class="total-hp-label">ОБЩИЙ HP</span>
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
                  <input v-model="enemy.name" type="text" class="form-input" placeholder="Подтягивания" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Max HP</label>
                  <input v-model.number="enemy.max_hp" type="number" class="form-input" min="1" required />
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Описание / условие</label>
                <textarea v-model="enemy.description" class="form-textarea small" placeholder="Рабочие подходы" rows="2"></textarea>
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
                  <input v-model.number="enemy.target_value" type="number" class="form-input" min="0.1" step="0.1" required />
                </div>
              </div>
              
              <p class="enemy-hint">{{ typeHint(enemy.measurement_type) }}</p>
            </div>
          </div>
        </div>
        
        <button type="button" class="btn-add-enemy" @click="addEnemy">+ ДОБАВИТЬ ПРОТИВНИКА</button>
      </div>
      
      <div class="form-section preview-section" v-if="enemies.length > 0">
        <h4 class="section-subtitle">Предпросмотр</h4>
        <div class="preview-card">
          <h5 class="preview-title">{{ formData.title || 'Новая Wave' }}</h5>
          <div class="preview-enemies">
            <div v-for="(enemy, index) in enemies" :key="enemy.tempId" class="preview-enemy">
              <span class="preview-number">#{{ index + 1 }}</span>
              <span class="preview-name">{{ enemy.name || 'Противник' }}</span>
              <span class="preview-hp">{{ enemy.max_hp }} HP</span>
            </div>
          </div>
          <div class="preview-total">TOTAL: {{ totalHp }} HP</div>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn-submit" :disabled="loading || !isValid">
          {{ loading ? 'Создание...' : '✓ СОЗДАТЬ WAVE' }}
        </button>
        <button type="button" class="btn-cancel" @click="handleCancel">Отмена</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useTaskStore } from '../stores/taskStore';
import { enemyApi } from '../api/enemyApi';
import { questApi } from '../api/questApi';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  mission: any;
  character: any;
  campaign: any;
  inline?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['wave-created', 'cancel']);
const taskStore = useTaskStore();

const loading = ref(false);
const enemies = ref<any[]>([]);

const formData = reactive({
  title: '',
  description: '',
  difficulty: 3,
  deadline: '',
});

type MeasurementType = 'binary' | 'quantity' | 'duration' | 'percentage' | 'manual';

const createEnemy = () => ({
  tempId: uuidv4(),
  name: '',
  description: '',
  max_hp: 10,
  measurement_type: 'quantity' as MeasurementType,
  target_value: 1,
  enemy_order: enemies.value.length,
  collapsed: false,
});

const addEnemy = () => enemies.value.push(createEnemy());
const removeEnemy = (index: number) => { enemies.value.splice(index, 1); reorderEnemies(); };

const duplicateEnemy = (index: number) => {
  const original = enemies.value[index];
  const copy = { ...original, tempId: uuidv4(), name: original.name ? `${original.name} (копия)` : '', collapsed: false };
  enemies.value.splice(index + 1, 0, copy);
  reorderEnemies();
};

const moveEnemy = (index: number, direction: number) => {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= enemies.value.length) return;
  [enemies.value[index], enemies.value[newIndex]] = [enemies.value[newIndex], enemies.value[index]];
  reorderEnemies();
};

const toggleEnemy = (enemy: any) => { enemy.collapsed = !enemy.collapsed; };
const reorderEnemies = () => enemies.value.forEach((e, i) => e.enemy_order = i);

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
    case 'binary': return 'Отметь 1, если выполнено';
    case 'quantity': return 'Сколько раз/подходов из целевого';
    case 'duration': return 'Сколько минут из целевого';
    case 'percentage': return 'Какой процент от целевого';
    case 'manual': return 'Произвольное числовое значение';
    default: return '';
  }
};

const totalHp = computed(() => enemies.value.reduce((sum, e) => sum + (Number(e.max_hp) || 0), 0));
const isValid = computed(() => {
  return formData.title.trim() !== '' &&
    enemies.value.length > 0 &&
    enemies.value.every(e => e.name.trim() !== '' && e.max_hp > 0);
});

const getOrCreateQuest = async (missionId: string): Promise<string> => {
  try {
    const quests = await questApi.getQuestsByMission(missionId);
    if (quests.length > 0) return quests[0].id;
  } catch (err) { console.error(err); }
  
  const quest = await questApi.createQuest({
    mission_id: missionId,
    title: 'Основной Quest',
    description: 'Авто Quest для Wave',
    order: 1,
    xp_reward: 0,
    currency_reward: 0
  });
  return quest.id;
};

const handleSubmit = async () => {
  if (!isValid.value) return;
  
  loading.value = true;
  try {
    const questId = await getOrCreateQuest(props.mission.id);
    
    const waveData = {
      quest_id: questId,
      character_id: props.mission.character_id,
      title: formData.title,
      description: formData.description,
      difficulty: formData.difficulty,
      xp_reward: 0,
      currency_reward: 0,
      deadline: formData.deadline,
      estimated_duration: undefined,
    };
    
    const newWave = await taskStore.createTask(waveData);
    
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
    
    emit('wave-created', newWave);
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
  formData.difficulty = 3;
  formData.deadline = '';
  enemies.value = [createEnemy()];
};

const handleCancel = () => { resetForm(); emit('cancel'); };

onMounted(() => {
  if (enemies.value.length === 0) addEnemy();
});
</script>

<style scoped>
.add-wave-form {
  background: #1a3d1a;
  border: 2px solid #8b7355;
  border-radius: 20px;
  padding: 24px;
  max-width: 700px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
}

.section-title {
  font-size: 1.4rem;
  color: #f4e4a4;
  margin: 0 0 20px;
}

.wave-form { display: flex; flex-direction: column; gap: 20px; }
.form-section {
  background: rgba(74, 60, 42, 0.3);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 20px;
}
.section-subtitle {
  font-size: 1.1rem;
  color: #f4e4a4;
  margin: 0 0 15px;
}
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { color: #c9a227; font-size: 0.85rem; }
.form-input, .form-textarea, .form-select {
  padding: 12px 15px;
  border: 2px solid #8b7355;
  border-radius: 10px;
  background: rgba(0,0,0,0.3);
  color: #f4e4a4;
  font-size: 1rem;
}
.form-input:focus, .form-textarea:focus, .form-select:focus { outline: none; border-color: #c9a227; }
.form-textarea.small { min-height: 60px; resize: vertical; }
.form-row.two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.enemies-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.total-hp { text-align: right; }
.total-hp-label { font-size: 0.7rem; color: #8b7355; }
.total-hp-value { font-size: 1.5rem; font-weight: bold; color: #f4e4a4; }
.total-hp-value.recommended { color: #2ecc71; }
.recommendation-hint { font-size: 0.85rem; color: #8b7355; margin: -5px 0 15px; font-style: italic; }

.enemies-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 15px; }
.enemy-card {
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 12px;
  overflow: hidden;
}
.enemy-header-bar { display: flex; align-items: center; gap: 12px; padding: 12px 15px; cursor: pointer; background: rgba(0,0,0,0.2); }
.enemy-summary { flex: 1; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.enemy-order { font-size: 0.8rem; color: #8b7355; font-weight: bold; }
.enemy-name-preview { color: #f4e4a4; }
.enemy-hp-preview { color: #c9a227; font-weight: bold; }
.enemy-actions { display: flex; gap: 6px; }
.icon-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid #8b7355; background: rgba(74,60,42,0.8);
  color: #f4e4a4; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; font-size: 0.9rem;
}
.icon-btn:hover:not(:disabled) { background: #c9a227; border-color: #c9a227; color: #1a3d1a; }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.icon-btn.delete:hover:not(:disabled) { background: #e74c3c; border-color: #e74c3c; color: white; }
.enemy-body { padding: 15px; border-top: 1px solid #8b7355; display: flex; flex-direction: column; gap: 12px; }
.enemy-hint { font-size: 0.8rem; color: #8b7355; font-style: italic; }

.btn-add-enemy {
  width: 100%; padding: 15px;
  background: rgba(74,60,42,0.6); border: 2px dashed #8b7355; border-radius: 12px;
  color: #f4e4a4; font-size: 1rem; font-weight: bold; cursor: pointer;
}
.btn-add-enemy:hover { background: rgba(74,60,42,0.8); border-color: #c9a227; }

.preview-card { background: rgba(0,0,0,0.4); border: 2px solid #4a3c2a; border-radius: 12px; padding: 15px; }
.preview-title { font-size: 1.1rem; color: #c9a227; margin: 0 0 12px; }
.preview-enemies { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.preview-enemy { display: flex; gap: 10px; align-items: center; padding: 8px 12px; background: rgba(74,60,42,0.4); border-radius: 8px; }
.preview-number { font-size: 0.8rem; color: #8b7355; }
.preview-name { flex: 1; color: #f4e4a4; }
.preview-hp { color: #c9a227; font-weight: bold; }
.preview-total { text-align: right; color: #f4e4a4; font-weight: bold; border-top: 1px solid #8b7355; padding-top: 10px; }

.form-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn-submit {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4; border-radius: 12px; padding: 15px 30px;
  color: #f4e4a4; font-size: 1.1rem; font-weight: bold; cursor: pointer;
}
.btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(201,162,39,0.4); }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel {
  background: rgba(74,60,42,0.6); border: 2px solid #8b7355;
  border-radius: 12px; padding: 15px 25px; color: #f4e4a4; cursor: pointer;
}
.btn-cancel:hover { background: rgba(74,60,42,0.8); border-color: #c9a227; }

.add-wave-form.inline-mode {
  max-width: none;
  max-height: none;
  background: rgba(74, 60, 42, 0.5);
  border-radius: 16px;
  overflow-y: visible;
}

@media (max-width: 768px) {
  .form-row.two-cols { grid-template-columns: 1fr; }
  .form-actions { flex-direction: column; }
  .btn-submit, .btn-cancel { width: 100%; }
}
</style>