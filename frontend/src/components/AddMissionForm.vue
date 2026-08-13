<template>
  <div class="add-mission-form">
    <h3 class="section-title">🎯 Добавить Mission</h3>
    
    <form @submit.prevent="handleSubmit" class="mission-form">
      <div class="form-group">
        <label class="form-label">Название Mission</label>
        <input v-model="formData.title" type="text" class="form-input" placeholder="Например: Фундамент" required />
      </div>
      
      <div class="form-group">
        <label class="form-label">Описание (опционально)</label>
        <textarea v-model="formData.description" class="form-textarea" rows="3" placeholder="Описание миссии"></textarea>
      </div>
      
      <div class="form-row two-cols">
        <div class="form-group">
          <label class="form-label">Порядковый номер</label>
          <input v-model.number="formData.order" type="number" class="form-input" min="1" required />
        </div>
        <div class="form-group">
          <label class="form-label">Сложность (1–10)</label>
          <input v-model.number="formData.difficulty" type="number" class="form-input" min="1" max="10" required />
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Создание...' : '✓ СОЗДАТЬ MISSION' }}
        </button>
        <button type="button" class="btn-cancel" @click="$emit('cancel')">Отмена</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { missionApi } from '../api/missionApi';

interface Props {
  campaign: any;
  character: any;
}

const props = defineProps<Props>();
const emit = defineEmits(['mission-created', 'cancel']);

const loading = ref(false);
const formData = reactive({
  title: '',
  description: '',
  order: 1,
  difficulty: 5,
});

const handleSubmit = async () => {
  loading.value = true;
  try {
    await missionApi.createMission({
      campaign_id: props.campaign.id,
      character_id: props.character?.id || props.campaign.starting_character_id,
      title: formData.title,
      description: formData.description,
      order: formData.order,
      difficulty: formData.difficulty,
      xp_reward: 0,
      currency_reward: 0,
      success_criteria: [],
      failure_criteria: [],
      max_attempts: 3
    });
    emit('mission-created');
    resetForm();
  } catch (err) {
    console.error('Error creating mission:', err);
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  formData.title = '';
  formData.description = '';
  formData.order = 1;
  formData.difficulty = 5;
};
</script>

<style scoped>
.add-mission-form {
  background: #1a3d1a;
  border: 2px solid #8b7355;
  border-radius: 20px;
  padding: 24px;
  max-width: 600px;
  width: 100%;
}
.section-title { font-size: 1.4rem; color: #f4e4a4; margin: 0 0 20px; }
.mission-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { color: #c9a227; font-size: 0.85rem; }
.form-input, .form-textarea {
  padding: 12px 15px;
  border: 2px solid #8b7355;
  border-radius: 10px;
  background: rgba(0,0,0,0.3);
  color: #f4e4a4;
  font-size: 1rem;
}
.form-input:focus, .form-textarea:focus { outline: none; border-color: #c9a227; }
.form-row.two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 10px; }
.btn-submit {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4; border-radius: 12px; padding: 15px 30px;
  color: #f4e4a4; font-weight: bold; cursor: pointer;
}
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel { background: rgba(74,60,42,0.6); border: 2px solid #8b7355; border-radius: 12px; padding: 15px 25px; color: #f4e4a4; cursor: pointer; }
.btn-cancel:hover { border-color: #c9a227; }
@media (max-width: 600px) {
  .form-row.two-cols { grid-template-columns: 1fr; }
  .form-actions { flex-direction: column; }
  .btn-submit, .btn-cancel { width: 100%; }
}
</style>