import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { playerApi, Player, PlayerStats } from '../api/playerApi';

export const usePlayerStore = defineStore('player', () => {
  // State
  const currentPlayer = ref<Player | null>(null);
  const playerStats = ref<PlayerStats | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const xpProgress = computed(() => {
    if (!currentPlayer.value) return 0;
    return (currentPlayer.value.current_xp / currentPlayer.value.next_level_xp) * 100;
  });

  const isLoaded = computed(() => currentPlayer.value !== null);

  // Actions
  const fetchPlayer = async (playerId: string) => {
    loading.value = true;
    error.value = null;
    try {
      currentPlayer.value = await playerApi.getPlayer(playerId);
    } catch (err) {
      error.value = 'Failed to fetch player';
      console.error('Error fetching player:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchPlayerStats = async (playerId: string) => {
    loading.value = true;
    error.value = null;
    try {
      playerStats.value = await playerApi.getPlayerStats(playerId);
    } catch (err) {
      error.value = 'Failed to fetch player stats';
      console.error('Error fetching player stats:', err);
    } finally {
      loading.value = false;
    }
  };

  const addXP = async (xpData: {
    amount: number;
    source: string;
    description: string;
    character_id?: string;
  }) => {
    if (!currentPlayer.value) return;
    
    loading.value = true;
    error.value = null;
    try {
      const result = await playerApi.addXP(currentPlayer.value.id, xpData);
      currentPlayer.value = result.player;
      return result;
    } catch (err) {
      error.value = 'Failed to add XP';
      console.error('Error adding XP:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const addCurrency = async (currencyData: {
    amount: number;
    transaction_type: 'earn' | 'spend' | 'penalty' | 'bonus';
    source: string;
    description: string;
  }) => {
    if (!currentPlayer.value) return;
    
    loading.value = true;
    error.value = null;
    try {
      const result = await playerApi.addCurrency(currentPlayer.value.id, currencyData);
      currentPlayer.value = result.player;
      return result;
    } catch (err) {
      error.value = 'Failed to add currency';
      console.error('Error adding currency:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createPlayer = async (playerData: {
    username: string;
    email: string;
    display_name: string;
    bio?: string;
  }) => {
    loading.value = true;
    error.value = null;
    try {
      currentPlayer.value = await playerApi.createPlayer(playerData);
      return currentPlayer.value;
    } catch (err) {
      error.value = 'Failed to create player';
      console.error('Error creating player:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePlayer = async (playerData: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  }) => {
    if (!currentPlayer.value) return;
    
    loading.value = true;
    error.value = null;
    try {
      currentPlayer.value = await playerApi.updatePlayer(currentPlayer.value.id, playerData);
    } catch (err) {
      error.value = 'Failed to update player';
      console.error('Error updating player:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearPlayer = () => {
    currentPlayer.value = null;
    playerStats.value = null;
    error.value = null;
  };

  return {
    // State
    currentPlayer,
    playerStats,
    loading,
    error,
    
    // Computed
    xpProgress,
    isLoaded,
    
    // Actions
    fetchPlayer,
    fetchPlayerStats,
    addXP,
    addCurrency,
    createPlayer,
    updatePlayer,
    clearPlayer,
  };
});