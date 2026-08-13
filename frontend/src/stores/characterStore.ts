import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { characterApi, Character } from '../api/characterApi';

export const useCharacterStore = defineStore('character', () => {
  // State
  const characters = ref<Character[]>([]);
  const currentCharacter = ref<Character | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const activeCharacters = computed(() => {
    return characters.value.filter(char => char.is_active);
  });

  const characterById = computed(() => {
    return (id: string) => characters.value.find(char => char.id === id);
  });

  // Actions
  const fetchCharacters = async (playerId: string) => {
    loading.value = true;
    error.value = null;
    try {
      characters.value = await characterApi.getCharacters(playerId);
    } catch (err) {
      error.value = 'Failed to fetch characters';
      console.error('Error fetching characters:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchCharacter = async (characterId: string) => {
    loading.value = true;
    error.value = null;
    try {
      currentCharacter.value = await characterApi.getCharacter(characterId);
    } catch (err) {
      error.value = 'Failed to fetch character';
      console.error('Error fetching character:', err);
    } finally {
      loading.value = false;
    }
  };

  const createCharacter = async (characterData: {
    player_id: string;
    name: string;
    title: string;
    description: string;
    starting_form: string;
    final_form: string;
    current_form: string;
    story_arc: string;
    weaknesses: string[];
    abilities: string[];
  }) => {
    loading.value = true;
    error.value = null;
    try {
      const newCharacter = await characterApi.createCharacter(characterData);
      characters.value.push(newCharacter);
      return newCharacter;
    } catch (err) {
      error.value = 'Failed to create character';
      console.error('Error creating character:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCharacter = async (
    characterId: string,
    characterData: {
      current_form?: string;
      level?: number;
      current_xp?: number;
      story_arc?: string;
      is_active?: boolean;
    }
  ) => {
    loading.value = true;
    error.value = null;
    try {
      const updatedCharacter = await characterApi.updateCharacter(characterId, characterData);
      const index = characters.value.findIndex(char => char.id === characterId);
      if (index !== -1) {
        characters.value[index] = updatedCharacter;
      }
      if (currentCharacter.value?.id === characterId) {
        currentCharacter.value = updatedCharacter;
      }
      return updatedCharacter;
    } catch (err) {
      error.value = 'Failed to update character';
      console.error('Error updating character:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const addCharacterXP = async (
    characterId: string,
    xpData: {
      amount: number;
      source: string;
      description: string;
    }
  ) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await characterApi.addCharacterXP(characterId, xpData);
      const index = characters.value.findIndex(char => char.id === characterId);
      if (index !== -1) {
        characters.value[index] = result.character;
      }
      if (currentCharacter.value?.id === characterId) {
        currentCharacter.value = result.character;
      }
      return result;
    } catch (err) {
      error.value = 'Failed to add character XP';
      console.error('Error adding character XP:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCharacter = async (characterId: string) => {
    loading.value = true;
    error.value = null;
    try {
      await characterApi.deleteCharacter(characterId);
      characters.value = characters.value.filter(char => char.id !== characterId);
      if (currentCharacter.value?.id === characterId) {
        currentCharacter.value = null;
      }
    } catch (err) {
      error.value = 'Failed to delete character';
      console.error('Error deleting character:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const setCurrentCharacter = (character: Character | null) => {
    currentCharacter.value = character;
  };

  const clearCharacters = () => {
    characters.value = [];
    currentCharacter.value = null;
    error.value = null;
  };

  return {
    // State
    characters,
    currentCharacter,
    loading,
    error,
    
    // Computed
    activeCharacters,
    characterById,
    
    // Actions
    fetchCharacters,
    fetchCharacter,
    createCharacter,
    updateCharacter,
    addCharacterXP,
    deleteCharacter,
    setCurrentCharacter,
    clearCharacters,
  };
});