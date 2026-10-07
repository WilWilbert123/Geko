import { getDb } from '../../../database/sqlite';
import { searchSimilarTransactions } from '../../../database/vectorStore';
import { generateEmbedding } from '../engine/embeddingService';
import { Transaction } from '../../../types/transaction';
import { getCurrency, getCutoffIncome } from '../../../store/userStore';
import { isToday, subDays } from 'date-fns';

export const retrieveContext = async (query: string): Promise<string> => {
  try {
    const db = getDb();
    const currency = getCurrency();
    const cutoffIncome = getCutoffIncome();
    const symbol = currency === 'PHP' ? '₱' : '$';

    const profileStr = `User Profile & Salary Cutoff Info:\n- Salary Cutoff Take-Home Pay: ${symbol}${cutoffIncome.toFixed(2)} / cutoff (15th & 30th paydays)\n\n`;

    // 1. Get Accounts / Balances & Credit Card Debt
    const cardsRes = await db.execute('SELECT * FROM cards');
    const cards = cardsRes.rows?._array || [];
    let accountsStr = "Accounts & Balances:\n";
    let totalCashAssets = 0;
    let totalCreditDebt = 0;

    cards.forEach((c: any) => {
      if (c.type === 'CREDIT_CARD') {
        const debt = Number(c.outstandingBalance || 0);
        const avail = Number(c.availableCredit || 0);
        const limit = Number(c.creditLimit || 0);
        totalCreditDebt += debt;
        accountsStr += `- ${c.bankName} (Credit Card): Owed ${symbol}${debt.toFixed(2)} | Available: ${symbol}${avail.toFixed(2)} | Limit: ${symbol}${limit.toFixed(2)}\n`;
      } else {
        const bal = Number(c.balance || 0);
        totalCashAssets += bal;
        accountsStr += `- ${c.bankName}: ${symbol}${bal.toFixed(2)}\n`;
      }
    });

    const netWorth = totalCashAssets - totalCreditDebt;
    accountsStr += `- Total Cash Assets: ${symbol}${totalCashAssets.toFixed(2)}\n`;
    accountsStr += `- Total Credit Card Debt: ${symbol}${totalCreditDebt.toFixed(2)}\n`;
    accountsStr += `- Net Worth: ${symbol}${netWorth.toFixed(2)}\n\n`;

    // 2. Get Installment Plans & BNPL
    let installmentsStr = "Installment Plans & BNPL:\n";
    let totalInstallmentRemaining = 0;
    let totalMonthlyInstallmentCommitment = 0;
    const debtListForStrategy: { name: string; amount: number; type: string }[] = [];

    try {
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
          status TEXT NOT NULL,
          imageUrl TEXT
        );
      `);

      const instRes = await db.execute('SELECT * FROM installments');
      const installments = instRes.rows?._array || [];

      if (installments.length === 0) {
        installmentsStr += "- No active installment plans.\n";
      } else {
        installments.forEach((i: any) => {
          const paid = Number(i.paidMonths || 0);
          const totalM = Number(i.totalMonths || 12);
          const monthly = Number(i.monthlyAmount || 0);
          const totalA = Number(i.totalAmount || 0);
          const remaining = Math.max(0, totalA - (paid * monthly));
          const status = i.status || 'active';

          if (status === 'active') {
            totalInstallmentRemaining += remaining;
            totalMonthlyInstallmentCommitment += monthly;
          }

          installmentsStr += `- Installment "${i.title}": Monthly ${symbol}${monthly.toFixed(2)} | Paid: ${paid}/${totalM} months | Remaining Balance: ${symbol}${remaining.toFixed(2)} | Status: ${status}\n`;
        });
      }
    } catch (e) {
      installmentsStr += "- No active installment plans.\n";
    }
    installmentsStr += `- Total Active Monthly Installment Commitment: ${symbol}${totalMonthlyInstallmentCommitment.toFixed(2)}\n`;
    installmentsStr += `- Total Remaining Installment Debt: ${symbol}${totalInstallmentRemaining.toFixed(2)}\n\n`;

    // 3. Debt Management & Payoff Tracker Context (Snowball & Avalanche)
    const combinedTotalDebt = totalCreditDebt + totalInstallmentRemaining;
    let debtStrategyStr = "Debt Payoff & Debt Management Summary:\n";
    debtStrategyStr += `- Total Combined Debt (Credit Cards + Installments): ${symbol}${combinedTotalDebt.toFixed(2)}\n`;
    if (combinedTotalDebt === 0) {
      debtStrategyStr += "- Status: Debt Free! No outstanding credit or installment debts.\n\n";
    } else {
      debtStrategyStr += `- Snowball Strategy (Pay Smallest Balance First): Focus extra payments on lowest balance debt while paying minimums on others.\n`;
      debtStrategyStr += `- Avalanche Strategy (Pay Highest Interest First): Focus extra payments on highest interest rate debt to minimize interest cost.\n\n`;
    }

    // 4. Get Aggregated Income & Expenses & Today's Spending
    const allTransRes = await db.execute('SELECT * FROM transactions');
    const allTrans = (allTransRes.rows?._array || []) as Transaction[];

    let totalIncome = 0;
    let totalExpenses = 0;
    let spentToday = 0;
    let spentPast7Days = 0;
    const now = Date.now();
    const sevenDaysAgo = subDays(now, 7).getTime();

    allTrans.forEach((t) => {
      const amt = Number(t.amount || 0);
      const tDate = Number(t.date || 0);

      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpenses += amt;
        if (isToday(tDate)) {
          spentToday += amt;
        }
        if (tDate >= sevenDaysAgo) {
          spentPast7Days += amt;
        }
      }
    });

    const summaryStr = `Financial Summary & Spending Stats:\n- Total Recorded Income: ${symbol}${totalIncome.toFixed(2)}\n- Total Recorded Expenses: ${symbol}${totalExpenses.toFixed(2)}\n- Spent Today: ${symbol}${spentToday.toFixed(2)}\n- Spent Past 7 Days: ${symbol}${spentPast7Days.toFixed(2)}\n\n`;

    // 5. Get Budgets
    const budgetsRes = await db.execute('SELECT * FROM budgets');
    const budgets = budgetsRes.rows?._array || [];
    let budgetsStr = "Category Budgets:\n";
    if (budgets.length === 0) {
      budgetsStr += "- No category budgets currently configured.\n";
    } else {
      budgets.forEach((b: any) => {
        budgetsStr += `- Budget [${b.categoryName}]: Limit ${symbol}${Number(b.limitAmount).toFixed(2)}\n`;
      });
    }
    budgetsStr += "\n";

    // 6. Get Savings Goals
    const goalsRes = await db.execute('SELECT * FROM goals');
    const goals = goalsRes.rows?._array || [];
    let goalsStr = "Savings & Financial Goals:\n";
    if (goals.length === 0) {
      goalsStr += "- No active savings goals currently set.\n";
    } else {
      goals.forEach((g: any) => {
        const cur = Number(g.current || 0);
        const tgt = Number(g.target || 0);
        const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
        const needed = Math.max(0, tgt - cur);
        goalsStr += `- Goal "${g.title}": Saved ${symbol}${cur.toFixed(2)} of ${symbol}${tgt.toFixed(2)} (${pct}% funded | Needed: ${symbol}${needed.toFixed(2)} | Target Date: ${g.targetDate})\n`;
      });
    }
    goalsStr += "\n";

    // 7. Recent Transactions & Semantic Context
    const queryVector = await generateEmbedding(query);
    const semanticResults = await searchSimilarTransactions(queryVector, 5);

    const recentRes = await db.execute('SELECT * FROM transactions ORDER BY CAST(date AS INTEGER) DESC LIMIT 8');
    const recentResults = (recentRes.rows?._array || []) as Transaction[];

    const combinedMap = new Map<string, Transaction>();
    semanticResults.forEach((t) => combinedMap.set(t.id, t));
    recentResults.forEach((t) => combinedMap.set(t.id, t));
    const combined = Array.from(combinedMap.values());

    let contextStr = "Recent Transaction History:\n";
    if (combined.length === 0) {
      contextStr += "No transaction history available.\n";
    } else {
      combined.forEach((t) => {
        const dateStr = new Date(Number(t.date)).toISOString().split('T')[0];
        contextStr += `- [${dateStr}] ${t.type === 'income' ? '+' : '-'}${symbol}${t.amount} (${t.bankName || 'Wallet'}) | Category: ${t.categoryId} | Note: ${t.note || 'No note'}\n`;
      });
    }

    return `${profileStr}${accountsStr}${installmentsStr}${debtStrategyStr}${summaryStr}${budgetsStr}${goalsStr}${contextStr}`;
  } catch (error) {
    console.error('Retrieval failed:', error);
    return "Failed to retrieve context.";
  }
};
