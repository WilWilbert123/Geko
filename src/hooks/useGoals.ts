import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';
import { uuidv4 } from '../utils/uuid';
import { DeviceEventEmitter } from 'react-native';

export interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  targetDate: string;
  iconName: string;
  imageUrl?: string;
}

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      const res = await db.execute('SELECT * FROM goals');
      const data = ((res.rows?._array || []) as any[]).map(r => ({
        ...r,
        current: Number(r.current || 0),
        target: Number(r.target || 0),
        imageUrl: r.imageUrl || undefined,
      })) as Goal[];
      setGoals(data);
    } catch (error) {
      console.error('Failed to load goals', error);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener('goals_updated', load);
    return () => sub.remove();
  }, [load]);

  const addGoal = async (newGoal: {
    title: string;
    target: number;
    current?: number;
    targetDate?: string;
    iconName?: string;
    imageUrl?: string;
  }) => {
    const db = getDb();
    const id = uuidv4();
    const current = newGoal.current || 0;
    const targetDate = newGoal.targetDate || 'Dec 2026';
    const iconName = newGoal.iconName || 'Target';
    const imageUrl = newGoal.imageUrl || null;

    try {
      await db.execute(
        'INSERT INTO goals (id, title, current, target, targetDate, iconName, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, newGoal.title, current, newGoal.target, targetDate, iconName, imageUrl]
      );
      await load();
      DeviceEventEmitter.emit('goals_updated');
    } catch (e) {
      console.error('Failed to add goal', e);
      throw e;
    }
  };

  const updateGoalProgress = async (id: string, newCurrent: number) => {
    const db = getDb();
    try {
      await db.execute('UPDATE goals SET current = ? WHERE id = ?', [newCurrent, id]);
      await load();
      DeviceEventEmitter.emit('goals_updated');
    } catch (e) {
      console.error('Failed to update goal progress', e);
    }
  };

  const updateGoalImage = async (id: string, imageUrl: string | null) => {
    const db = getDb();
    try {
      await db.execute('UPDATE goals SET imageUrl = ? WHERE id = ?', [imageUrl, id]);
      await load();
      DeviceEventEmitter.emit('goals_updated');
    } catch (e) {
      console.error('Failed to update goal image', e);
    }
  };

  const updateGoal = async (id: string, updates: { title?: string; target?: number; targetDate?: string; iconName?: string; imageUrl?: string | null }) => {
    const db = getDb();
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
      if (updates.target !== undefined) { fields.push('target = ?'); values.push(updates.target); }
      if (updates.targetDate !== undefined) { fields.push('targetDate = ?'); values.push(updates.targetDate); }
      if (updates.iconName !== undefined) { fields.push('iconName = ?'); values.push(updates.iconName); }
      if (updates.imageUrl !== undefined) { fields.push('imageUrl = ?'); values.push(updates.imageUrl); }

      if (fields.length > 0) {
        values.push(id);
        await db.execute(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`, values);
        await load();
        DeviceEventEmitter.emit('goals_updated');
      }
    } catch (e) {
      console.error('Failed to update goal', e);
    }
  };

  const deleteGoal = async (id: string) => {
    const db = getDb();
    try {
      await db.execute('DELETE FROM goals WHERE id = ?', [id]);
      await load();
      DeviceEventEmitter.emit('goals_updated');
    } catch (e) {
      console.error('Failed to delete goal', e);
    }
  };

  const clearAllGoals = async () => {
    const db = getDb();
    try {
      await db.execute('DELETE FROM goals');
      await load();
      DeviceEventEmitter.emit('goals_updated');
    } catch (e) {
      console.error('Failed to clear goals', e);
    }
  };

  return {
    goals,
    addGoal,
    updateGoalProgress,
    updateGoalImage,
    updateGoal,
    deleteGoal,
    clearAllGoals,
    refresh: load,
  };
};
