<template>
  <div class="action-input">
    <h3 class="section-title">📝 Ввод действия</h3>
    
    <form @submit.prevent="handleSubmit" class="action-form">
      <div class="form-group">
        <label class="form-label">Персонаж</label>
        <select v-model="formData.character_id" class="form-select" required>
          <option value="">Выберите персонажа</option>
          <option v-for="character in activeCharacters" :key="character.id" :value="character.id">
            {{ character.name }} - {{ character.title }}
          </option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Название действия</label>
        <input
          v-model="formData.title"
          type="text"
          class="form-input"
          placeholder="Например: Тренировка отжиманий"
          required
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">Описание</label>
        <textarea
          v-model="formData.description"
          class="form-textarea"
          placeholder="Подробности о выполненном действии"
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">XP награда</label>
          <input
            v-model.number="formData.xp_reward"
            type="number"
            class="form-input"
            min="0"
            placeholder="0"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Валюта</label>
          <input
            v-model.number="formData.currency_reward"
            type="number"
            class="form-input"
            min="0"
            placeholder="0"
          />
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Заметки (опционально)</label>
        <textarea
          v-model="formData.notes"
          class="form-textarea"
          placeholder="Дополнительные заметки или комментарии"
          rows="2"
        ></textarea>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Сохранение...' : '✓ Записать действие' }}
        </button>
        <button type="button" class="btn-cancel" @click="resetForm">
          Сбросить
        </button>
      </div>
    </form>
    
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useCharacterStore } from '../stores/characterStore';
import { usePlayerStore } from '../stores/playerStore';

const characterStore = useCharacterStore();
const playerStore = usePlayerStore();

const loading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const formData = reactive({
  character_id: '',
  title: '',
  description: '',
  xp_reward: 0,
  currency_reward: 0,
  notes: '',
});

const activeCharacters = ref<any[]>([]);

onMounted(async () => {
  if (playerStore.currentPlayer) {
    await characterStore.fetchCharacters(playerStore.currentPlayer.id);
    activeCharacters.value = characterStore.activeCharacters;
  }
});

const handleSubmit = async () => {
  loading.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  
  try {
    // Add XP to character
    if (formData.xp_reward > 0) {
      await characterStore.addCharacterXP(formData.character_id, {
        amount: formData.xp_reward,
        source: 'action',
        description: formData.title,
      });
    }
    
    // Add currency to player
    if (formData.currency_reward > 0 && playerStore.currentPlayer) {
      await playerStore.addCurrency({
        amount: formData.currency_reward,
        transaction_type: 'earn',
        source: 'action',
        description: formData.title,
      });
    }
    
    successMessage.value = 'Действие успешно записано!';
    
    // Reset form after success
    setTimeout(() => {
      resetForm();
      successMessage.value = '';
    }, 2000);
    
  } catch (error) {
    errorMessage.value = 'Ошибка при записи действия. Попробуйте снова.';
    console.error('Error submitting action:', error);
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  formData.character_id = '';
  formData.title = '';
  formData.description = '';
  formData.xp_reward = 0;
  formData.currency_reward = 0;
  formData.notes = '';
  successMessage.value = '';
  errorMessage.value = '';
};
</script>

<style scoped>
.action-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.section-title {
  font-size: 1.3rem;
  font-weight: bold;
  color: #f39c12;
  margin-bottom: 20px;
}

.action-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-label {
  color: #bdc3c7;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-input,
.form-select,
.form-textarea {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  color: #eaeaea;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #f39c12;
  box-shadow: 0 0 0 3px rgba(243, 156, 18, 0.1);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #7f8c8d;
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23bdc3c7' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn-submit,
.btn-cancel {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit {
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  color: white;
  flex: 2;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #bdc3c7;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex: 1;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #eaeaea;
}

.success-message {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(46, 204, 113, 0.2);
  border: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: 8px;
  color: #2ecc71;
  font-size: 0.9rem;
}

.error-message {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 8px;
  color: #e74c3c;
  font-size: 0.9rem;
}
</style>