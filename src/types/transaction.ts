export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: number; // unix timestamp
  note: string;
  vectorId?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}
