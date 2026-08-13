<template>
  <div class="task-list">
    <h3 class="section-title">📋 Список задач</h3>
    
    <div class="task-filters">
      <button 
        v-for="filter in filters" 
        :key="filter.id"
        class="filter-btn"
        :class="{ active: currentFilter === filter.id }"
        @click="currentFilter = filter.id"
      >
        {{ filter.label }}
      </button>
    </div>
    
    <div class="tasks-container" v-if="filteredTasks.length > 0">
      <div 
        v-for="task in filteredTasks" 
        :key="task.id"
        class="task-item"
        :class="{ 
          completed: task.is_completed,
          high_priority: task.difficulty >= 4,
          medium_priority: task.difficulty === 3
        }"
      >
        <div class="task-content">
          <div class="task-header">
            <button 
              class="task-checkbox"
              :class="{ checked: task.is_completed }"
              @click="toggleTask(task)"
              :disabled="loading"
            >
              <span class="checkbox-icon">{{ task.is_completed ? '✓' : '' }}</span>
            </button>
            
            <div class="task-info">
              <h4 class="task-title">{{ task.title }}</h4>
              <p class="task-description" v-if="task.description">{{ task.description }}</p>
              
              <div class="task-meta">
                <span class="task-character" v-if="task.character_name">
                  👤 {{ task.character_name }}
                </span>
                <span class="task-difficulty" :class="getDifficultyClass(task.difficulty)">
                  Сложность: {{ task.difficulty }}/5
                </span>
                <span class="task-deadline" v-if="task.deadline">
                  📅 {{ formatDate(task.deadline) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="task-rewards">
            <div class="reward-item">
              <span class="reward-icon">⭐</span>
              <span class="reward-value">+{{ task.xp_reward }} XP</span>
            </div>
            <div class="reward-item">
              <span class="reward-icon">💰</span>
              <span class="reward-value">+{{ task.currency_reward }}</span>
            </div>
          </div>
        </div>
        
        <div class="task-actions">
          <button 
            class="btn-battle"
            @click="openBattle(task)"
            :disabled="task.is_completed || loading"
            v-if="!task.is_completed"
          >
            {{ loading ? 'Загрузка...' : '⚔️ В бой' }}
          </button>
          <span class="completed-badge" v-else>
            ✓ Выполнено
          </span>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else>
      <p>Нет задач для отображения</p>
      <button class="btn-add-task" @click="$emit('add-task')">
        + Добавить задачу
      </button>
    </div>
    
    <div class="task-summary" v-if="tasks.length > 0">
      <div class="summary-item">
        <span class="summary-label">Всего задач:</span>
        <span class="summary-value">{{ tasks.length }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Выполнено:</span>
        <span class="summary-value completed">{{ completedCount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Осталось:</span>
        <span class="summary-value remaining">{{ remainingCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Task {
  id: string;
  title: string;
  description?: string;
  character_id: string;
  character_name?: string;
  difficulty: number;
  xp_reward: number;
  currency_reward: number;
  is_completed: boolean;
  deadline?: string;
  completed_at?: string;
}

interface Props {
  tasks: Task[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  complete: [task: Task];
  toggle: [task: Task];
  'add-task': [];
  'open-battle': [task: Task];
}>();

const loading = ref(false);
const currentFilter = ref('all');

const filters = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'completed', label: 'Выполненные' },
  { id: 'high_priority', label: 'Срочные' },
];

const filteredTasks = computed(() => {
  switch (currentFilter.value) {
    case 'active':
      return props.tasks.filter(task => !task.is_completed);
    case 'completed':
      return props.tasks.filter(task => task.is_completed);
    case 'high_priority':
      return props.tasks.filter(task => task.difficulty >= 4 && !task.is_completed);
    default:
      return props.tasks;
  }
});

const completedCount = computed(() => {
  return props.tasks.filter(task => task.is_completed).length;
});

const remainingCount = computed(() => {
  return props.tasks.filter(task => !task.is_completed).length;
});

const toggleTask = async (task: Task) => {
  if (loading.value) return;
  
  loading.value = true;
  try {
    // Emit toggle event to parent
    emit('toggle', task);
  } finally {
    loading.value = false;
  }
};

const openBattle = async (task: Task) => {
  if (loading.value || task.is_completed) return;
  
  loading.value = true;
  try {
    emit('open-battle', task);
  } catch (error) {
    console.error('Error opening battle:', error);
  } finally {
    loading.value = false;
  }
};

const getDifficultyClass = (difficulty: number) => {
  if (difficulty >= 4) return 'high';
  if (difficulty >= 3) return 'medium';
  return 'low';
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<style scoped>
.task-list {
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

.task-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #bdc3c7;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #eaeaea;
}

.filter-btn.active {
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  border-color: transparent;
  color: white;
}

.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
}

.tasks-container::-webkit-scrollbar {
  width: 6px;
}

.tasks-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.tasks-container::-webkit-scrollbar-thumb {
  background: rgba(243, 156, 18, 0.5);
  border-radius: 3px;
}

.task-item {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.task-item:hover {
  border-color: rgba(243, 156, 18, 0.3);
  transform: translateX(4px);
}

.task-item.completed {
  opacity: 0.6;
  border-color: rgba(46, 204, 113, 0.3);
}

.task-item.high_priority {
  border-left: 4px solid #e74c3c;
}

.task-item.medium_priority {
  border-left: 4px solid #f39c12;
}

.task-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.task-header {
  display: flex;
  gap: 12px;
  flex: 1;
}

.task-checkbox {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-top: 2px;
}

.task-checkbox:hover:not(:disabled) {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.1);
}

.task-checkbox.checked {
  background: linear-gradient(45deg, #2ecc71, #27ae60);
  border-color: #2ecc71;
}

.checkbox-icon {
  color: white;
  font-weight: bold;
  font-size: 1rem;
}

.task-info {
  flex: 1;
}

.task-title {
  font-size: 1rem;
  font-weight: 500;
  color: #eaeaea;
  margin-bottom: 6px;
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: #95a5a6;
}

.task-description {
  color: #bdc3c7;
  font-size: 0.85rem;
  margin-bottom: 8px;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
}

.task-character {
  color: #3498db;
}

.task-difficulty {
  color: #95a5a6;
}

.task-difficulty.high {
  color: #e74c3c;
  font-weight: 500;
}

.task-difficulty.medium {
  color: #f39c12;
  font-weight: 500;
}

.task-difficulty.low {
  color: #2ecc71;
}

.task-deadline {
  color: #e67e22;
}

.task-rewards {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 100px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.reward-icon {
  font-size: 1rem;
}

.reward-value {
  color: #f39c12;
  font-weight: 500;
}

.task-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.btn-battle {
  background: linear-gradient(45deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-battle:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.btn-battle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.completed-badge {
  color: #2ecc71;
  font-weight: 500;
  font-size: 0.9rem;
  padding: 8px 16px;
  background: rgba(46, 204, 113, 0.1);
  border-radius: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.empty-state p {
  margin-bottom: 16px;
}

.btn-add-task {
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-add-task:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
}

.task-summary {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  color: #95a5a6;
  font-size: 0.8rem;
  margin-bottom: 4px;
}

.summary-value {
  display: block;
  color: #f39c12;
  font-weight: bold;
  font-size: 1.2rem;
}

.summary-value.completed {
  color: #2ecc71;
}

.summary-value.remaining {
  color: #e74c3c;
}
</style>