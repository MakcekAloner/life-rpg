import { Request, Response } from 'express';
import pool from '../database/connection';

export const getSkillsByCharacter = async (req: Request, res: Response) => {
  try {
    const { character_id } = req.params;
    
    const skillsResult = await pool.query(
      'SELECT * FROM skills WHERE character_id = $1 ORDER BY name ASC',
      [character_id]
    );
    
    const milestonesResult = await pool.query(
      'SELECT * FROM skill_milestones WHERE character_id = $1 ORDER BY skill_id, "order" ASC',
      [character_id]
    );
    
    const skills = skillsResult.rows.map((skill: any) => ({
      ...skill,
      milestones: milestonesResult.rows.filter((m: any) => m.skill_id === skill.id)
    }));
    
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSkill = async (req: Request, res: Response) => {
  try {
    const {
      character_id,
      name,
      description,
      category,
      max_level,
      parent_skill_id,
      icon
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO skills (character_id, name, description, category, max_level, parent_skill_id, icon, level, current_xp, xp_required, is_unlocked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, false)
       RETURNING *`,
      [character_id, name, description, category, max_level || 10, parent_skill_id || null, icon || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSkill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, icon, max_level } = req.body;
    
    const result = await pool.query(
      `UPDATE skills 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           icon = COALESCE($4, icon),
           max_level = COALESCE($5, max_level),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, description, category, icon, max_level, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSkill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM skill_milestones WHERE skill_id = $1', [id]);
    const result = await pool.query('DELETE FROM skills WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createMilestone = async (req: Request, res: Response) => {
  try {
    const { skill_id } = req.params;
    const { character_id, title, description, order } = req.body;
    
    const skillResult = await pool.query('SELECT id FROM skills WHERE id = $1', [skill_id]);
    if (skillResult.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    const result = await pool.query(
      `INSERT INTO skill_milestones (skill_id, character_id, title, description, "order")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [skill_id, character_id, title, description, order || 1]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMilestone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, order } = req.body;
    
    const result = await pool.query(
      `UPDATE skill_milestones 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           "order" = COALESCE($3, "order"),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [title, description, order, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMilestone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM skill_milestones WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const achieveMilestone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { achieved } = req.body;
    const isAchieved = achieved !== false;
    
    const result = await pool.query(
      `UPDATE skill_milestones 
       SET is_achieved = $1,
           achieved_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [isAchieved, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    const milestone = result.rows[0];
    
    // Update skill level based on achieved milestones
    const countResult = await pool.query(
      'SELECT COUNT(*) FILTER (WHERE is_achieved = true) as achieved_count, COUNT(*) as total FROM skill_milestones WHERE skill_id = $1',
      [milestone.skill_id]
    );
    
    const achievedCount = parseInt(countResult.rows[0]?.achieved_count || '0');
    const totalCount = parseInt(countResult.rows[0]?.total || '1');
    const newLevel = Math.min(10, Math.ceil((achievedCount / totalCount) * 10));
    const isUnlocked = achievedCount > 0;
    
    await pool.query(
      `UPDATE skills 
       SET level = $1, is_unlocked = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newLevel, isUnlocked, milestone.skill_id]
    );
    
    res.json(milestone);
  } catch (error) {
    console.error('Error achieving milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
