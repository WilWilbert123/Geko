import { useState, useCallback, useEffect } from 'react';
import { getDb } from '../database/sqlite';
import { uuidv4 } from '../utils/uuid';
import { DeviceEventEmitter } from 'react-native';

export interface Installment {
  id: string;
  title: string;
  totalAmount: number;
  monthlyAmount: number;
  totalMonths: number;
  paidMonths: number;
  startDate: number;
  nextCutoff: number;
  status: 'active' | 'completed';
}

export const useInstallments = () => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const db = getDb();
    try {
      // Ensure table exists just in case
      await db.execute(`
        CREATE TABLE IF NOT EXISTS installments (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          totalAmount REAL NOT NULL,
          monthlyAmount REAL NOT NULL,
          totalMonths INTEGER NOT NULL,
          paidMonths INTEGER NOT NULL,
          startDate INTEGER NOT NULL,
          nextCutoff INTEGER NOT NULL,
          status TEXT NOT NULL
        );
      `);

      const res = await db.execute('SELECT * FROM installments ORDER BY startDate DESC');
      const data = (res.rows?._array || []) as Installment[];
      setInstallments(data);
    } catch (err) {
      console.error('Failed to load installments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener('installments_updated', load);
    return () => sub.remove();
  }, [load]);

  const addInstallment = async (title: string, totalAmount: number, totalMonths: number) => {
    const db = getDb();
    const id = uuidv4();
    const monthlyAmount = Math.round((totalAmount / totalMonths) * 100) / 100;
    const now = Date.now();
    const nextCutoff = now + 30 * 86400000; // 30 days later

    await db.execute(
      'INSERT INTO installments (id, title, totalAmount, monthlyAmount, totalMonths, paidMonths, startDate, nextCutoff, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, totalAmount, monthlyAmount, totalMonths, 0, now, nextCutoff, 'active']
    );

    await load();
    DeviceEventEmitter.emit('installments_updated');
  };

  const payCutoff = async (installmentId: string) => {
    const db = getDb();
    const inst = installments.find(i => i.id === installmentId);
    if (!inst) throw new Error('Installment not found');

    if (inst.paidMonths >= inst.totalMonths) {
      throw new Error('Installment already fully paid');
    }

    const newPaidMonths = inst.paidMonths + 1;
    const isCompleted = newPaidMonths >= inst.totalMonths;
    const newStatus = isCompleted ? 'completed' : 'active';
    const nextCutoff = inst.nextCutoff + 30 * 86400000;

    // 1. Update installment status & paid months
    await db.execute(
      'UPDATE installments SET paidMonths = ?, status = ?, nextCutoff = ? WHERE id = ?',
      [newPaidMonths, newStatus, nextCutoff, installmentId]
    );

    // 2. Insert real deduction transaction into transactions table
    const transactionId = uuidv4();
    const now = Date.now();
    const note = `Installment (${newPaidMonths}/${inst.totalMonths}) - ${inst.title}`;

    await db.execute(
      'INSERT INTO transactions (id, amount, type, categoryId, date, note) VALUES (?, ?, ?, ?, ?, ?)',
      [transactionId, inst.monthlyAmount, 'expense', 'Shopping', now, note]
    );

    // 3. Emit events to refresh balance, recent activity, and installments UI
    DeviceEventEmitter.emit('transactions_updated');
    DeviceEventEmitter.emit('installments_updated');
    await load();

    return {
      cutOffNumber: newPaidMonths,
      totalMonths: inst.totalMonths,
      amountDeducted: inst.monthlyAmount,
      isCompleted,
    };
  };

  return {
    installments,
    loading,
    refresh: load,
    addInstallment,
    payCutoff,
  };
};
