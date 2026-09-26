import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';
import { DeviceEventEmitter } from 'react-native';

export const useTodayStats = () => {
  const [spentToday, setSpentToday] = useState(0);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      const res = await db.execute(
        `SELECT SUM(amount) as total 
         FROM transactions 
         WHERE (type = 'expense' OR type = 'credit_purchase') 
           AND CAST(date AS INTEGER) >= ? 
           AND CAST(date AS INTEGER) <= ?`,
        [startOfToday, endOfToday]
      );

      const total = Number(res.rows?._array[0]?.total || 0);
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
