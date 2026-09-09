export const TRANSACTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    categoryId TEXT NOT NULL,
    date INTEGER NOT NULL,
    note TEXT,
    vectorId TEXT
  );
`;

export const CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL
  );
`;

export const VECTORS_TABLE = `
  CREATE TABLE IF NOT EXISTS vec_transactions (
    rowid INTEGER PRIMARY KEY,
    embedding BLOB
  );
`;

export const GOALS_TABLE = `
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    current REAL NOT NULL,
    target REAL NOT NULL,
    targetDate TEXT NOT NULL,
    iconName TEXT NOT NULL
  );
`;

export const BUDGETS_TABLE = `
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    categoryName TEXT NOT NULL,
    limitAmount REAL NOT NULL
  );
`;

export const CARDS_TABLE = `
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    bankName TEXT NOT NULL,
    balance REAL NOT NULL,
    color1 TEXT NOT NULL,
    color2 TEXT NOT NULL,
    cardNumber TEXT NOT NULL
  );
`;

export const INSTALLMENTS_TABLE = `
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
`;
