import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';

export interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  targetDate: string;
  iconName: string;
}

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      const res = await db.execute('SELECT * FROM goals');
      const data = (res.rows?._array || []) as Goal[];
      setGoals(data);
    } catch (error) {
      console.error('Failed to load goals', error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { goals, refresh: load };
};
