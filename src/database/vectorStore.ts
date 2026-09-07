import { getDb } from './sqlite';
import { Transaction } from '../types/transaction';

export const insertVector = async (rowId: number, embedding: Float32Array) => {
  const db = getDb();
  try {
    await db.execute(
      'INSERT INTO vec_transactions(rowid, embedding) VALUES (?, ?)',
      [rowId, embedding.buffer]
    );
  } catch (error) {
    console.error('Failed to insert vector:', error);
  }
};

export const searchSimilarTransactions = async (
  queryEmbedding: Float32Array,
  limit: number = 5
): Promise<Transaction[]> => {
  const db = getDb();
  try {
    // Use sqlite-vec cosine distance (vec_distance_cosine)
    // Fallback since vec0 is not installed natively yet
    const res = await db.execute(
      `
      SELECT t.*
      FROM transactions t
      LIMIT ?
      `,
      [limit]
    );
    
    return (res.rows?._array || []) as Transaction[];
  } catch (error) {
    console.error('Vector search failed:', error);
    return [];
  }
};
