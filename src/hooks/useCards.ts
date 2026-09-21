import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';
import { uuidv4 } from '../utils/uuid';

export interface Card {
  id: string;
  bankName: string;
  balance: number;
  color1: string;
  color2: string;
  cardNumber: string;
  budget?: number;
  type?: 'CASH' | 'BANK' | 'EWALLET' | 'DEBIT' | 'CREDIT_CARD' | 'SAVINGS' | 'OTHER';
  institution?: string;
  paymentNetwork?: 'VISA' | 'MASTERCARD' | 'OTHER';
  creditLimit?: number;
  availableCredit?: number;
  outstandingBalance?: number;
  statementDate?: string;
  dueDate?: string;
  minimumPayment?: number;
}

export const useCards = () => {
  const [cards, setCards] = useState<Card[]>([]);

  const load = useCallback(async () => {
    const db = getDb();
    try {
      const res = await db.execute('SELECT * FROM cards');
      const data = (res.rows?._array || []).map((row: any) => ({
        ...row,
        balance: Number(row.balance || 0),
        budget: row.budget ? Number(row.budget) : 0,
        creditLimit: row.creditLimit ? Number(row.creditLimit) : 0,
        availableCredit: row.availableCredit ? Number(row.availableCredit) : 0,
        outstandingBalance: row.outstandingBalance ? Number(row.outstandingBalance) : 0,
        minimumPayment: row.minimumPayment ? Number(row.minimumPayment) : 0,
        type: row.type || (row.bankName === 'Visa' ? 'CREDIT_CARD' : 'EWALLET'),
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
      const currentRes = await db.execute('SELECT * FROM cards WHERE id = ?', [cardId]);
      const card = currentRes.rows?._array[0];

      if (card) {
        const oldBalance = Number(card.balance || 0);
        const diff = newBalance - oldBalance;

        await db.execute('UPDATE cards SET balance = ? WHERE id = ?', [newBalance, cardId]);

        if (Math.abs(diff) > 0.01) {
          const newId = uuidv4();
          const date = Date.now();
          const bankName = card.bankName || 'GCash';

          if (diff > 0) {
            await db.execute(
              'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [newId, diff, date, 'Salary', 'income', `${bankName} Deposit`, bankName]
            );
          } else {
            const absDiff = Math.abs(diff);
            await db.execute(
              'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [newId, absDiff, date, 'Adjustment', 'expense', `${bankName} Adjustment`, bankName]
            );
          }
        }
      } else {
        await db.execute('UPDATE cards SET balance = ? WHERE id = ?', [newBalance, cardId]);
      }

      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Failed to update card balance', e);
    }
  };

  const updateCardDetails = async (cardId: string, newBalance: number, newBudget: number) => {
    const db = getDb();
    try {
      const currentRes = await db.execute('SELECT * FROM cards WHERE id = ?', [cardId]);
      const card = currentRes.rows?._array[0];

      if (card) {
        const oldBalance = Number(card.balance || 0);
        const diff = newBalance - oldBalance;

        await db.execute('UPDATE cards SET balance = ?, budget = ? WHERE id = ?', [newBalance, newBudget, cardId]);

        if (Math.abs(diff) > 0.01) {
          const newId = uuidv4();
          const date = Date.now();
          const bankName = card.bankName || 'GCash';

          if (diff > 0) {
            await db.execute(
              'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [newId, diff, date, 'Salary', 'income', `${bankName} Deposit`, bankName]
            );
          } else {
            const absDiff = Math.abs(diff);
            await db.execute(
              'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [newId, absDiff, date, 'Adjustment', 'expense', `${bankName} Adjustment`, bankName]
            );
          }
        }
      } else {
        await db.execute('UPDATE cards SET balance = ?, budget = ? WHERE id = ?', [newBalance, newBudget, cardId]);
      }

      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Failed to update card details', e);
    }
  };

  const resetAllCardBalances = async (targetBalance: number = 0) => {
    const db = getDb();
    try {
      await db.execute('UPDATE cards SET balance = ? WHERE type != "CREDIT_CARD"', [targetBalance]);
      await db.execute('UPDATE cards SET outstandingBalance = 0, availableCredit = creditLimit WHERE type = "CREDIT_CARD"');
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Failed to reset card balances', e);
    }
  };

  // Financial Engine Calculations:
  // Total Assets = Sum of balances of Cash / Bank / E-Wallet / Debit / Savings accounts
  const totalAssets = cards
    .filter(c => c.type !== 'CREDIT_CARD')
    .reduce((sum, card) => sum + card.balance, 0);

  // Credit Debt = Sum of outstanding debt on Credit Cards
  const creditDebt = cards
    .filter(c => c.type === 'CREDIT_CARD')
    .reduce((sum, card) => sum + (card.outstandingBalance || 0), 0);

  // Net Worth = Total Assets - Credit Debt
  const netWorth = totalAssets - creditDebt;

  const addCard = async (newCard: {
    bankName: string;
    balance: number;
    type?: string;
    paymentNetwork?: string;
    creditLimit?: number;
    budget?: number;
    color1?: string;
    color2?: string;
  }) => {
    const db = getDb();
    const id = uuidv4();
    const color1 = newCard.color1 || '#1E293B';
    const color2 = newCard.color2 || '#334155';
    const cardNumber = `•••• ${Math.floor(1000 + Math.random() * 9000)}`;
    const cardType = newCard.type || 'EWALLET';
    const network = newCard.paymentNetwork || 'VISA';
    const limit = newCard.creditLimit || 0;
    const avail = cardType === 'CREDIT_CARD' ? limit : 0;

    try {
      await db.execute(
        `INSERT INTO cards (id, bankName, balance, color1, color2, cardNumber, budget, type, paymentNetwork, creditLimit, availableCredit, outstandingBalance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, newCard.bankName, newCard.balance, color1, color2, cardNumber, newCard.budget || 0, cardType, network, limit, avail, 0]
      );

      if (newCard.balance > 0 && cardType !== 'CREDIT_CARD') {
        const newId = uuidv4();
        await db.execute(
          'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [newId, newCard.balance, Date.now(), 'Salary', 'income', `${newCard.bankName} Deposit`, newCard.bankName]
        );
      }

      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Failed to add card', e);
      throw e;
    }
  };

  const deleteCard = async (cardId: string) => {
    const db = getDb();
    try {
      await db.execute('DELETE FROM cards WHERE id = ?', [cardId]);
      await load();
      require('react-native').DeviceEventEmitter.emit('transactions_updated');
    } catch (e) {
      console.error('Failed to delete card', e);
    }
  };

  return {
    cards,
    totalAssets,
    creditDebt,
    netWorth,
    refresh: load,
    updateCardBudget,
    updateCardBalance,
    updateCardDetails,
    resetAllCardBalances,
    addCard,
    deleteCard,
  };
};
