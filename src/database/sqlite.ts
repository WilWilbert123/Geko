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

    // Seed / Ensure Popular Philippine Bank Cards Exist
    const popularBanks = [
      { bankName: 'Cash', balance: 0.00, color1: '#059669', color2: '#10B981', cardNumber: 'PHYSICAL CASH', budget: 10000, type: 'CASH', paymentNetwork: 'OTHER' },
      { bankName: 'GCash', balance: 12500.50, color1: '#0026B3', color2: '#0055FF', cardNumber: '•••• 4029', budget: 15000, type: 'EWALLET', paymentNetwork: 'OTHER' },
      { bankName: 'GoTyme', balance: 5200.75, color1: '#0F172A', color2: '#00D2C8', cardNumber: '•••• 8832', budget: 10000, type: 'BANK', paymentNetwork: 'VISA' },
      { bankName: 'BPI', balance: 45000.00, color1: '#8B0000', color2: '#C8102E', cardNumber: '•••• 1123', budget: 30000, type: 'BANK', paymentNetwork: 'MASTERCARD' },
      { bankName: 'PNB', balance: 18500.00, color1: '#D4AF37', color2: '#E6CA65', cardNumber: '•••• 7740', budget: 20000, type: 'BANK', paymentNetwork: 'VISA' },
      { bankName: 'BDO', balance: 32400.00, color1: '#002B66', color2: '#004080', cardNumber: '•••• 3091', budget: 25000, type: 'BANK', paymentNetwork: 'VISA' },
      { bankName: 'MariBank', balance: 9800.25, color1: '#E64A19', color2: '#FF7043', cardNumber: '•••• 6612', budget: 15000, type: 'BANK', paymentNetwork: 'MASTERCARD' },
      { bankName: 'Metrobank', balance: 28000.00, color1: '#002277', color2: '#0044CC', cardNumber: '•••• 5104', budget: 20000, type: 'BANK', paymentNetwork: 'VISA' },
      { bankName: 'Maya', balance: 8400.00, color1: '#0B0E14', color2: '#00E676', cardNumber: '•••• 5519', budget: 12000, type: 'EWALLET', paymentNetwork: 'MASTERCARD' },
      { bankName: 'Landbank', balance: 10000.00, color1: '#004D25', color2: '#0A8A43', cardNumber: '•••• 9941', budget: 15000, type: 'BANK', paymentNetwork: 'MASTERCARD' },
      { bankName: 'UnionBank', balance: 15600.00, color1: '#E65100', color2: '#FF8800', cardNumber: '•••• 2284', budget: 18000, type: 'BANK', paymentNetwork: 'VISA' },
      { 
        bankName: 'Visa', 
        balance: 0, 
        color1: '#1A1F71', 
        color2: '#0055FF', 
        cardNumber: '•••• 4882', 
        budget: 20000, 
        type: 'CREDIT_CARD', 
        paymentNetwork: 'VISA',
        creditLimit: 50000,
        availableCredit: 40000,
        outstandingBalance: 10000,
        statementDate: '15th',
        dueDate: '30th',
        minimumPayment: 1000
      },
    ];

    for (const b of popularBanks) {
      const existRes = await db.execute('SELECT id FROM cards WHERE LOWER(bankName) = LOWER(?)', [b.bankName]);
      if (!existRes.rows || existRes.rows.length === 0) {
        await db.execute(
          `INSERT INTO cards (id, bankName, balance, color1, color2, cardNumber, budget, type, paymentNetwork, creditLimit, availableCredit, outstandingBalance, statementDate, dueDate, minimumPayment) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(), 
            b.bankName, 
            b.balance, 
            b.color1, 
            b.color2, 
            b.cardNumber, 
            b.budget, 
            b.type || 'EWALLET',
            b.paymentNetwork || 'OTHER',
            b.creditLimit || 0,
            b.availableCredit || 0,
            b.outstandingBalance || 0,
            b.statementDate || '',
            b.dueDate || '',
            b.minimumPayment || 0
          ]
        );
      }
    }

    // Update existing GoTyme card to sleek dark obsidian color scheme and reset legacy seed budgets
    try {
      await db.execute("UPDATE cards SET color1 = '#0F172A', color2 = '#00D2C8' WHERE LOWER(bankName) = 'gotyme'");
      await db.execute("UPDATE cards SET budget = 0 WHERE budget IS NOT NULL");
    } catch (e) {}

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
