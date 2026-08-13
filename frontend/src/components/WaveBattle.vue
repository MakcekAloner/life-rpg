<template>
  <div class="battle-screen" @click.self="closeBattle">
    <!-- Header -->
    <header class="battle-header">
      <div class="battle-title-group">
        <div class="battle-badge">ТРЕНИРОВКА</div>
        <h1 class="battle-title">{{ task.title }}</h1>
      </div>
      <button class="battle-close" @click="closeBattle" title="Вернуться">✕</button>
    </header>

    <!-- Battle Progress -->
    <div class="battle-progress" v-if="!task.is_completed">
      <div class="progress-row">
        <span class="progress-label">Урон тренировке</span>
        <span class="progress-value">{{ task.wave_damage_dealt || 0 }} / {{ task.wave_total_hp || totalEnemyHp }}</span>
      </div>
      <div class="battle-hp-bar">
        <div class="battle-hp-fill" :style="{ width: waveProgressPercent + '%' }"></div>
      </div>
    </div>

    <!-- Feedback Banner -->
    <div class="feedback-banner" v-if="feedbackMessage">
      {{ feedbackMessage }}
    </div>

    <!-- Enemies Battlefield -->
    <main class="battlefield" v-if="!task.is_completed">
      <div
        v-for="enemy in enemies"
        :key="enemy.id"
        class="enemy-card"
        :class="{
          'not-engaged': enemy.status === 'not_engaged',
          'damaged': enemy.status === 'damaged',
          'defeated': enemy.is_defeated,
          'shake': shaking[enemy.id]
        }"
      >
        <div class="enemy-avatar">
          <span v-if="enemy.is_defeated" class="avatar-icon">💀</span>
          <span v-else class="avatar-icon">👹</span>
        </div>

        <div class="enemy-body">
          <div class="enemy-name-row">
            <h2 class="enemy-name">{{ enemy.name }}</h2>
            <span v-if="enemy.is_defeated" class="enemy-state defeated-badge">DEFEATED</span>
            <span v-else-if="enemy.damage_dealt > 0" class="enemy-state damaged-badge">IN BATTLE</span>
            <span v-else class="enemy-state waiting-badge">READY</span>
          </div>

          <p v-if="enemy.description" class="enemy-description">{{ enemy.description }}</p>

          <div class="enemy-hp-block">
            <div class="enemy-hp-bar">
              <div class="enemy-hp-fill" :style="{ width: enemyProgressPercent(enemy) + '%' }"></div>
              <div class="enemy-hp-lost" :style="{ width: (100 - enemyProgressPercent(enemy)) + '%', left: enemyProgressPercent(enemy) + '%' }"></div>
            </div>
            <div class="enemy-hp-text">
              <span class="hp-text">{{ enemy.current_hp }} / {{ enemy.max_hp }} HP</span>
              <span v-if="enemy.damage_dealt > 0" class="damage-total">-{{ enemy.damage_dealt }}</span>
            </div>
          </div>

          <div class="enemy-attack-row" v-if="!enemy.is_defeated">
            <button class="attack-btn" @click="openAction(enemy)" :disabled="isAttacking">
              <span class="attack-icon">⚔️</span>
              <span>АТАКОВАТЬ</span>
            </button>
            <span class="target-text">Цель: {{ enemy.target_value }}</span>
          </div>

          <div v-else class="enemy-defeated-message">
            Уничтожен — больше не атакуется
          </div>
        </div>

        <div v-if="damageNumbers[enemy.id]" class="damage-float">
          -{{ damageNumbers[enemy.id] }} HP
        </div>
      </div>
    </main>

    <!-- Action Modal -->
    <div v-if="showActionPanel && selectedEnemy && !task.is_completed" class="action-overlay" @click.self="closeAction">
      <div class="action-panel">
        <h3 class="action-title">Атаковать: {{ selectedEnemy.name }}</h3>
        <p class="action-subtitle">{{ inputHint(selectedEnemy) }}</p>
        <div class="action-input-row">
          <input
            v-model.number="actionValue"
            type="number"
            class="action-input"
            :step="inputStep(selectedEnemy)"
            :min="0"
            placeholder="0"
            @keyup.enter="attackEnemy(selectedEnemy)"
          />
          <span class="action-target">/ {{ selectedEnemy.target_value }}</span>
        </div>
        <div class="action-actions">
          <button class="action-cancel" @click="closeAction">НАЗАД</button>
          <button class="action-attack" @click="attackEnemy(selectedEnemy)" :disabled="isAttacking || actionValue === undefined">
            НАНЕСТИ УРОН
          </button>
        </div>
      </div>
    </div>

    <!-- Complete Confirmation -->
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
          <button class="confirm-ok" @click="completeWave" :disabled="isAttacking">ЗАВЕРШИТЬ</button>
        </div>
      </div>
    </div>

    <!-- Result Screen -->
    <div v-if="showResultScreen || task.is_completed" class="result-screen">
      <div class="result-card" v-if="result">
        <div class="result-icon" v-if="result.isComplete">�</div>
        <div class="result-icon" v-else-if="result.status === 'missed'">⚠️</div>
        <div class="result-icon" v-else>�🏁</div>
        <h2 class="result-title">{{ result.title }}</h2>
        <div class="result-status" :class="result.status">{{ result.statusText }}</div>

        <div class="result-stats">
          <div class="result-stat">
            <span class="result-stat-label">Нанесено урона за сессию</span>
            <span class="result-stat-value">{{ result.sessionDamage }}</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-label">Накопительный урон</span>
            <span class="result-stat-value">{{ result.damageDealt }} / {{ result.totalHp }}</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-label">Эффективность</span>
            <span class="result-stat-value">{{ result.percent }}%</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-label">Противников побеждено</span>
            <span class="result-stat-value">{{ result.defeated }} / {{ result.total }}</span>
          </div>
        </div>

        <div class="result-enemies" v-if="enemies.length > 0">
          <div class="result-enemy" v-for="enemy in enemies" :key="enemy.id">
            <span class="result-name">{{ enemy.name }}</span>
            <span class="result-detail">
              <span v-if="enemy.damage_dealt > 0" class="result-damage">-{{ enemy.damage_dealt }} HP</span>
              <span class="result-hp-left">{{ enemy.current_hp }} / {{ enemy.max_hp }} HP</span>
              <span v-if="enemy.is_defeated" class="defeated-mark">✓</span>
            </span>
          </div>
        </div>

        <button class="continue-button" @click="closeBattle">
          ПРОДОЛЖИТЬ
        </button>
      </div>
    </div>

    <!-- Battle Footer -->
    <footer class="battle-footer" v-if="!task.is_completed">
      <button class="complete-training-btn" @click="showCompleteConfirm = true" :disabled="isAttacking">
        <span>🏁 ЗАВЕРШИТЬ ТРЕНИРОВКУ</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { enemyApi, type Enemy } from '../api/enemyApi';

interface Props {
  task: any;
}

const props = defineProps<Props>();
const emit = defineEmits(['close', 'updated']);

const enemies = ref<Enemy[]>([]);
const inputValues = ref<Record<string, number>>({});
const isAttacking = ref(false);
const feedbackMessage = ref('');
const task = ref<any>(props.task);
const showCompleteConfirm = ref(false);
const showResultScreen = ref(false);
const sessionResult = ref<any>(null);

const showActionPanel = ref(false);
const selectedEnemy = ref<Enemy | null>(null);
const actionValue = ref<number | undefined>(undefined);
const damageNumbers = ref<Record<string, number | null>>({});
const shaking = ref<Record<string, boolean>>({});

const totalEnemyHp = computed(() => {
  return enemies.value.reduce((sum, e) => sum + e.max_hp, 0);
});

const result = computed(() => {
  const data = sessionResult.value;
  if (data) {
    const isComplete = data.waveStatus === 'perfect_clear';
    const title = isComplete ? '🏆 WAVE COMPLETE' : (data.waveStatus === 'missed' ? 'ТРЕНИРОВКА ПРОПУЩЕНА' : 'ТРЕНИРОВКА ЗАФИКСИРОВАНА');
    return {
      title,
      status: data.waveStatus,
      statusText: data.message,
      damageDealt: data.damageDealt,
      totalHp: data.totalHp,
      percent: data.percent,
      defeated: data.defeatedCount,
      total: enemies.value.length,
      sessionDamage: data.sessionDamage,
      isComplete
    };
  }
  return null;
});

const waveProgressPercent = computed(() => {
  const total = task.value.wave_total_hp || totalEnemyHp.value;
  const damage = task.value.wave_damage_dealt || 0;
  return total > 0 ? Math.round((damage / total) * 100) : 0;
});

const enemyProgressPercent = (enemy: Enemy) => {
  return enemy.max_hp > 0 ? Math.max(0, (enemy.current_hp / enemy.max_hp) * 100) : 100;
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
    case 'binary': return 'Введите 1, если выполнено, или 0';
    case 'quantity': return `Сколько раз из ${enemy.target_value}`;
    case 'duration': return `Сколько минут из ${enemy.target_value}`;
    case 'percentage': return `Какой процент из ${enemy.target_value}%`;
    case 'manual': return `Ваш результат из ${enemy.target_value}`;
    default: return 'Введите фактический результат';
  }
};

const fetchWaveData = async () => {
  try {
    const response = await enemyApi.getTaskWithEnemies(task.value.id);
    task.value = response.data.task;
    enemies.value = response.data.enemies;

    for (const enemy of enemies.value) {
      if (inputValues.value[enemy.id] === undefined) {
        inputValues.value[enemy.id] = Number(enemy.actual_value || 0);
      }
    }
  } catch (err) {
    console.error('Error fetching wave data:', err);
    feedbackMessage.value = 'Ошибка загрузки тренировки';
  }
};



const openAction = (enemy: Enemy) => {
  selectedEnemy.value = enemy;
  actionValue.value = inputValues.value[enemy.id] || undefined;
  showActionPanel.value = true;
};

const closeAction = () => {
  showActionPanel.value = false;
  selectedEnemy.value = null;
  actionValue.value = undefined;
};

const attackEnemy = async (enemy: Enemy) => {
  const value = actionValue.value;
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

    inputValues.value[enemy.id] = Number(result.enemy.actual_value);
    closeAction();

    if (result.thisAttackDamage) {
      triggerDamageFeedback(enemy.id, result.thisAttackDamage);
    }

    if (result.isDefeated) {
      showFeedback(`${enemy.name} ПОБЕЖДЁН!`);
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

const triggerDamageFeedback = (enemyId: string, damage: number) => {
  damageNumbers.value[enemyId] = damage;
  shaking.value[enemyId] = true;
  setTimeout(() => {
    shaking.value[enemyId] = false;
  }, 300);
  setTimeout(() => {
    damageNumbers.value[enemyId] = null;
  }, 900);
};

const updateEnemyInState = (updatedEnemy: Enemy) => {
  const index = enemies.value.findIndex(e => e.id === updatedEnemy.id);
  if (index !== -1) {
    enemies.value[index] = updatedEnemy;
    inputValues.value[updatedEnemy.id] = Number(updatedEnemy.actual_value);
  }
};

const showFeedback = (message: string) => {
  feedbackMessage.value = message;
  setTimeout(() => {
    feedbackMessage.value = '';
  }, 2500);
};

const completeWave = async () => {
  if (isAttacking.value) return;

  isAttacking.value = true;
  feedbackMessage.value = '';

  try {
    const response = await enemyApi.completeWave(task.value.id);
    const result = response.data;

    sessionResult.value = result;
    task.value = result.task;
    showResultScreen.value = true;
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

const closeBattle = () => {
  emit('close');
};

onMounted(() => {
  fetchWaveData();
});
</script>

<style scoped>
.battle-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #143314 0%, #1a3d1a 40%, #0f2a0f 100%);
  color: #f4e4a4;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
}

.battle-header {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 3px solid #4a3c2a;
}

.battle-title-group { flex: 1; }
.battle-badge {
  display: inline-block;
  background: linear-gradient(135deg, #c9a227, #8b7355);
  color: #f4e4a4;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: bold;
  margin-bottom: 6px;
}
.battle-title { font-size: 1.6rem; margin: 0; text-shadow: 2px 2px 0 rgba(0,0,0,0.5); }

.battle-close {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #8b7355;
  color: #f4e4a4;
  font-size: 1.2rem;
  cursor: pointer;
}
.battle-close:hover { background: rgba(231, 76, 60, 0.5); border-color: #e74c3c; }

.battle-progress {
  flex: 0 0 auto;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 2px solid #4a3c2a;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.progress-label { font-size: 0.8rem; color: #8b7355; font-weight: bold; }
.progress-value { font-size: 1.1rem; font-weight: bold; }

.battle-hp-bar {
  width: 100%; height: 18px;
  background: rgba(0,0,0,0.5);
  border: 2px solid #8b7355;
  border-radius: 9px;
  overflow: hidden;
}
.battle-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #c9a227);
  transition: width 0.5s ease;
}

.feedback-banner {
  flex: 0 0 auto;
  padding: 12px;
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: #c9a227;
  background: rgba(0,0,0,0.4);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}

.battlefield {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  padding: 30px;
  overflow-y: auto;
  align-content: start;
}

.enemy-card {
  position: relative;
  background: rgba(0, 0, 0, 0.35);
  border: 3px solid #8b7355;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.2s;
}

.enemy-card.damaged { border-color: #c9a227; }
.enemy-card.defeated {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.12);
  opacity: 0.75;
}

.enemy-avatar {
  width: 90px; height: 90px;
  border-radius: 50%;
  background: rgba(74, 60, 42, 0.6);
  border: 3px solid #8b7355;
  display: flex; align-items: center; justify-content: center;
  font-size: 3rem;
  margin-bottom: 16px;
}
.enemy-card.defeated .enemy-avatar {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.15);
}

.enemy-body { width: 100%; }
.enemy-name-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.enemy-name { font-size: 1.5rem; margin: 0; }
.enemy-state {
  font-size: 0.7rem;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
}
.defeated-badge { color: #4caf50; border: 1px solid #4caf50; }
.damaged-badge { color: #c9a227; border: 1px solid #c9a227; }
.waiting-badge { color: #888; border: 1px solid #888; }

.enemy-description { color: #8b7355; font-size: 0.85rem; margin: 0 0 16px; }

.enemy-hp-block { margin-bottom: 18px; }
.enemy-hp-bar {
  position: relative;
  width: 100%; height: 22px;
  background: #2d2215;
  border: 2px solid #8b7355;
  border-radius: 11px;
  overflow: hidden;
  margin-bottom: 8px;
}
.enemy-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.5s ease;
}
.enemy-hp-lost {
  position: absolute;
  top: 0; height: 100%;
  background: linear-gradient(90deg, #e74c3c, #c9a227);
  opacity: 0.7;
  transition: width 0.5s ease, left 0.5s ease;
}
.enemy-hp-text {
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
}
.hp-text { font-weight: bold; }
.damage-total { color: #c9a227; }

.enemy-attack-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.attack-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 3px solid #f4e4a4;
  border-radius: 14px;
  padding: 14px 24px;
  color: #1a3d1a;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.attack-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(201,162,39,0.4); }
.attack-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.target-text { font-size: 0.8rem; color: #8b7355; }

.enemy-defeated-message {
  color: #4caf50;
  font-weight: bold;
  padding: 12px;
  border: 2px solid #4caf50;
  border-radius: 12px;
  background: rgba(76, 175, 80, 0.1);
}

.damage-float {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.6rem;
  font-weight: bold;
  color: #e74c3c;
  text-shadow: 0 0 10px rgba(231, 76, 60, 0.8);
  animation: floatUp 0.9s ease-out forwards;
  pointer-events: none;
}

@keyframes floatUp {
  0% { opacity: 1; top: 30%; transform: translateX(-50%) scale(1); }
  100% { opacity: 0; top: 10%; transform: translateX(-50%) scale(1.2); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-6px); }
}

.enemy-card.shake { animation: shake 0.3s ease-in-out; }

/* Action Panel */
.action-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
  padding: 20px;
}

.action-panel {
  width: 100%;
  max-width: 420px;
  background: linear-gradient(180deg, #2d5a27, #1a3d1a);
  border: 3px solid #c9a227;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
}

.action-title { font-size: 1.3rem; margin: 0 0 8px; text-align: center; }
.action-subtitle { color: #8b7355; font-size: 0.9rem; text-align: center; margin-bottom: 20px; }

.action-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.action-input {
  flex: 1;
  padding: 14px 16px;
  border: 2px solid #8b7355;
  border-radius: 12px;
  background: rgba(0,0,0,0.4);
  color: #f4e4a4;
  font-size: 1.2rem;
  text-align: center;
}
.action-input:focus { outline: none; border-color: #c9a227; }
.action-target { font-size: 1.1rem; color: #8b7355; }

.action-actions {
  display: flex;
  gap: 12px;
}
.action-cancel, .action-attack {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
  font-size: 1rem;
}
.action-cancel {
  background: rgba(74, 60, 42, 0.6);
  border: 2px solid #8b7355;
  color: #f4e4a4;
}
.action-attack {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  color: #1a3d1a;
}
.action-attack:disabled { opacity: 0.5; cursor: not-allowed; }

/* Confirmation */
.confirm-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1200;
  padding: 20px;
}

.confirm-dialog {
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, #2d5a27, #1a3d1a);
  border: 3px solid #8b7355;
  border-radius: 20px;
  padding: 28px;
  text-align: center;
}
.confirm-title { font-size: 1.4rem; margin: 0 0 16px; }
.confirm-text { margin-bottom: 10px; line-height: 1.5; }
.confirm-subtext { color: #8b7355; font-size: 0.85rem; margin-bottom: 24px; }
.confirm-actions { display: flex; gap: 12px; }
.confirm-cancel, .confirm-ok {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
}
.confirm-cancel {
  background: rgba(74, 60, 42, 0.6);
  border: 2px solid #8b7355;
  color: #f4e4a4;
}
.confirm-ok {
  background: linear-gradient(180deg, #2ecc71, #27ae60);
  border: 2px solid #f4e4a4;
  color: #f4e4a4;
}

/* Result Screen */
.result-screen {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  overflow-y: auto;
  background: linear-gradient(180deg, #143314 0%, #1a3d1a 50%, #0f2a0f 100%);
}

.result-card {
  width: 100%;
  max-width: 560px;
  background: rgba(0, 0, 0, 0.35);
  border: 3px solid #8b7355;
  border-radius: 24px;
  padding: 32px;
  text-align: center;
}

.result-icon { font-size: 3rem; margin-bottom: 10px; }
.result-title { font-size: 1.6rem; margin: 0 0 12px; }
.result-status {
  font-size: 1rem;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 10px;
  display: inline-block;
  margin-bottom: 20px;
}
.result-status.missed { color: #888; border: 1px solid #888; }
.result-status.complete { color: #c9a227; border: 1px solid #c9a227; }
.result-status.perfect_clear { color: #4caf50; border: 1px solid #4caf50; }

.result-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.result-stat {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(74, 60, 42, 0.4);
  border: 1px solid #8b7355;
  border-radius: 10px;
}
.result-stat-label { color: #8b7355; }
.result-stat-value { font-weight: bold; color: #c9a227; }

.result-enemies {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  text-align: left;
}
.result-enemy {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(0,0,0,0.25);
  border-radius: 10px;
}
.result-name { font-weight: bold; }
.result-detail { display: flex; gap: 12px; align-items: center; color: #8b7355; }
.result-damage { color: #e74c3c; font-weight: bold; }
.result-hp-left { color: #f4e4a4; }
.defeated-mark { color: #4caf50; font-weight: bold; }

.result-message { color: #8b7355; margin-bottom: 24px; }

.continue-button {
  width: 100%;
  padding: 16px;
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  border-radius: 14px;
  color: #1a3d1a;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
}

/* Footer */
.battle-footer {
  flex: 0 0 auto;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.4);
  border-top: 3px solid #4a3c2a;
}

.complete-training-btn {
  width: 100%;
  padding: 18px;
  background: linear-gradient(180deg, #2ecc71, #27ae60);
  border: 3px solid #f4e4a4;
  border-radius: 14px;
  color: #f4e4a4;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.complete-training-btn:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4); }
.complete-training-btn:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 768px) {
  .battlefield { grid-template-columns: 1fr; padding: 20px; }
  .enemy-name { font-size: 1.25rem; }
  .action-actions { flex-direction: column; }
}
</style>
