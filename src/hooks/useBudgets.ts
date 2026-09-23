import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';

export interface Budget {
  id: string;
  categoryName: string;
  limitAmount: number;
  spentAmount: number;
}

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      // Fetch budgets and calculate spent from transactions
      const resBudgets = await db.execute('SELECT * FROM budgets');
      const budgetData = resBudgets.rows?._array || [];

      // For simplicity, we aggregate expenses matching categoryName for now
      // In a real app, we'd map categoryId to categoryName or do a JOIN.
      // Here we assume categoryId in transactions matches categoryName or we just fetch all transactions and sum them up
      const resTx = await db.execute('SELECT * FROM transactions WHERE type="expense"');
      const txData = resTx.rows?._array || [];

      const enriched = budgetData.map((b: any) => {
        // Sum expenses that match this budget's category (naive matching)
        const spent = txData
          .filter((t: any) => t.categoryId.toLowerCase().includes(b.categoryName.toLowerCase().split(' ')[0]))
          .reduce((sum: number, t: any) => sum + t.amount, 0);

        return {
          ...b,
          spentAmount: spent
        };
      });

      setBudgets(enriched);
    } catch (error) {
      console.error('Failed to load budgets', error);
    }
  }, []);

  const updateBudgetLimit = async (id: string, newLimit: number) => {
    const db = getDb();
    try {
      await db.execute('UPDATE budgets SET limitAmount = ? WHERE id = ?', [newLimit, id]);
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Error updating budget limit', e);
    }
  };

  const addBudget = async (categoryName: string, limitAmount: number) => {
    const db = getDb();
    try {
      const { uuidv4 } = require('../utils/uuid');
      await db.execute(
        'INSERT INTO budgets (id, categoryName, limitAmount) VALUES (?, ?, ?)',
        [uuidv4(), categoryName, limitAmount]
      );
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Error adding budget', e);
    }
  };

  const deleteBudget = async (id: string) => {
    const db = getDb();
    try {
      await db.execute('DELETE FROM budgets WHERE id = ?', [id]);
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Error deleting budget', e);
    }
  };

  useEffect(() => {
    load();
    const subscription = require('react-native').DeviceEventEmitter.addListener('transactions_updated', load);
    return () => subscription.remove();
  }, [load]);

  return { budgets, refresh: load, updateBudgetLimit, addBudget, deleteBudget };
};
