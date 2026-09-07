import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';

export interface Card {
  id: string;
  bankName: string;
  balance: number;
  color1: string;
  color2: string;
  cardNumber: string;
}

export const useCards = () => {
  const [cards, setCards] = useState<Card[]>([]);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      const res = await db.execute('SELECT * FROM cards');
      const data = (res.rows?._array || []) as Card[];
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

  const netWorth = cards.reduce((sum, card) => sum + card.balance, 0);

  return { cards, netWorth, refresh: load };
};
