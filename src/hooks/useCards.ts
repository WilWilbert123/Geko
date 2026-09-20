import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';

export interface Card {
  id: string;
  bankName: string;
  balance: number;
  color1: string;
  color2: string;
  cardNumber: string;
  budget?: number;
}

export const useCards = () => {
  const [cards, setCards] = useState<Card[]>([]);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      try {
        await db.execute('ALTER TABLE cards ADD COLUMN budget REAL DEFAULT 0');
      } catch (mErr) {}
      const res = await db.execute('SELECT * FROM cards');
      const data = (res.rows?._array || []).map((row: any) => ({
        ...row,
        balance: Number(row.balance),
        budget: row.budget ? Number(row.budget) : 0,
      })) as Card[];
      setCards(data);
    } catch (error) {
      console.error('Failed to load cards', error);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = require('react-native').DeviceEventEmitter.addListener('transactions_updated', load);
    return () => sub.remove();
  }, [load]);

  const updateCardBudget = async (cardId: string, newBudget: number) => {
    const db = getDb();
    try {
      try {
        await db.execute('ALTER TABLE cards ADD COLUMN budget REAL DEFAULT 0');
      } catch (mErr) {}
      await db.execute('UPDATE cards SET budget = ? WHERE id = ?', [newBudget, cardId]);
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Failed to update card budget', e);
    }
  };

  const updateCardBalance = async (cardId: string, newBalance: number) => {
    const db = getDb();
    try {
      await db.execute('UPDATE cards SET balance = ? WHERE id = ?', [newBalance, cardId]);
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Failed to update card balance', e);
    }
  };

  const updateCardDetails = async (cardId: string, newBalance: number, newBudget: number) => {
    const db = getDb();
    try {
      try {
        await db.execute('ALTER TABLE cards ADD COLUMN budget REAL DEFAULT 0');
      } catch (mErr) {}
      await db.execute('UPDATE cards SET balance = ?, budget = ? WHERE id = ?', [newBalance, newBudget, cardId]);
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Failed to update card details', e);
    }
  };

  const resetAllCardBalances = async (targetBalance: number = 0) => {
    const db = getDb();
    try {
      await db.execute('UPDATE cards SET balance = ?', [targetBalance]);
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Failed to reset card balances', e);
    }
  };

  const netWorth = cards.reduce((sum, card) => sum + card.balance, 0);

  return { 
    cards, 
    netWorth, 
    updateCardBudget, 
    updateCardBalance, 
    updateCardDetails, 
    resetAllCardBalances, 
    refresh: load 
  };
};
