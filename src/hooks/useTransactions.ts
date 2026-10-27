import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';
import { generateEmbedding } from '../services/ai/engine/embeddingService';
import { insertVector } from '../database/vectorStore';
import { Transaction } from '../types/transaction';
import { uuidv4 } from '../utils/uuid';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      // Auto-heal facial wash & cleanser transactions miscategorized as Food
      try {
        await db.execute(`
          UPDATE transactions 
          SET categoryId = 'Shopping', note = 'Cleanser at Facial Wash' 
          WHERE (LOWER(note) LIKE '%facial wash%' OR LOWER(note) LIKE '%cleanser%')
            AND (categoryId = 'Food' OR LOWER(note) LIKE '%facial wash cash%')
        `);
      } catch (e) {}

      const res = await db.execute('SELECT * FROM transactions ORDER BY CAST(date AS INTEGER) DESC');
      // Coerce date to number — SQLite may return INTEGER columns as strings
      const data = ((res.rows?._array || []) as any[]).map(row => ({
        ...row,
        date: Number(row.date),
      })) as Transaction[];
      setTransactions(data);

      const sum = data.reduce((acc, t) =>
        t.type === 'income' ? acc + t.amount : acc - t.amount
        , 0);
      setBalance(sum);
    } catch (error) {
      console.error('Failed to load transactions', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = require('react-native').DeviceEventEmitter.addListener('transactions_updated', load);
    return () => sub.remove();
  }, [load]);

  const addTransaction = async (t: Omit<Transaction, 'id' | 'vectorId'>) => {
    const db = getDb();
    const id = uuidv4();
    const bankName = t.bankName || 'GCash';

    try {
      if (bankName.toLowerCase() === 'cash') {
        try {
          const cashCheck = await db.execute("SELECT id FROM cards WHERE LOWER(bankName) = 'cash'");
          if (!cashCheck.rows?._array?.length) {
            await db.execute(
              "INSERT INTO cards (id, bankName, color1, color2, balance, monthlyBudget, type, paymentNetwork, creditLimit, outstandingBalance, availableCredit) VALUES ('card-physical-cash', 'Cash', '#0B0D12', '#10B981', 0, 5000, 'CASH', 'OTHER', 0, 0, 0)"
            );
            require('react-native').DeviceEventEmitter.emit('cards_updated');
          }
        } catch (err) {}
      }

      // 1. Insert into relational DB
      const res = await db.execute(
        'INSERT INTO transactions (id, amount, type, categoryId, date, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, t.amount, t.type, t.categoryId, t.date, t.note || '', bankName]
      );
      const rowId = res.insertId;

      // 2. Update card balance
      try {
        if (t.type === 'expense') {
          await db.execute(
            'UPDATE cards SET balance = balance - ? WHERE LOWER(bankName) = LOWER(?) OR (LOWER(?) = "gcash" AND (LOWER(bankName) = "gcash e-wallet" OR LOWER(bankName) = "gcash ewallet"))',
            [t.amount, bankName, bankName]
          );
        } else if (t.type === 'income') {
          await db.execute(
            'UPDATE cards SET balance = balance + ? WHERE LOWER(bankName) = LOWER(?) OR (LOWER(?) = "gcash" AND (LOWER(bankName) = "gcash e-wallet" OR LOWER(bankName) = "gcash ewallet"))',
            [t.amount, bankName, bankName]
          );
        }
      } catch (e) {
        console.warn('Failed to update card balance', e);
      }

      // 3. Generate vector embedding asynchronously so UI doesn't block
      setTimeout(async () => {
        try {
          const textToEmbed = `${t.type} of ${t.amount} in category ${t.categoryId} ${bankName} on ${new Date(t.date).toISOString()}. Note: ${t.note}`;
          const embedding = await generateEmbedding(textToEmbed);
          if (rowId !== undefined) {
            await insertVector(rowId, embedding);
          }
        } catch (e) {
          console.error('Vector generation failed', e);
        }
      }, 0);

      load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (error) {
      console.error('Failed to add transaction', error);
      throw error;
    }
  };

  return { transactions, balance, isLoading, addTransaction, refresh: load };
};
