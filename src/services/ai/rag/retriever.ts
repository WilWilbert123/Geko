import { getDb } from '../../../database/sqlite';
import { searchSimilarTransactions } from '../../../database/vectorStore';
import { generateEmbedding } from '../engine/embeddingService';
import { Transaction } from '../../../types/transaction';
import { getCurrency, getCutoffIncome } from '../../../store/userStore';

export const retrieveContext = async (query: string): Promise<string> => {
  try {
    const db = getDb();
    const currency = getCurrency();
    const cutoffIncome = getCutoffIncome();
    const symbol = currency === 'PHP' ? '₱' : '$';

    const profileStr = `User Profile & Salary Cutoff Income:\n- Cutoff Take-Home Pay: ${symbol}${cutoffIncome.toFixed(2)} / cutoff (15th & 30th paydays)\n\n`;

    
    // 1. Get Accounts / Balances & Credit Debt
    const cardsRes = await db.execute('SELECT * FROM cards');
    const cards = cardsRes.rows?._array || [];
    let accountsStr = "Accounts & Balances:\n";
    let totalAssets = 0;
    let creditDebt = 0;

    cards.forEach((c: any) => {
      if (c.type === 'CREDIT_CARD') {
        const debt = Number(c.outstandingBalance || 0);
        const avail = Number(c.availableCredit || 0);
        creditDebt += debt;
        accountsStr += `- ${c.bankName} (Credit): Owed ${symbol}${debt.toFixed(2)} (Available: ${symbol}${avail.toFixed(2)})\n`;
      } else {
        const bal = Number(c.balance || 0);
        totalAssets += bal;
        accountsStr += `- ${c.bankName}: ${symbol}${bal.toFixed(2)}\n`;
      }
    });

    const netWorth = totalAssets - creditDebt;
    accountsStr += `- Total Cash Assets: ${symbol}${totalAssets.toFixed(2)}\n`;
    accountsStr += `- Total Credit Debt: ${symbol}${creditDebt.toFixed(2)}\n`;
    accountsStr += `- Net Worth: ${symbol}${netWorth.toFixed(2)}\n\n`;

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
      if (row.type === 'expense' || row.type === 'credit_purchase') expenses += row.total;
    });
    const summaryStr = `Financial Summary:\n- Total Income: ${symbol}${income.toFixed(2)}\n- Total Expenses: ${symbol}${expenses.toFixed(2)}\n\n`;

    // 3. Get Budgets
    const budgetsRes = await db.execute('SELECT * FROM budgets');
    const budgets = budgetsRes.rows?._array || [];
    let budgetsStr = "Budgets:\n";
    budgets.forEach((b: any) => {
      budgetsStr += `- ${b.categoryName}: Limit ${symbol}${b.limitAmount}\n`;
    });
    budgetsStr += "\n";

    // 4. Get Savings Goals
    const goalsRes = await db.execute('SELECT * FROM goals');
    const goals = goalsRes.rows?._array || [];
    let goalsStr = "Savings Goals:\n";
    if (goals.length === 0) {
      goalsStr += "- No active savings goals currently set.\n";
    } else {
      goals.forEach((g: any) => {
        const cur = Number(g.current || 0);
        const tgt = Number(g.target || 0);
        const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
        const needed = Math.max(0, tgt - cur);
        goalsStr += `- Goal "${g.title}": Saved ${symbol}${cur.toFixed(2)} of ${symbol}${tgt.toFixed(2)} (${pct}% funded, Needed: ${symbol}${needed.toFixed(2)}, Target Date: ${g.targetDate})\n`;
      });
    }
    goalsStr += "\n";

    // 5. Semantic & Recent Transactions Retrieval
    const queryVector = await generateEmbedding(query);
    const semanticResults = await searchSimilarTransactions(queryVector, 5);
    
    const recentRes = await db.execute('SELECT * FROM transactions ORDER BY CAST(date AS INTEGER) DESC LIMIT 5');
    const recentResults = (recentRes.rows?._array || []) as Transaction[];
    
    const combinedMap = new Map<string, Transaction>();
    semanticResults.forEach(t => combinedMap.set(t.id, t));
    recentResults.forEach(t => combinedMap.set(t.id, t));
    const combined = Array.from(combinedMap.values());
    
    let contextStr = "Recent Transactions:\n";
    if (combined.length === 0) {
      contextStr += "No transaction history available.\n";
    } else {
      combined.forEach(t => {
        const date = new Date(Number(t.date)).toISOString().split('T')[0];
        contextStr += `- [${date}] ${t.type === 'income' ? '+' : '-'}${symbol}${t.amount} (${t.bankName || 'Wallet'}) for category ${t.categoryId}: ${t.note || 'No note'}\n`;
      });
    }

    return `${profileStr}${accountsStr}${summaryStr}${budgetsStr}${goalsStr}${contextStr}`;
  } catch (error) {
    console.error('Retrieval failed:', error);
    return "Failed to retrieve context.";
  }
};
