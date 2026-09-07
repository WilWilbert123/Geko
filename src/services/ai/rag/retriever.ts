import { getDb } from '../../../database/sqlite';
import { searchSimilarTransactions } from '../../../database/vectorStore';
import { generateEmbedding } from '../engine/embeddingService';
import { Transaction } from '../../../types/transaction';

export const retrieveContext = async (query: string): Promise<string> => {
  try {
    const db = getDb();
    
    // 1. Get Accounts / Balances
    const cardsRes = await db.execute('SELECT * FROM cards');
    const cards = cardsRes.rows?._array || [];
    let accountsStr = "Accounts & Balances:\n";
    let totalBalance = 0;
    cards.forEach((c: any) => {
      accountsStr += `- ${c.bankName}: $${c.balance}\n`;
      totalBalance += c.balance;
    });
    accountsStr += `- Total Balance: $${totalBalance}\n\n`;

    // 2. Get Aggregated Income & Expenses
    const aggRes = await db.execute(`
      SELECT type, SUM(amount) as total 
      FROM transactions 
      GROUP BY type
    `);
    const aggData = aggRes.rows?._array || [];
    let income = 0;
    let expenses = 0;
    aggData.forEach((row: any) => {
      if (row.type === 'income') income = row.total;
      if (row.type === 'expense') expenses = row.total;
    });
    const summaryStr = `Financial Summary:\n- Total Income: $${income}\n- Total Expenses: $${expenses}\n\n`;

    // 3. Get Budgets
    const budgetsRes = await db.execute('SELECT * FROM budgets');
    const budgets = budgetsRes.rows?._array || [];
    let budgetsStr = "Budgets:\n";
    budgets.forEach((b: any) => {
      budgetsStr += `- ${b.categoryName}: Limit $${b.limitAmount}\n`;
    });
    budgetsStr += "\n";

    // 4. Semantic Search Transactions
    const queryVector = await generateEmbedding(query);
    const semanticResults = await searchSimilarTransactions(queryVector, 5);
    
    const recentRes = await db.execute('SELECT * FROM transactions ORDER BY date DESC LIMIT 5');
    const recentResults = (recentRes.rows?._array || []) as Transaction[];
    
    // Combine and deduplicate transactions
    const combinedMap = new Map<string, Transaction>();
    semanticResults.forEach(t => combinedMap.set(t.id, t));
    recentResults.forEach(t => combinedMap.set(t.id, t));
    const combined = Array.from(combinedMap.values());
    
    let contextStr = "Recent and Relevant Transactions:\n";
    if (combined.length === 0) {
      contextStr += "No transaction history available.\n";
    } else {
      combined.forEach(t => {
        const date = new Date(t.date).toISOString().split('T')[0];
        contextStr += `- [${date}] ${t.type === 'expense' ? '-' : '+'}$${t.amount} for category ${t.categoryId} (${t.note || 'No note'})\n`;
      });
    }

    // Combine all context
    return `${accountsStr}${summaryStr}${budgetsStr}${contextStr}`;
  } catch (error) {
    console.error('Retrieval failed:', error);
    return "Failed to retrieve context.";
  }
};
