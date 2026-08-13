import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { taskApi, Task } from '../api/taskApi';

export const useTaskStore = defineStore('task', () => {
  // State
  const tasks = ref<Task[]>([]);
  const currentTask = ref<Task | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const activeTasks = computed(() => {
    return tasks.value.filter(task => !task.is_completed);
  });

  const completedTasks = computed(() => {
    return tasks.value.filter(task => task.is_completed);
  });

  const highPriorityTasks = computed(() => {
    return tasks.value.filter(task => task.difficulty >= 4 && !task.is_completed);
  });

  const taskById = computed(() => {
    return (id: string) => tasks.value.find(task => task.id === id);
  });

  // Actions
  const fetchAllTasks = async (playerId: string) => {
    loading.value = true;
    error.value = null;
    try {
      tasks.value = await taskApi.getAllTasks(playerId);
    } catch (err) {
      error.value = 'Failed to fetch tasks';
      console.error('Error fetching tasks:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchCharacterTasks = async (characterId: string) => {
    loading.value = true;
    error.value = null;
    try {
      const characterTasks = await taskApi.getCharacterTasks(characterId);
      // Merge with existing tasks, avoiding duplicates
      const existingIds = new Set(tasks.value.map(t => t.id));
      const newTasks = characterTasks.filter(t => !existingIds.has(t.id));
      tasks.value = [...tasks.value, ...newTasks];
    } catch (err) {
      error.value = 'Failed to fetch character tasks';
      console.error('Error fetching character tasks:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchTask = async (taskId: string) => {
    loading.value = true;
    error.value = null;
    try {
      currentTask.value = await taskApi.getTask(taskId);
    } catch (err) {
      error.value = 'Failed to fetch task';
      console.error('Error fetching task:', err);
    } finally {
      loading.value = false;
    }
  };

  const createTask = async (taskData: {
    quest_id?: string;
    character_id: string;
    title: string;
    description?: string;
    difficulty: number;
    xp_reward: number;
    currency_reward: number;
    deadline?: string;
    estimated_duration?: number;
  }) => {
    loading.value = true;
    error.value = null;
    try {
      const newTask = await taskApi.createTask(taskData);
      tasks.value.unshift(newTask);
      return newTask;
    } catch (err) {
      error.value = 'Failed to create task';
      console.error('Error creating task:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateTask = async (
    taskId: string,
    taskData: {
      title?: string;
      description?: string;
      difficulty?: number;
      xp_reward?: number;
      currency_reward?: number;
      deadline?: string;
      is_completed?: boolean;
    }
  ) => {
    loading.value = true;
    error.value = null;
    try {
      const updatedTask = await taskApi.updateTask(taskId, taskData);
      const index = tasks.value.findIndex(task => task.id === taskId);
      if (index !== -1) {
        tasks.value[index] = updatedTask;
      }
      if (currentTask.value?.id === taskId) {
        currentTask.value = updatedTask;
      }
      return updatedTask;
    } catch (err) {
      error.value = 'Failed to update task';
      console.error('Error updating task:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const completeTask = async (taskId: string) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await taskApi.completeTask(taskId);
      // Update the task in the local array with the completed task from the response
      const index = tasks.value.findIndex(task => task.id === taskId);
      if (index !== -1) {
        tasks.value[index] = result.task;
      }
      if (currentTask.value?.id === taskId) {
        currentTask.value = result.task;
      }
      return result;
    } catch (err) {
      error.value = 'Failed to complete task';
      console.error('Error completing task:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteTask = async (taskId: string) => {
    loading.value = true;
    error.value = null;
    try {
      await taskApi.deleteTask(taskId);
      tasks.value = tasks.value.filter(task => task.id !== taskId);
      if (currentTask.value?.id === taskId) {
        currentTask.value = null;
      }
    } catch (err) {
      error.value = 'Failed to delete task';
      console.error('Error deleting task:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const setCurrentTask = (task: Task | null) => {
    currentTask.value = task;
  };

  const clearTasks = () => {
    tasks.value = [];
    currentTask.value = null;
    error.value = null;
  };

  return {
    // State
    tasks,
    currentTask,
    loading,
    error,
    
    // Computed
    activeTasks,
    completedTasks,
    highPriorityTasks,
    taskById,
    
    // Actions
    fetchAllTasks,
    fetchCharacterTasks,
    fetchTask,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    setCurrentTask,
    clearTasks,
  };
});