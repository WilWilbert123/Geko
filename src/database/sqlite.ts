import { open } from '@op-engineering/op-sqlite';
import { 
  TRANSACTIONS_TABLE, 
  CATEGORIES_TABLE, 
  VECTORS_TABLE,
  GOALS_TABLE,
  BUDGETS_TABLE,
  CARDS_TABLE,
  PROFILE_TABLE,
  INSTALLMENTS_TABLE 
} from './schema';
import { uuidv4 } from '../utils/uuid';
import { Transaction, Category } from '../types/transaction';

// Singleton instance with global cache to survive Fast Refresh
let dbInstance: ReturnType<typeof open> | null = (global as any)._gekoDb || null;
if (!dbInstance) {
  try {
    dbInstance = open({
      name: 'geko.sqlite',
      encryptionKey: 'geko-secure-key', // Hardcoded for demo, normally from keychain
    });
    (global as any)._gekoDb = dbInstance;
  } catch (e) {
    dbInstance = (global as any)._gekoDb;
  }
}

const db = dbInstance!;

export const initDb = async () => {
  try {
    await db.execute(TRANSACTIONS_TABLE);
    await db.execute(CATEGORIES_TABLE);
    await db.execute(VECTORS_TABLE);
    await db.execute(GOALS_TABLE);
    await db.execute(BUDGETS_TABLE);
    await db.execute(CARDS_TABLE);
    await db.execute(PROFILE_TABLE);
    await db.execute(INSTALLMENTS_TABLE);
    
    // Seed default categories if empty
    const resCat = await db.execute('SELECT count(*) as count FROM categories');
    const countCat = (resCat.rows?._array[0] as any).count;
    
    if (countCat === 0) {
      const defaultCategories: Category[] = [
        { id: uuidv4(), name: 'Food', color: '#10B981', icon: 'coffee' },
        { id: uuidv4(), name: 'Transport', color: '#3B82F6', icon: 'car' },
        { id: uuidv4(), name: 'Housing', color: '#8B5CF6', icon: 'home' },
        { id: uuidv4(), name: 'Shopping', color: '#EC4899', icon: 'shopping-bag' },
        { id: uuidv4(), name: 'Salary', color: '#F59E0B', icon: 'dollar-sign' },
        { id: uuidv4(), name: 'Adjustment', color: '#6B7280', icon: 'help-circle' },
      ];
      
      await db.transaction(async (tx) => {
        for (const c of defaultCategories) {
          await tx.execute(
            'INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
            [c.id, c.name, c.color, c.icon]
          );
        }
      });
    } else {
      // Ensure Adjustment category exists for lost money tracking
      try {
        const adjRes = await db.execute('SELECT id FROM categories WHERE name = "Adjustment"');
        if (!adjRes.rows || adjRes.rows.length === 0) {
          await db.execute(
            'INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
            [uuidv4(), 'Adjustment', '#6B7280', 'help-circle']
          );
        }
      } catch (e) {}
    }

    // Migrations for cards table
    const cardMigrations = [
      'ALTER TABLE cards ADD COLUMN budget REAL DEFAULT 0',
      'ALTER TABLE cards ADD COLUMN type TEXT DEFAULT "EWALLET"',
      'ALTER TABLE cards ADD COLUMN institution TEXT',
      'ALTER TABLE cards ADD COLUMN paymentNetwork TEXT DEFAULT "OTHER"',
      'ALTER TABLE cards ADD COLUMN creditLimit REAL DEFAULT 0',
      'ALTER TABLE cards ADD COLUMN availableCredit REAL DEFAULT 0',
      'ALTER TABLE cards ADD COLUMN outstandingBalance REAL DEFAULT 0',
      'ALTER TABLE cards ADD COLUMN statementDate TEXT',
      'ALTER TABLE cards ADD COLUMN dueDate TEXT',
      'ALTER TABLE cards ADD COLUMN minimumPayment REAL DEFAULT 0'
    ];

    for (const mig of cardMigrations) {
      try {
        await db.execute(mig);
      } catch (e) {
        // Column already exists
      }
    }

    // Migration: add bankName column to transactions if not exists
    try {
      await db.execute('ALTER TABLE transactions ADD COLUMN bankName TEXT');
    } catch (e) {
      // Column already exists
    }

    // Migration: add imageUrl column to goals if not exists
    try {
      await db.execute('ALTER TABLE goals ADD COLUMN imageUrl TEXT');
    } catch (e) {
      // Column already exists
    }

    // Ensure clean blank slate for cards: start with 0 cards as requested.
    // The user connects their own cards in the Wallet/Accounts tab.
    try {
      await db.execute('CREATE TABLE IF NOT EXISTS __app_meta__ (key TEXT PRIMARY KEY, value TEXT)');
      const metaRes = await db.execute("SELECT value FROM __app_meta__ WHERE key = 'cards_blank_slate_reset_v4'");
      const alreadyReset = metaRes.rows && metaRes.rows.length > 0;
      if (!alreadyReset) {
        await db.execute('DELETE FROM cards');
        await db.execute("INSERT OR REPLACE INTO __app_meta__ (key, value) VALUES ('cards_blank_slate_reset_v4', '1')");
      }
    } catch (e) {
      console.log('[SQLite] Blank slate check error:', e);
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

    // Ensure Installments Table Exists
    const resInst = await db.execute('SELECT count(*) as count FROM installments');
    if (!resInst.rows) {
      // Table will be created on demand by useInstallments
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error; // re-throw so App.tsx can catch and display the error
  }
};

export const getDb = () => db;
