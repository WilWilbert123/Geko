import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';
import { generateEmbedding } from '../services/ai/engine/embeddingService';
import { insertVector } from '../database/vectorStore';
import { Transaction } from '../types/transaction';
import { uuidv4 } from '../utils/uuid';
import { getBankTheme } from '../utils/bankThemes';

/**
 * Ensures the target bank/card exists in the `cards` table and applies a balance delta
 * (+delta for income/refund, -delta for expense). Accurately handles CREDIT_CARD accounts.
 */
async function applyCardBalanceDelta(bankNameInput: string, delta: number) {
  const db = getDb();
  const bankName = (bankNameInput || 'GCash').trim();
  const lower = bankName.toLowerCase();

  try {
    // Find matching card
    const cardRes = await db.execute(
      `SELECT * FROM cards WHERE LOWER(bankName) = LOWER(?) 
       OR (LOWER(?) = 'gcash' AND (LOWER(bankName) LIKE '%gcash%'))
       OR (LOWER(?) = 'maya' AND (LOWER(bankName) LIKE '%maya%'))
       OR (LOWER(?) = 'cash' AND (LOWER(bankName) = 'physical cash' OR type = 'CASH'))
       LIMIT 1`,
      [bankName, bankName, bankName, bankName]
    );
    const existing = cardRes.rows?._array?.[0];

    if (!existing) {
      // Auto-create the card so totalAssets & Wallet stay 100% synchronized with transactions
      const theme = getBankTheme(bankName);
      const isCash = lower.includes('cash');
      const isCredit = lower.includes('credit') || lower === 'visa' || lower === 'mastercard';
      const cardType = isCash ? 'CASH' : isCredit ? 'CREDIT_CARD' : 'EWALLET';
      const cardId = isCash ? 'card-physical-cash' : uuidv4();
      const cardNum = isCash ? 'CASH' : `•••• ${Math.floor(1000 + Math.random() * 9000)}`;
      const creditLimit = isCredit ? 50000 : 0;
      const initialDebt = isCredit ? Math.max(0, -delta) : 0;
      const initialAvail = isCredit ? Math.max(0, creditLimit - initialDebt) : 0;
      const initialBal = isCredit ? 0 : delta;

      await db.execute(
        `INSERT INTO cards (id, bankName, balance, color1, color2, cardNumber, budget, type, paymentNetwork, creditLimit, availableCredit, outstandingBalance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cardId,
          isCash ? 'Cash' : bankName,
          initialBal,
          theme.bg1,
          theme.bg2,
          cardNum,
          0,
          cardType,
          theme.network || 'OTHER',
          creditLimit,
          initialAvail,
          initialDebt,
        ]
      );
      require('react-native').DeviceEventEmitter.emit('cards_updated');
      return;
    }

    if (existing.type === 'CREDIT_CARD') {
      // For credit cards: expense (delta < 0) increases outstandingBalance; income/payment (delta > 0) reduces outstandingBalance
      const oldDebt = Number(existing.outstandingBalance || 0);
      const limit = Number(existing.creditLimit || 50000);
      const newDebt = Math.max(0, oldDebt - delta);
      const newAvail = Math.max(0, limit - newDebt);
      await db.execute(
        'UPDATE cards SET outstandingBalance = ?, availableCredit = ? WHERE id = ?',
        [newDebt, newAvail, existing.id]
      );
    } else {
      const oldBal = Number(existing.balance || 0);
      const newBal = oldBal + delta;
      await db.execute('UPDATE cards SET balance = ? WHERE id = ?', [newBal, existing.id]);
    }
  } catch (e) {
    console.warn('Failed to synchronize card balance:', e);
  }
}

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      try {
        await db.execute(`
          UPDATE transactions 
          SET categoryId = 'Shopping', note = 'Cleanser at Facial Wash' 
          WHERE (LOWER(note) LIKE '%facial wash%' OR LOWER(note) LIKE '%cleanser%')
            AND (categoryId = 'Food' OR LOWER(note) LIKE '%facial wash cash%')
        `);
      } catch (e) {}

      const res = await db.execute('SELECT * FROM transactions ORDER BY CAST(date AS INTEGER) DESC');
      const data = ((res.rows?._array || []) as any[]).map(row => ({
        ...row,
        amount: Number(row.amount || 0),
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
      // 1. Insert into relational DB
      const res = await db.execute(
        'INSERT INTO transactions (id, amount, type, categoryId, date, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, t.amount, t.type, t.categoryId, t.date, t.note || '', bankName]
      );
      const rowId = res.insertId;

      // 2. Synchronize card balance (+amount for income, -amount for expense)
      const delta = t.type === 'income' ? t.amount : -t.amount;
      await applyCardBalanceDelta(bankName, delta);

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

      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (error) {
      console.error('Failed to add transaction', error);
      throw error;
    }
  };

  /**
   * Deletes a transaction and accurately reverses its balance impact on the associated card/account
   */
  const deleteTransaction = async (transactionId: string) => {
    const db = getDb();
    try {
      const existingRes = await db.execute('SELECT * FROM transactions WHERE id = ?', [transactionId]);
      const tx = existingRes.rows?._array?.[0];
      if (tx) {
        const amt = Number(tx.amount || 0);
        const reverseDelta = tx.type === 'income' ? -amt : amt;
        await applyCardBalanceDelta(tx.bankName || 'GCash', reverseDelta);
      }

      await db.execute('DELETE FROM transactions WHERE id = ?', [transactionId]);
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (error) {
      console.error('Failed to delete transaction', error);
      throw error;
    }
  };

  /**
   * Updates an existing transaction and reconciles card balances for old vs new values
   */
  const updateTransaction = async (
    transactionId: string,
    updates: {
      amount: number;
      type: 'income' | 'expense';
      categoryId: string;
      note?: string;
      bankName: string;
    }
  ) => {
    const db = getDb();
    try {
      const existingRes = await db.execute('SELECT * FROM transactions WHERE id = ?', [transactionId]);
      const oldTx = existingRes.rows?._array?.[0];
      if (oldTx) {
        const oldAmt = Number(oldTx.amount || 0);
        const reverseOld = oldTx.type === 'income' ? -oldAmt : oldAmt;
        await applyCardBalanceDelta(oldTx.bankName || 'GCash', reverseOld);
      }

      await db.execute(
        'UPDATE transactions SET amount = ?, type = ?, categoryId = ?, note = ?, bankName = ? WHERE id = ?',
        [updates.amount, updates.type, updates.categoryId, updates.note || '', updates.bankName, transactionId]
      );

      const newDelta = updates.type === 'income' ? updates.amount : -updates.amount;
      await applyCardBalanceDelta(updates.bankName, newDelta);

      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (error) {
      console.error('Failed to update transaction', error);
      throw error;
    }
  };

  /**
   * Transfers funds between two accounts (deducts from source account, credits destination account)
   */
  const transferBetweenAccounts = async (params: {
    fromBank: string;
    toBank: string;
    amount: number;
    note?: string;
    date?: number;
  }) => {
    const db = getDb();
    const timestamp = params.date || Date.now();
    const cleanNote = params.note?.trim()
      ? `${params.note.trim()} (${params.fromBank} → ${params.toBank})`
      : `Transfer: ${params.fromBank} → ${params.toBank}`;

    try {
      // 1. Outflow from source account
      await db.execute(
        'INSERT INTO transactions (id, amount, type, categoryId, date, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), params.amount, 'expense', 'Transfer', timestamp, cleanNote, params.fromBank]
      );
      await applyCardBalanceDelta(params.fromBank, -params.amount);

      // 2. Inflow to destination account
      await db.execute(
        'INSERT INTO transactions (id, amount, type, categoryId, date, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), params.amount, 'income', 'Transfer', timestamp + 1, cleanNote, params.toBank]
      );
      await applyCardBalanceDelta(params.toBank, params.amount);

      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (error) {
      console.error('Failed to transfer between accounts', error);
      throw error;
    }
  };

  return {
    transactions,
    balance,
    isLoading,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    transferBetweenAccounts,
    refresh: load,
  };
};
