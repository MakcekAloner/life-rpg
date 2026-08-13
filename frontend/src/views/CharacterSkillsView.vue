<template>
  <div class="skills-page">
    <header class="skills-header" v-if="character">
      <h1 class="header-title">{{ character.name }} · Skills</h1>
      <p class="header-sub">Реальные навыки персонажа, независимые от миссий</p>
    </header>
    
    <div class="skills-content">
      <div class="skills-list" v-if="skills.length > 0">
        <div v-for="skill in skills" :key="skill.id" class="skill-card">
          <div class="skill-header">
            <div class="skill-main">
              <span class="skill-icon">{{ skill.icon || '📌' }}</span>
              <div class="skill-info">
                <div class="skill-name">{{ skill.name }}</div>
                <div class="skill-level">Level {{ skill.level }} / {{ skill.max_level }}</div>
              </div>
            </div>
            <div class="skill-actions">
              <button class="icon-btn" @click="startAddMilestone(skill)" title="Добавить milestone">+</button>
              <button class="icon-btn delete" @click="deleteSkill(skill.id)" title="Удалить skill">×</button>
            </div>
          </div>
          
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: skillProgress(skill) + '%' }"></div>
          </div>
          
          <div class="milestones-list">
            <div 
              v-for="(milestone, index) in orderedMilestones(skill)" 
              :key="milestone.id"
              class="milestone-row"
              :class="{ achieved: milestone.is_achieved }"
            >
              <span class="milestone-status" @click="toggleMilestone(milestone)">
                {{ milestone.is_achieved ? '✓' : '○' }}
              </span>
              <span class="milestone-order">{{ index + 1 }}.</span>
              <span class="milestone-title">{{ milestone.title }}</span>
              <span class="milestone-actions">
                <button class="mini-btn" @click="moveMilestone(milestone, -1)" :disabled="index === 0">▲</button>
                <button class="mini-btn" @click="moveMilestone(milestone, 1)" :disabled="index === orderedMilestones(skill).length - 1">▼</button>
                <button class="mini-btn delete" @click="deleteMilestone(milestone.id)">×</button>
              </span>
            </div>
          </div>
          
          <div v-if="addingMilestoneFor === skill.id" class="inline-form">
            <input 
              v-model="newMilestone.title"
              type="text"
              class="form-input"
              placeholder="Название milestone"
              @keyup.enter="createMilestone(skill)"
            />
            <input 
              v-model="newMilestone.description"
              type="text"
              class="form-input"
              placeholder="Описание (опционально)"
              @keyup.enter="createMilestone(skill)"
            />
            <div class="form-actions">
              <button class="btn-submit" @click="createMilestone(skill)" :disabled="!newMilestone.title.trim()">Добавить</button>
              <button class="btn-cancel" @click="addingMilestoneFor = null">Отмена</button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <p>У персонажа пока нет Skills</p>
      </div>
      
      <div class="add-skill-area">
        <button v-if="!addingSkill" class="btn-add" @click="addingSkill = true">+ Добавить Skill</button>
        <div v-else class="inline-form add-skill-form">
          <input v-model="newSkill.name" type="text" class="form-input" placeholder="Название skill" />
          <input v-model="newSkill.description" type="text" class="form-input" placeholder="Описание (опционально)" />
          <input v-model="newSkill.category" type="text" class="form-input" placeholder="Категория" />
          <div class="form-actions">
            <button class="btn-submit" @click="createSkill" :disabled="!newSkill.name.trim()">Создать</button>
            <button class="btn-cancel" @click="addingSkill = false">Отмена</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="skills-footer">
      <button class="footer-btn" @click="goBack">← Назад</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { characterApi } from '../api/characterApi';
import { skillApi } from '../api/skillApi';

const route = useRoute();
const router = useRouter();
const characterId = route.params.id as string;

const character = ref<any>(null);
const skills = ref<any[]>([]);
const addingSkill = ref(false);
const addingMilestoneFor = ref<string | null>(null);

const newSkill = ref({
  name: '',
  description: '',
  category: 'calisthenics',
});

const newMilestone = ref({
  title: '',
  description: '',
});

const loadCharacter = async () => {
  try {
    character.value = await characterApi.getCharacter(characterId);
  } catch (err) {
    console.error('Error loading character:', err);
  }
};

const loadSkills = async () => {
  try {
    skills.value = await skillApi.getSkillsByCharacter(characterId);
  } catch (err) {
    console.error('Error loading skills:', err);
  }
};

const orderedMilestones = (skill: any) => {
  return [...(skill.milestones || [])].sort((a, b) => a.order - b.order);
};

const skillProgress = (skill: any) => {
  const milestones = skill.milestones || [];
  if (!milestones.length) return 0;
  const achieved = milestones.filter((m: any) => m.is_achieved).length;
  return Math.round((achieved / milestones.length) * 100);
};

const createSkill = async () => {
  if (!newSkill.value.name.trim()) return;
  
  try {
    await skillApi.createSkill({
      character_id: characterId,
      name: newSkill.value.name,
      description: newSkill.value.description,
      category: newSkill.value.category || 'calisthenics',
    });
    
    newSkill.value = { name: '', description: '', category: 'calisthenics' };
    addingSkill.value = false;
    await loadSkills();
  } catch (err) {
    console.error('Error creating skill:', err);
  }
};

const deleteSkill = async (skillId: string) => {
  try {
    await skillApi.deleteSkill(skillId);
    await loadSkills();
  } catch (err) {
    console.error('Error deleting skill:', err);
  }
};

const startAddMilestone = (skill: any) => {
  addingMilestoneFor.value = skill.id;
  newMilestone.value = { title: '', description: '' };
};

const createMilestone = async (skill: any) => {
  if (!newMilestone.value.title.trim()) return;
  
  try {
    const order = (skill.milestones?.length || 0) + 1;
    await skillApi.createMilestone(skill.id, {
      character_id: characterId,
      title: newMilestone.value.title,
      description: newMilestone.value.description,
      order,
    });
    
    addingMilestoneFor.value = null;
    newMilestone.value = { title: '', description: '' };
    await loadSkills();
  } catch (err) {
    console.error('Error creating milestone:', err);
  }
};

const toggleMilestone = async (milestone: any) => {
  try {
    await skillApi.achieveMilestone(milestone.id, !milestone.is_achieved);
    await loadSkills();
  } catch (err) {
    console.error('Error toggling milestone:', err);
  }
};

const moveMilestone = async (milestone: any, direction: number) => {
  try {
    const skill = skills.value.find(s => s.id === milestone.skill_id);
    const list = orderedMilestones(skill);
    const index = list.findIndex(m => m.id === milestone.id);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    
    const other = list[newIndex];
    await skillApi.updateMilestone(milestone.id, { order: other.order });
    await skillApi.updateMilestone(other.id, { order: milestone.order });
    await loadSkills();
  } catch (err) {
    console.error('Error moving milestone:', err);
  }
};

const deleteMilestone = async (milestoneId: string) => {
  try {
    await skillApi.deleteMilestone(milestoneId);
    await loadSkills();
  } catch (err) {
    console.error('Error deleting milestone:', err);
  }
};

const goBack = () => router.push(`/character/${characterId}`);

onMounted(async () => {
  await loadCharacter();
  await loadSkills();
});
</script>

<style scoped>
.skills-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a3d1a 0%, #0f2a0f 100%);
  color: #f4e4a4;
  display: flex;
  flex-direction: column;
}

.skills-header {
  padding: 30px;
  text-align: center;
  background: rgba(0,0,0,0.3);
  border-bottom: 2px solid #8b7355;
}

.header-title { font-size: 1.6rem; margin: 0 0 8px; }
.header-sub { color: #8b7355; margin: 0; font-size: 0.9rem; }

.skills-content {
  flex: 1;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skills-list { display: flex; flex-direction: column; gap: 20px; }

.skill-card {
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 16px;
  padding: 20px;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.skill-main { display: flex; align-items: center; gap: 12px; }
.skill-icon { font-size: 1.6rem; }
.skill-name { font-size: 1.2rem; font-weight: bold; }
.skill-level { font-size: 0.8rem; color: #c9a227; }

.skill-actions { display: flex; gap: 8px; }

.progress-bar {
  height: 10px;
  background: rgba(0,0,0,0.3);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid #8b7355;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #c9a227, #f1c40f);
  transition: width 0.3s;
}

.milestones-list { display: flex; flex-direction: column; gap: 8px; }

.milestone-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  transition: all 0.2s;
}
.milestone-row.achieved { background: rgba(46, 204, 113, 0.1); border: 1px solid #2ecc71; }

.milestone-status {
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 2px solid #8b7355;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: 0.85rem;
  color: #2ecc71;
  flex-shrink: 0;
}
.milestone-row.achieved .milestone-status { border-color: #2ecc71; background: rgba(46,204,113,0.2); }

.milestone-order { color: #8b7355; font-size: 0.8rem; }
.milestone-title { flex: 1; }

.milestone-actions { display: flex; gap: 4px; }
.mini-btn {
  width: 26px; height: 26px;
  border-radius: 6px;
  border: 1px solid #8b7355;
  background: rgba(0,0,0,0.3);
  color: #f4e4a4;
  cursor: pointer;
  font-size: 0.75rem;
}
.mini-btn:hover:not(:disabled) { border-color: #c9a227; }
.mini-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.inline-form {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-input {
  padding: 10px 14px;
  border: 2px solid #8b7355;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #f4e4a4;
  font-size: 0.95rem;
}
.form-input:focus { outline: none; border-color: #c9a227; }

.form-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn-submit {
  background: linear-gradient(180deg, #c9a227, #8b7355);
  border: 2px solid #f4e4a4;
  border-radius: 8px;
  padding: 10px 20px;
  color: #1a3d1a;
  font-weight: bold;
  cursor: pointer;
}
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel {
  background: rgba(74,60,42,0.6);
  border: 2px solid #8b7355;
  border-radius: 8px;
  padding: 10px 18px;
  color: #f4e4a4;
  cursor: pointer;
}

.add-skill-form { background: rgba(74, 60, 42, 0.6); border: 2px solid #8b7355; border-radius: 16px; padding: 16px; }

.add-skill-area { display: flex; flex-direction: column; gap: 12px; }
.btn-add {
  width: 100%;
  padding: 16px;
  background: rgba(74, 60, 42, 0.4);
  border: 2px dashed #8b7355;
  border-radius: 14px;
  color: #f4e4a4;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-add:hover { border-color: #c9a227; color: #c9a227; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #8b7355;
}

.icon-btn {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid #8b7355;
  background: rgba(0,0,0,0.3);
  color: #f4e4a4;
  cursor: pointer;
  font-size: 1rem;
}
.icon-btn:hover { border-color: #c9a227; }
.icon-btn.delete:hover { border-color: #e74c3c; color: #e74c3c; }

.skills-footer {
  padding: 16px;
  background: rgba(0,0,0,0.3);
  border-top: 2px solid #8b7355;
  display: flex;
  justify-content: center;
}

.footer-btn {
  background: rgba(74, 60, 42, 0.5);
  border: 2px solid #8b7355;
  border-radius: 10px;
  padding: 10px 20px;
  color: #f4e4a4;
  cursor: pointer;
  transition: all 0.2s;
}
.footer-btn:hover { border-color: #c9a227; }

@media (max-width: 768px) {
  .skill-header { flex-wrap: wrap; gap: 10px; }
  .milestone-actions { gap: 2px; }
}
</style>
