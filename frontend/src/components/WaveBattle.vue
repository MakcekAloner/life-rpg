<template>
  <div class="wave-battle-overlay" @click.self="closeBattle">
    <div class="wave-battle-modal">
      <!-- Header -->
      <div class="wave-header">
        <div class="wave-title-section">
          <div class="wave-badge">ТРЕНИРОВКА</div>
          <h2 class="wave-title">{{ task.title }}</h2>
          <p v-if="task.description" class="wave-description">{{ task.description }}</p>
        </div>
        <button class="close-button" @click="closeBattle">✕</button>
      </div>

      <!-- Wave Progress -->
      <div class="wave-progress-section">
        <div class="wave-total-hp">
          <span class="hp-label">ОБЩИЙ УРОН ТРЕНИРОВКЕ</span>
          <span class="hp-value">{{ task.wave_damage_dealt || 0 }} / {{ task.wave_total_hp || totalEnemyHp }}</span>
        </div>
        <div class="wave-hp-bar">
          <div class="wave-hp-fill" :style="{ width: waveProgressPercent + '%' }"></div>
        </div>
        <div class="wave-status-text" v-if="feedbackMessage">
          {{ feedbackMessage }}
        </div>
      </div>

      <!-- Enemies List -->
      <div class="enemies-list">
        <div 
          v-for="enemy in enemies" 
          :key="enemy.id"
          class="enemy-card"
          :class="{
            'not-engaged': enemy.status === 'not_engaged',
            'damaged': enemy.status === 'damaged',
            'defeated': enemy.status === 'defeated'
          }"
        >
          <div class="enemy-header">
            <div class="enemy-icon">
              <span v-if="enemy.status === 'defeated'">💀</span>
              <span v-else-if="enemy.status === 'damaged'">⚔️</span>
              <span v-else>🛡️</span>
            </div>
            <div class="enemy-info">
              <h3 class="enemy-name">{{ enemy.name }}</h3>
              <p v-if="enemy.description" class="enemy-description">{{ enemy.description }}</p>
            </div>
            <div class="enemy-status">
              <span v-if="enemy.status === 'defeated'" class="status-defeated">DEFEATED</span>
              <span v-else-if="enemy.status === 'damaged'" class="status-damaged">DAMAGED</span>
              <span v-else class="status-not-engaged">NOT ENGAGED</span>
            </div>
          </div>

          <div class="enemy-hp-section">
            <div class="enemy-hp-bar">
              <div class="enemy-hp-fill" :style="{ width: enemyProgressPercent(enemy) + '%' }"></div>
              <div class="enemy-hp-lost" :style="{ width: (100 - enemyProgressPercent(enemy)) + '%', left: enemyProgressPercent(enemy) + '%' }"></div>
            </div>
            <div class="enemy-hp-text">
              <span class="hp-left">{{ enemy.current_hp }} / {{ enemy.max_hp }} HP</span>
              <span v-if="enemy.damage_dealt > 0" class="damage-dealt">{{ enemy.damage_dealt }} DAMAGE</span>
            </div>
          </div>

          <div class="enemy-input-section" v-if="!enemy.is_defeated">
            <label class="input-label">
              {{ inputLabel(enemy) }}
              <span class="target-hint">(цель: {{ enemy.target_value }})</span>
            </label>
            <div class="input-row">
              <input 
                v-model.number="inputValues[enemy.id]"
                type="number" 
                class="enemy-input"
                :step="inputStep(enemy)"
                :min="0"
                :placeholder="'0'"
              />
              <button class="attack-button" @click="attackEnemy(enemy)" :disabled="isAttacking || task.is_completed">
                <span class="attack-icon">✓</span>
                <span class="attack-text">ЗАФИКСИРОВАТЬ</span>
              </button>
            </div>
            <p class="input-hint">{{ inputHint(enemy) }}</p>
          </div>

          <div v-else class="enemy-defeated-message">
            🎉 {{ enemy.name }} уничтожен!
          </div>
        </div>
      </div>

      <!-- Complete Wave Action -->
      <div class="complete-wave-section" v-if="!task.is_completed">
        <div class="complete-wave-hint">
          Реальная тренировка закончена? Зафиксируй результат сейчас.
        </div>
        <button class="complete-wave-button" @click="showCompleteConfirm = true" :disabled="isAttacking">
          <span class="complete-icon">🏁</span>
          <span class="complete-text">ЗАВЕРШИТЬ ТРЕНИРОВКУ</span>
        </button>
      </div>

      <!-- Completion Confirmation -->
      <div v-if="showCompleteConfirm && !task.is_completed" class="confirm-overlay" @click.self="showCompleteConfirm = false">
        <div class="confirm-dialog">
          <h3 class="confirm-title">Завершить тренировку?</h3>
          <p class="confirm-text">
            Зафиксировать текущий результат: <strong>{{ task.wave_damage_dealt || 0 }} / {{ task.wave_total_hp || totalEnemyHp }} Damage</strong>?
          </p>
          <p class="confirm-subtext">
            После завершения тренировка будет сохранена с этим результатом. Завершённая тренировка — это не обязательно идеальная.
          </p>
          <div class="confirm-actions">
            <button class="confirm-cancel" @click="showCompleteConfirm = false">НАЗАД</button>
            <button class="confirm-ok" @click="completeWave" :disabled="isAttacking">
              ЗАВЕРШИТЬ
            </button>
          </div>
        </div>
      </div>

      <!-- Training Result Screen -->
      <div v-if="task.is_completed" class="completed-state">
        <div class="result-title">TRAINING COMPLETE</div>
        <div class="completion-badge" :class="task.wave_status">
          {{ getWaveStatusLabel(task.wave_status) }}
        </div>
        <div class="completion-stats">
          <div class="completion-stat">
            <span class="stat-label">Damage:</span>
            <span class="stat-value">{{ task.wave_damage_dealt }} / {{ task.wave_total_hp }}</span>
          </div>
          <div class="completion-stat">
            <span class="stat-label">Completion:</span>
            <span class="stat-value">{{ task.result_percent }}%</span>
          </div>
          <div class="completion-stat">
            <span class="stat-label">Enemies defeated:</span>
            <span class="stat-value">{{ task.enemies_defeated_count }} / {{ enemies.length }}</span>
          </div>
        </div>
        <div class="result-enemies" v-if="enemies.length > 0">
          <div class="result-enemy" v-for="enemy in enemies" :key="enemy.id">
            <span class="result-name">{{ enemy.name }}</span>
            <span class="result-value">
              {{ enemy.damage_dealt }} / {{ enemy.max_hp }} HP
              <span v-if="enemy.is_defeated" class="defeated-mark">✓</span>
            </span>
          </div>
        </div>
        <p class="completion-message">{{ getWaveMessage(task.wave_status) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { enemyApi, type Enemy } from '../api/enemyApi';

interface Props {
  task: any;
}

const props = defineProps<Props>();
const emit = defineEmits(['close', 'updated']);

const enemies = ref<Enemy[]>([]);
const inputValues = reactive<Record<string, number>>({});
const isAttacking = ref(false);
const feedbackMessage = ref('');
const task = ref<any>(props.task);
const showCompleteConfirm = ref(false);

const totalEnemyHp = computed(() => {
  return enemies.value.reduce((sum, e) => sum + e.max_hp, 0);
});

const waveProgressPercent = computed(() => {
  const total = task.value.wave_total_hp || totalEnemyHp.value;
  const damage = task.value.wave_damage_dealt || 0;
  return total > 0 ? Math.round((damage / total) * 100) : 0;
});

const enemyProgressPercent = (enemy: Enemy) => {
  return enemy.max_hp > 0 ? Math.max(0, (enemy.current_hp / enemy.max_hp) * 100) : 100;
};

const inputLabel = (enemy: Enemy) => {
  switch (enemy.measurement_type) {
    case 'binary': return 'Выполнено';
    case 'quantity': return 'Количество';
    case 'duration': return 'Минут';
    case 'percentage': return 'Процент';
    case 'manual': return 'Результат';
    default: return 'Фактически';
  }
};

const inputStep = (enemy: Enemy) => {
  switch (enemy.measurement_type) {
    case 'binary': return '1';
    case 'duration': return '1';
    case 'percentage': return '0.01';
    default: return '0.1';
  }
};

const inputHint = (enemy: Enemy) => {
  switch (enemy.measurement_type) {
    case 'binary': return 'Введите 1, если выполнено';
    case 'quantity': return `Сколько раз из ${enemy.target_value}`;
    case 'duration': return `Сколько минут из ${enemy.target_value}`;
    case 'percentage': return `Какой процент из ${enemy.target_value}%`;
    case 'manual': return `Ваш результат из ${enemy.target_value}`;
    default: return '';
  }
};

const fetchWaveData = async () => {
  try {
    const response = await enemyApi.getTaskWithEnemies(task.value.id);
    task.value = response.data.task;
    enemies.value = response.data.enemies;
    
    // Initialize input values with current actual values
    for (const enemy of enemies.value) {
      if (inputValues[enemy.id] === undefined) {
        inputValues[enemy.id] = Number(enemy.actual_value);
      }
    }
  } catch (err) {
    console.error('Error fetching wave data:', err);
    feedbackMessage.value = 'Ошибка загрузки данных волны';
  }
};

const attackEnemy = async (enemy: Enemy) => {
  const value = inputValues[enemy.id];
  if (value === undefined || value < 0) return;
  
  isAttacking.value = true;
  feedbackMessage.value = '';
  
  try {
    const response = await enemyApi.updateEnemy(enemy.id, {
      actual_value: value,
      notes: ''
    });
    
    const result = response.data;
    updateEnemyInState(result.enemy);
    
    if (result.isDefeated) {
      showFeedback(`ENEMY DEFEATED! -${result.thisAttackDamage} HP`);
    } else {
      showFeedback(`-${result.thisAttackDamage} HP`);
    }
    
    emit('updated', { task: task.value, enemies: enemies.value });
  } catch (err) {
    console.error('Error attacking enemy:', err);
    feedbackMessage.value = 'Ошибка атаки';
  } finally {
    isAttacking.value = false;
  }
};

const updateEnemyInState = (updatedEnemy: Enemy) => {
  const index = enemies.value.findIndex(e => e.id === updatedEnemy.id);
  if (index !== -1) {
    enemies.value[index] = updatedEnemy;
    inputValues[updatedEnemy.id] = Number(updatedEnemy.actual_value);
  }
};

const showFeedback = (message: string) => {
  feedbackMessage.value = message;
  setTimeout(() => {
    feedbackMessage.value = '';
  }, 3000);
};

const completeWave = async () => {
  if (isAttacking.value) return;
  
  isAttacking.value = true;
  feedbackMessage.value = '';
  
  try {
    const response = await enemyApi.completeWave(task.value.id);
    const result = response.data;
    
    task.value = result.task;
    
    // Refresh enemies to show final states
    await fetchWaveData();
    
    showCompleteConfirm.value = false;
    showFeedback(result.message);
    
    emit('updated', { task: result.task, enemies: enemies.value });
  } catch (err) {
    console.error('Error completing wave:', err);
    feedbackMessage.value = 'Ошибка завершения тренировки';
  } finally {
    isAttacking.value = false;
  }
};

const getWaveStatusLabel = (status: string) => {
  switch (status) {
    case 'missed': return 'TRAINING MISSED';
    case 'complete': return 'TRAINING COMPLETE';
    case 'perfect_clear': return 'PERFECT TRAINING';
    default: return 'TRAINING';
  }
};

const getWaveMessage = (status: string) => {
  switch (status) {
    case 'missed': return 'В этот раз тренировка не состоялась. Следующая — новый шанс.';
    case 'complete': return 'Тренировка завершена. Каждый честный прогресс имеет значение.';
    case 'perfect_clear': return 'Все противники уничтожены! Идеальная тренировка.';
    default: return 'Тренировка завершена.';
  }
};

const closeBattle = () => {
  emit('close');
};

onMounted(() => {
  fetchWaveData();
});
</script>

<style scoped>
.wave-battle-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}

.wave-battle-modal {
  background: linear-gradient(180deg, #2d5a27 0%, #1a3d1a 50%, #0f2a0f 100%);
  border: 4px solid #8b7355;
  border-radius: 24px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

.wave-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 3px solid #4a3c2a;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px 20px 0 0;
}

.wave-title-section {
  flex: 1;
}

.wave-badge {
  display: inline-block;
  background: linear-gradient(135deg, #c9a227, #8b7355);
  color: #f4e4a4;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-bottom: 8px;
}

.wave-title {
  font-size: 1.5rem;
  color: #f4e4a4;
  margin: 0 0 5px 0;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
}

.wave-description {
  font-size: 0.9rem;
  color: #8b7355;
  margin: 0;
}

.close-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #8b7355;
  color: #f4e4a4;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.close-button:hover {
  background: rgba(231, 76, 60, 0.5);
  border-color: #e74c3c;
}

.wave-progress-section {
  padding: 20px;
  border-bottom: 2px solid #4a3c2a;
}

.wave-total-hp {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.hp-label {
  font-size: 0.8rem;
  color: #8b7355;
  font-weight: bold;
}

.hp-value {
  font-size: 1.1rem;
  color: #f4e4a4;
  font-weight: bold;
}

.wave-hp-bar {
  width: 100%;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #8b7355;
  margin-bottom: 10px;
}

.wave-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #c9a227);
  transition: width 0.5s ease;
}

.wave-status-text {
  text-align: center;
  font-size: 1.1rem;
  color: #c9a227;
  font-weight: bold;
  min-height: 25px;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
}

.enemies-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.enemy-card {
  background: rgba(0, 0, 0, 0.4);
  border: 3px solid #8b7355;
  border-radius: 16px;
  padding: 15px;
  transition: all 0.3s;
}

.enemy-card.defeated {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
  opacity: 0.8;
}

.enemy-card.damaged {
  border-color: #c9a227;
}

.enemy-card.not-engaged {
  border-color: #555;
  opacity: 0.9;
}

.enemy-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.enemy-icon {
  font-size: 2rem;
}

.enemy-info {
  flex: 1;
}

.enemy-name {
  font-size: 1.2rem;
  color: #f4e4a4;
  margin: 0 0 3px 0;
}

.enemy-description {
  font-size: 0.8rem;
  color: #8b7355;
  margin: 0;
}

.enemy-status {
  font-size: 0.75rem;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
}

.status-defeated {
  color: #4caf50;
}

.status-damaged {
  color: #c9a227;
}

.status-not-engaged {
  color: #888;
}

.enemy-hp-section {
  margin-bottom: 12px;
}

.enemy-hp-bar {
  width: 100%;
  height: 12px;
  background: #2d2215;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #8b7355;
  position: relative;
  margin-bottom: 8px;
}

.enemy-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.5s ease;
}

.enemy-hp-lost {
  position: absolute;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #c9a227);
  opacity: 0.7;
}

.enemy-hp-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.hp-left {
  color: #f4e4a4;
}

.damage-dealt {
  color: #c9a227;
  font-weight: bold;
}

.enemy-input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 0.9rem;
  color: #f4e4a4;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.target-hint {
  font-size: 0.75rem;
  color: #8b7355;
}

.input-row {
  display: flex;
  gap: 10px;
}

.enemy-input {
  flex: 1;
  padding: 12px 15px;
  border: 2px solid #8b7355;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  color: #f4e4a4;
  font-size: 1rem;
}

.enemy-input:focus {
  outline: none;
  border-color: #c9a227;
}

.attack-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  border-radius: 10px;
  padding: 12px 20px;
  color: #f4e4a4;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.attack-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(201, 162, 39, 0.4);
}

.attack-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-hint {
  font-size: 0.75rem;
  color: #8b7355;
  margin: 0;
}

.enemy-defeated-message {
  text-align: center;
  color: #4caf50;
  font-weight: bold;
  padding: 10px;
}

.bulk-actions {
  padding: 0 20px 20px;
}

.bulk-attack-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  background: linear-gradient(180deg, #e74c3c, #c0392b);
  border: 4px solid #f4e4a4;
  border-radius: 16px;
  padding: 18px 30px;
  color: #f4e4a4;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.bulk-attack-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(231, 76, 60, 0.4);
}

.bulk-attack-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-summary {
  padding: 0 20px 20px;
  border-top: 2px solid #4a3c2a;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0 0 20px 20px;
}

.result-title {
  font-size: 1.1rem;
  color: #f4e4a4;
  font-weight: bold;
  padding: 15px 0 10px;
}

.result-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  padding-bottom: 15px;
}

.result-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(74, 60, 42, 0.6);
  border: 2px solid #8b7355;
  border-radius: 10px;
  padding: 10px 15px;
}

.stat-label {
  color: #8b7355;
  font-size: 0.9rem;
}

.stat-value {
  color: #c9a227;
  font-weight: bold;
  font-size: 1.1rem;
}

.result-title {
  text-align: center;
  font-size: 1.4rem;
  color: #f4e4a4;
  font-weight: bold;
  margin-bottom: 10px;
}

.result-enemies {
  margin: 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid #4a3c2a;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-enemy {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(74, 60, 42, 0.3);
  border-radius: 8px;
  font-size: 0.9rem;
}

.result-name { color: #f4e4a4; }
.result-value { color: #c9a227; font-weight: bold; }
.defeated-mark { color: #2ecc71; margin-left: 8px; }

/* Scrollbar styling */
.wave-battle-modal::-webkit-scrollbar {
  width: 10px;
}

.wave-battle-modal::-webkit-scrollbar-track {
  background: #1a3d1a;
}

.wave-battle-modal::-webkit-scrollbar-thumb {
  background: #8b7355;
  border-radius: 5px;
}

.wave-battle-modal::-webkit-scrollbar-thumb:hover {
  background: #c9a227;
}

/* Complete Wave Section */
.complete-wave-section {
  padding: 0 20px 20px;
  border-top: 2px solid #4a3c2a;
  background: rgba(0, 0, 0, 0.2);
}

.complete-wave-hint {
  text-align: center;
  color: #8b7355;
  font-size: 0.85rem;
  padding: 15px 0 10px;
}

.complete-wave-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  background: linear-gradient(180deg, #2ecc71, #27ae60);
  border: 4px solid #f4e4a4;
  border-radius: 16px;
  padding: 18px 30px;
  color: #f4e4a4;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
}

.complete-wave-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(46, 204, 113, 0.4);
}

.complete-wave-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Confirm Dialog */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.confirm-dialog {
  background: linear-gradient(180deg, #2d5a27 0%, #1a3d1a 100%);
  border: 4px solid #8b7355;
  border-radius: 20px;
  padding: 30px;
  max-width: 450px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

.confirm-title {
  font-size: 1.4rem;
  color: #f4e4a4;
  margin: 0 0 15px;
}

.confirm-text {
  font-size: 1rem;
  color: #eaeaea;
  margin: 0 0 10px;
  line-height: 1.5;
}

.confirm-text strong {
  color: #c9a227;
}

.confirm-subtext {
  font-size: 0.85rem;
  color: #8b7355;
  margin: 0 0 25px;
}

.confirm-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.confirm-cancel {
  background: rgba(74, 60, 42, 0.8);
  border: 2px solid #8b7355;
  border-radius: 12px;
  padding: 12px 25px;
  color: #f4e4a4;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-cancel:hover {
  background: rgba(74, 60, 42, 1);
  border-color: #c9a227;
}

.confirm-ok {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  border-radius: 12px;
  padding: 12px 25px;
  color: #f4e4a4;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-ok:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(201, 162, 39, 0.4);
}

.confirm-ok:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Completed State */
.completed-state {
  padding: 20px;
  border-top: 2px solid #4a3c2a;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0 0 20px 20px;
  text-align: center;
}

.completion-badge {
  display: inline-block;
  padding: 10px 25px;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 15px;
  border: 2px solid;
}

.completion-badge.missed {
  background: rgba(108, 122, 137, 0.3);
  border-color: #6c7a89;
  color: #95a5a6;
}

.completion-badge.complete {
  background: rgba(201, 162, 39, 0.3);
  border-color: #c9a227;
  color: #f4e4a4;
}

.completion-badge.perfect_clear {
  background: rgba(46, 204, 113, 0.3);
  border-color: #2ecc71;
  color: #2ecc71;
  animation: pulse 2s infinite;
}

.completion-stats {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.completion-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(74, 60, 42, 0.6);
  border: 2px solid #8b7355;
  border-radius: 10px;
  padding: 10px 15px;
  min-width: 100px;
}

.completion-stat .stat-label {
  font-size: 0.75rem;
  color: #8b7355;
}

.completion-stat .stat-value {
  font-size: 1.1rem;
  color: #f4e4a4;
  font-weight: bold;
}

.completion-message {
  font-size: 0.95rem;
  color: #8b7355;
  margin: 0;
  font-style: italic;
}

@media (max-width: 600px) {
  .wave-battle-overlay {
    padding: 0;
  }
  
  .wave-battle-modal {
    border-radius: 0;
    max-height: 100vh;
    max-width: 100%;
  }
  
  .input-row {
    flex-direction: column;
  }
  
  .attack-button {
    width: 100%;
    justify-content: center;
  }
}
</style>