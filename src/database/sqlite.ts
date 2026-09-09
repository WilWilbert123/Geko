import { open } from '@op-engineering/op-sqlite';
import { 
  TRANSACTIONS_TABLE, 
  CATEGORIES_TABLE, 
  VECTORS_TABLE,
  GOALS_TABLE,
  BUDGETS_TABLE,
  CARDS_TABLE,
  INSTALLMENTS_TABLE 
} from './schema';
import { uuidv4 } from '../utils/uuid';
import { Transaction, Category } from '../types/transaction';

// Singleton instance
const db = open({
  name: 'geko.sqlite',
  encryptionKey: 'geko-secure-key', // Hardcoded for demo, normally from keychain
});

export const initDb = async () => {
  try {
    await db.execute(TRANSACTIONS_TABLE);
    await db.execute(CATEGORIES_TABLE);
    await db.execute(VECTORS_TABLE);
    await db.execute(GOALS_TABLE);
    await db.execute(BUDGETS_TABLE);
    await db.execute(CARDS_TABLE);
    await db.execute(INSTALLMENTS_TABLE);
    
    // Seed default categories if empty
    const resCat = await db.execute('SELECT count(*) as count FROM categories');
    const countCat = (resCat.rows?._array[0] as any).count;
    
    if (countCat === 0) {
      const defaultCategories: Category[] = [
        { id: uuidv4(), name: 'Food', color: '#10B981', icon: 'coffee' },
        { id: uuidv4(), name: 'Transport', color: '#3B82F6', icon: 'car' },
        { id: uuidv4(), name: 'Housing', color: '#8B5CF6', icon: 'home' },
        { id: uuidv4(), name: 'Salary', color: '#F59E0B', icon: 'dollar-sign' },
      ];
      
      await db.transaction(async (tx) => {
        for (const c of defaultCategories) {
          await tx.execute(
            'INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
            [c.id, c.name, c.color, c.icon]
          );
        }
      });
    }

    // Seed Cards
    const resCards = await db.execute('SELECT count(*) as count FROM cards');
    const countCards = (resCards.rows?._array[0] as any).count;
    if (countCards === 0) {
      const defaultCards = [
        { id: uuidv4(), bankName: 'GCash', balance: 12500.50, color1: '#0052FF', color2: '#FFFFFF', cardNumber: '•••• 4029' },
        { id: uuidv4(), bankName: 'BPI', balance: 45000.00, color1: '#B30000', color2: '#FFFFFF', cardNumber: '•••• 1123' },
        { id: uuidv4(), bankName: 'GoTyme', balance: 5200.75, color1: '#00D1FF', color2: '#002B5E', cardNumber: '•••• 8832' },
        { id: uuidv4(), bankName: 'PNB', balance: 18400.00, color1: '#FFD700', color2: '#003366', cardNumber: '•••• 9941' },
      ];
      await db.transaction(async (tx) => {
        for (const c of defaultCards) {
          await tx.execute(
            'INSERT INTO cards (id, bankName, balance, color1, color2, cardNumber) VALUES (?, ?, ?, ?, ?, ?)',
            [c.id, c.bankName, c.balance, c.color1, c.color2, c.cardNumber]
          );
        }
      });
    }

    // Seed Budgets
    const resBudgets = await db.execute('SELECT count(*) as count FROM budgets');
    const countBudgets = (resBudgets.rows?._array[0] as any).count;
    if (countBudgets === 0) {
      const defaultBudgets = [
        { id: uuidv4(), categoryName: 'Food & Dining', limitAmount: 500 },
        { id: uuidv4(), categoryName: 'Transport', limitAmount: 150 },
      ];
      await db.transaction(async (tx) => {
        for (const b of defaultBudgets) {
          await tx.execute(
            'INSERT INTO budgets (id, categoryName, limitAmount) VALUES (?, ?, ?)',
            [b.id, b.categoryName, b.limitAmount]
          );
        }
      });
    }

    // Seed Goals
    const resGoals = await db.execute('SELECT count(*) as count FROM goals');
    const countGoals = (resGoals.rows?._array[0] as any).count;
    if (countGoals === 0) {
      const defaultGoals = [
        { id: uuidv4(), title: 'Car Downpayment', current: 4500, target: 10000, targetDate: 'Mar 2027', iconName: 'Car' },
        { id: uuidv4(), title: 'Emergency Fund', current: 8000, target: 12000, targetDate: 'Dec 2026', iconName: 'ShieldAlert' },
        { id: uuidv4(), title: 'New MacBook Pro', current: 500, target: 2400, targetDate: 'Nov 2026', iconName: 'Laptop' },
        { id: uuidv4(), title: 'Japan Trip', current: 2100, target: 5000, targetDate: 'Apr 2027', iconName: 'Plane' },
      ];
      await db.transaction(async (tx) => {
        for (const g of defaultGoals) {
          await tx.execute(
            'INSERT INTO goals (id, title, current, target, targetDate, iconName) VALUES (?, ?, ?, ?, ?, ?)',
            [g.id, g.title, g.current, g.target, g.targetDate, g.iconName]
          );
        }
      });
    }

    // Seed Installments
    const resInst = await db.execute('SELECT count(*) as count FROM installments');
    const countInst = (resInst.rows?._array[0] as any).count;
    if (countInst === 0) {
      const defaultInstallment = {
        id: uuidv4(),
        title: 'MacBook Air M2 (3-Mo Installment)',
        totalAmount: 900.0,
        monthlyAmount: 300.0,
        totalMonths: 3,
        paidMonths: 0,
        startDate: Date.now(),
        nextCutoff: Date.now() + 30 * 86400000,
        status: 'active'
      };
      await db.execute(
        'INSERT INTO installments (id, title, totalAmount, monthlyAmount, totalMonths, paidMonths, startDate, nextCutoff, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          defaultInstallment.id,
          defaultInstallment.title,
          defaultInstallment.totalAmount,
          defaultInstallment.monthlyAmount,
          defaultInstallment.totalMonths,
          defaultInstallment.paidMonths,
          defaultInstallment.startDate,
          defaultInstallment.nextCutoff,
          defaultInstallment.status
        ]
      );
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error; // re-throw so App.tsx can catch and display the error
  }
};

export const getDb = () => db;
