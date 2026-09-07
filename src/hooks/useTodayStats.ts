import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';
import { DeviceEventEmitter } from 'react-native';

export const useTodayStats = () => {
  const [spentToday, setSpentToday] = useState(0);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      // Get today's date in YYYY-MM-DD format based on local time
      const today = new Date().toISOString().split('T')[0];
      
      const res = await db.execute(
        `SELECT SUM(amount) as total 
         FROM transactions 
         WHERE type = 'expense' 
         AND date LIKE ?`,
        [`${today}%`]
      );
      
      const total = res.rows?._array[0]?.total || 0;
      setSpentToday(total);
    } catch (error) {
      console.error('Failed to load today stats:', error);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener('transactions_updated', load);
    return () => sub.remove();
  }, [load]);

  return { spentToday, refresh: load };
};
