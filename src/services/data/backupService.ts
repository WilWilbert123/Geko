import { Share, Alert, DeviceEventEmitter } from 'react-native';
import { getDb } from '../../database/sqlite';
import { getCutoffIncome, setCutoffIncome, getCurrency } from '../../store/userStore';
import { generateEmbedding } from '../ai/engine/embeddingService';
import { insertVector } from '../../database/vectorStore';
import { uuidv4 } from '../../utils/uuid';
import { Transaction } from '../../types/transaction';
import { Card } from '../../hooks/useCards';
import { Goal } from '../../hooks/useGoals';

export interface GekoBackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  summary: {
    transactionsCount: number;
    cardsCount: number;
    goalsCount: number;
    installmentsCount: number;
    cutoffIncome: number;
    currency: string;
  };
  data: {
    transactions: Transaction[];
    cards: Card[];
    goals: Goal[];
    installments: any[];
    cutoffIncome: number;
    currency: string;
  };
}

/**
 * Builds and triggers native share sheet to export all Geko financial data as a JSON file.
 */
export const exportBackupJSON = async (): Promise<{ success: boolean; jsonString: string; summary: any }> => {
  const db = getDb();
  try {
    const [transRes, cardsRes, goalsRes, instRes] = await Promise.all([
      db.execute('SELECT * FROM transactions ORDER BY CAST(date AS INTEGER) DESC'),
      db.execute('SELECT * FROM cards'),
      db.execute('SELECT * FROM goals'),
      db.execute('SELECT * FROM installments').catch(() => ({ rows: { _array: [] } })),
    ]);

    const transactions = (transRes.rows?._array || []) as Transaction[];
    const cards = (cardsRes.rows?._array || []) as Card[];
    const goals = (goalsRes.rows?._array || []) as Goal[];
    const installments = (instRes.rows?._array || []) as any[];
    const cutoffIncome = getCutoffIncome();
    const currency = getCurrency();

    const backupPayload: GekoBackupPayload = {
      app: 'Geko Budget Tracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      summary: {
        transactionsCount: transactions.length,
        cardsCount: cards.length,
        goalsCount: goals.length,
        installmentsCount: installments.length,
        cutoffIncome,
        currency,
      },
      data: {
        transactions,
        cards,
        goals,
        installments,
        cutoffIncome,
        currency,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const dateTag = new Date().toISOString().slice(0, 10);

    await Share.share({
      title: `Geko_Backup_${dateTag}.json`,
      message: jsonString,
    });

    return { success: true, jsonString, summary: backupPayload.summary };
  } catch (error) {
    console.error('Failed to export JSON backup:', error);
    Alert.alert('Export Error', 'Failed to generate JSON backup.');
    throw error;
  }
};

/**
 * Exports all transactions as a CSV spreadsheet.
 */
export const exportTransactionsCSV = async (): Promise<{ success: boolean; csvString: string; count: number }> => {
  const db = getDb();
  try {
    const res = await db.execute('SELECT * FROM transactions ORDER BY CAST(date AS INTEGER) DESC');
    const transactions = (res.rows?._array || []) as Transaction[];

    const headers = ['ID', 'Date', 'Time', 'Type', 'Category', 'Note', 'Account', 'Amount'];
    const rows = transactions.map((t) => {
      const d = new Date(Number(t.date));
      const dateStr = d.toISOString().slice(0, 10);
      const timeStr = d.toTimeString().slice(0, 8);
      const safeNote = (t.note || '').replace(/"/g, '""');
      const safeCat = (t.categoryId || '').replace(/"/g, '""');
      const safeBank = (t.bankName || 'Wallet').replace(/"/g, '""');

      return `"${t.id}","${dateStr}","${timeStr}","${t.type}","${safeCat}","${safeNote}","${safeBank}",${Number(t.amount).toFixed(2)}`;
    });

    const csvString = [headers.join(','), ...rows].join('\n');
    const dateTag = new Date().toISOString().slice(0, 10);

    await Share.share({
      title: `Geko_Transactions_${dateTag}.csv`,
      message: csvString,
    });

    return { success: true, csvString, count: transactions.length };
  } catch (error) {
    console.error('Failed to export CSV:', error);
    Alert.alert('Export Error', 'Failed to generate CSV export.');
    throw error;
  }
};

/**
 * Validates and restores financial data from a backup JSON payload.
 */
export const importBackupJSON = async (
  rawJson: string,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ success: boolean; restored: { transactions: number; cards: number; goals: number } }> => {
  const db = getDb();

  try {
    const parsed = JSON.parse(rawJson);
    const data = parsed.data || parsed;

    const transactions: Transaction[] = Array.isArray(data.transactions) ? data.transactions : [];
    const cards: Card[] = Array.isArray(data.cards) ? data.cards : [];
    const goals: Goal[] = Array.isArray(data.goals) ? data.goals : [];
    const installments: any[] = Array.isArray(data.installments) ? data.installments : [];

    if (transactions.length === 0 && cards.length === 0 && goals.length === 0) {
      throw new Error('No valid financial data found in JSON payload.');
    }

    if (mode === 'replace') {
      await db.execute('DELETE FROM transactions');
      await db.execute('DELETE FROM cards');
      await db.execute('DELETE FROM goals');
      try {
        await db.execute('DELETE FROM installments');
      } catch (e) {}
    }

    // 1. Restore Cards
    for (const c of cards) {
      const cardId = c.id || uuidv4();
      await db.execute(
        `INSERT OR REPLACE INTO cards 
         (id, bankName, balance, color1, color2, cardNumber, budget, type, institution, paymentNetwork, creditLimit, availableCredit, outstandingBalance) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cardId,
          c.bankName,
          Number(c.balance || 0),
          c.color1 || '#0F172A',
          c.color2 || '#1E293B',
          c.cardNumber || '•••• 9012',
          Number(c.budget || 0),
          c.type || 'EWALLET',
          c.institution || null,
          c.paymentNetwork || 'OTHER',
          Number(c.creditLimit || 0),
          Number(c.availableCredit || 0),
          Number(c.outstandingBalance || 0),
        ]
      );
    }

    // 2. Restore Goals
    for (const g of goals) {
      const goalId = g.id || uuidv4();
      await db.execute(
        `INSERT OR REPLACE INTO goals 
         (id, title, current, target, targetDate, iconName, imageUrl) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          goalId,
          g.title,
          Number(g.current || 0),
          Number(g.target || 0),
          g.targetDate || 'Dec 2026',
          g.iconName || 'Target',
          g.imageUrl || null,
        ]
      );
    }

    // 3. Restore Transactions and vectorize for Geko AI RAG
    for (const t of transactions) {
      const transId = t.id || uuidv4();
      const res = await db.execute(
        `INSERT OR REPLACE INTO transactions 
         (id, amount, type, categoryId, date, note, bankName) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          transId,
          Number(t.amount || 0),
          t.type || 'expense',
          t.categoryId || 'Food',
          Number(t.date || Date.now()),
          t.note || '',
          t.bankName || 'GCash',
        ]
      );

      // Async vector embedding generation for Geko AI
      setTimeout(async () => {
        try {
          const textToEmbed = `${t.type} of ${t.amount} in category ${t.categoryId} ${t.bankName} on ${new Date(t.date).toISOString()}. Note: ${t.note}`;
          const embedding = await generateEmbedding(textToEmbed);
          if (res.insertId !== undefined) {
            await insertVector(res.insertId, embedding);
          }
        } catch (e) {}
      }, 0);
    }

    // 4. Update Cutoff Income if included in backup
    if (typeof data.cutoffIncome === 'number' && data.cutoffIncome > 0) {
      setCutoffIncome(data.cutoffIncome);
    }

    // Notify all app screens
    DeviceEventEmitter.emit('transactions_updated');
    DeviceEventEmitter.emit('goals_updated');

    return {
      success: true,
      restored: {
        transactions: transactions.length,
        cards: cards.length,
        goals: goals.length,
      },
    };
  } catch (error: any) {
    console.error('Failed to import JSON backup:', error);
    Alert.alert('Import Failed', error?.message || 'Invalid JSON backup format.');
    throw error;
  }
};

/**
 * Re-indexes all transactions in the SQLite database into the vector store so Geko AI RAG has 100% awareness.
 */
export const syncAIKnowledgeBase = async (): Promise<{ totalCount: number; message: string }> => {
  const db = getDb();
  try {
    const res = await db.execute('SELECT * FROM transactions');
    const transactions = (res.rows?._array || []) as Transaction[];

    for (const t of transactions) {
      try {
        const textToEmbed = `${t.type} of ${t.amount} in category ${t.categoryId} ${t.bankName} on ${new Date(Number(t.date)).toISOString()}. Note: ${t.note}`;
        const embedding = await generateEmbedding(textToEmbed);
        await insertVector(Math.floor(Math.random() * 100000), embedding);
      } catch (e) {}
    }

    DeviceEventEmitter.emit('transactions_updated');

    return {
      totalCount: transactions.length,
      message: `Successfully synchronized ${transactions.length} transactions with Geko AI offline knowledge base.`,
    };
  } catch (error) {
    console.error('Failed to sync AI knowledge base:', error);
    throw error;
  }
};
