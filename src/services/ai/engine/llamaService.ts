import { useAIStore } from '../../../store/aiStore';
import { getDb } from '../../../database/sqlite';
import { generateEmbedding } from './embeddingService';
import { DeviceEventEmitter } from 'react-native';
import { uuidv4 } from '../../../utils/uuid';
import { parseTransactionsFromText, ParsedTransaction } from './nlpTransactionParser';
import { getCurrency, getCutoffIncome, setCutoffIncome } from '../../../store/userStore';

let isModelLoaded = false;

export const loadModel = async (modelPath: string) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  isModelLoaded = true;
  useAIStore.getState().setStatus(true, "geko-ai-v2 (Local Hybrid)");
};

export const generateStream = async (
  prompt: string,
  userText: string,
  onToken: (token: string) => void
): Promise<string> => {
  if (!isModelLoaded) {
    throw new Error('LLM not loaded');
  }

  const lowerUserText = userText.toLowerCase();
  const db = getDb();
  let fullResponse = "";

  const currency = getCurrency();
  const symbol = currency === 'PHP' ? '₱' : '$';
  const isTagalog = /(?:magkano|bumili|bili|kain|kumain|ulam|ng|sa|kami|ako|namin|tayo|sahod|sweldo|gastos|bayad|merienda|pamasahe|tsaka|saka|tapos|pera|utang)/i.test(userText);

  // 0. Check for Cutoff Income Configuration in Chat
  const isSetCutoffQuery =
    (lowerUserText.includes('cutoff') || lowerUserText.includes('cut off') || lowerUserText.includes('payday')) &&
    (lowerUserText.includes('set') || lowerUserText.includes('income') || lowerUserText.includes('is') || lowerUserText.includes('change') || lowerUserText.includes('update') || lowerUserText.includes('my') || lowerUserText.includes('sweldo') || lowerUserText.includes('sahod')) &&
    /\d+/.test(lowerUserText);

  const isGetCutoffQuery =
    (lowerUserText.includes('cutoff') || lowerUserText.includes('cut off')) &&
    (lowerUserText.includes('what') || lowerUserText.includes('how much') || lowerUserText.includes('ano') || lowerUserText.includes('magkano'));

  if (isSetCutoffQuery) {
    const amtMatch = lowerUserText.match(/\d+(?:\.\d+)?/);
    if (amtMatch) {
      const newCutoff = parseFloat(amtMatch[0]);
      setCutoffIncome(newCutoff);
      fullResponse = isTagalog
        ? `✓ Na-update na ang iyong salary cutoff income sa **${symbol}${newCutoff.toLocaleString('en-US', { minimumFractionDigits: 2 })}** bawat payday (15th & 30th)! Gagamitin na ito ng Geko AI para sa lahat ng goal savings guides.`
        : `✓ Updated your salary cutoff income to **${symbol}${newCutoff.toLocaleString('en-US', { minimumFractionDigits: 2 })}** / cutoff (15th & 30th paydays)! Geko AI will automatically use this for all goal cutoff calculations.`;

      const tokens = fullResponse.split(/(?<=\s)/);
      for (const token of tokens) {
        await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25));
        onToken(token);
      }
      useAIStore.getState().updateMetrics(0, 1000 / 55);
      return fullResponse;
    }
  } else if (isGetCutoffQuery) {
    const curCutoff = getCutoffIncome();
    fullResponse = isTagalog
      ? `Ang iyong nakatakdang salary cutoff income ay **${symbol}${curCutoff.toLocaleString('en-US', { minimumFractionDigits: 2 })}** bawat payday (15th & 30th).`
      : `Your configured salary cutoff income is **${symbol}${curCutoff.toLocaleString('en-US', { minimumFractionDigits: 2 })}** per payday (15th & 30th).`;

    const tokens = fullResponse.split(/(?<=\s)/);
    for (const token of tokens) {
      await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25));
      onToken(token);
    }
    useAIStore.getState().updateMetrics(0, 1000 / 55);
    return fullResponse;
  }

  // 1. Check if input is a Transaction (e.g. "Kumain ako sa labas 180 gamit gotyme") vs a Question
  const isExplicitQuestion =
    lowerUserText.includes('?') ||
    lowerUserText.includes('magkano') ||
    lowerUserText.includes('how much') ||
    lowerUserText.includes('what is') ||
    lowerUserText.includes('what are') ||
    lowerUserText.includes('aabot') ||
    lowerUserText.includes('kaya ba') ||
    lowerUserText.includes('pila') ||
    lowerUserText.includes('ilan') ||
    lowerUserText.includes('ano') ||
    lowerUserText.includes('laman') ||
    lowerUserText.includes('cards balance') ||
    lowerUserText.includes('card balance') ||
    lowerUserText.includes('wallet balance') ||
    lowerUserText.includes('list my card') ||
    lowerUserText.includes('list card') ||
    lowerUserText.includes('list wallet') ||
    lowerUserText.includes('show my cards');

  const candidateTransactions = parseTransactionsFromText(userText);
  const hasValidTransactionIntent =
    candidateTransactions.length > 0 &&
    candidateTransactions.some(t => t.amount > 0) &&
    !isExplicitQuestion;

  const isGoalQuery =
    lowerUserText.includes('goal') ||
    lowerUserText.includes('goals') ||
    lowerUserText.includes('ipon') ||
    lowerUserText.includes('saving') ||
    lowerUserText.includes('savings') ||
    lowerUserText.includes('target');

  const isCardListQuery =
    lowerUserText.includes('cards balance') ||
    lowerUserText.includes('card balance') ||
    lowerUserText.includes('all cards') ||
    lowerUserText.includes('all card') ||
    lowerUserText.includes('list card') ||
    lowerUserText.includes('list my card') ||
    lowerUserText.includes('wallets') ||
    lowerUserText.includes('wallet balance') ||
    lowerUserText.includes('list wallet') ||
    lowerUserText.includes('my wallet balance') ||
    lowerUserText.includes('all my card') ||
    lowerUserText.includes('all my wallet') ||
    lowerUserText.includes('all wallet') ||
    lowerUserText.includes('cards list') ||
    lowerUserText.includes('show my cards') ||
    lowerUserText.includes('may laman') ||
    lowerUserText.includes('laman na pera') ||
    lowerUserText.includes('may pera') ||
    lowerUserText.includes('cards with money') ||
    lowerUserText.includes('with money') ||
    (
      (lowerUserText.includes('card') || lowerUserText.includes('cards') || lowerUserText.includes('wallet') || lowerUserText.includes('wallets') || lowerUserText.includes('bank')) &&
      (lowerUserText.includes('all') || lowerUserText.includes('list') || lowerUserText.includes('show') || lowerUserText.includes('my') || lowerUserText.includes('balance') || lowerUserText.includes('can you') || lowerUserText.includes('lahat') || lowerUserText.includes('laman'))
    );

  const isTodaySpendQuery =
    lowerUserText.includes('spend this day') ||
    lowerUserText.includes('spent this day') ||
    lowerUserText.includes('spend today') ||
    lowerUserText.includes('spent today') ||
    lowerUserText.includes('spending today') ||
    lowerUserText.includes('today spending') ||
    lowerUserText.includes('today\'s spending') ||
    lowerUserText.includes('gastos ngayong araw') ||
    lowerUserText.includes('total all that i spend this day') ||
    (
      (lowerUserText.includes('today') || lowerUserText.includes('this day') || lowerUserText.includes('ngayong araw')) &&
      (lowerUserText.includes('spend') || lowerUserText.includes('spent') || lowerUserText.includes('speend') || lowerUserText.includes('gastos') || lowerUserText.includes('total') || lowerUserText.includes('how much'))
    );

  const isWeekSpendQuery =
    lowerUserText.includes('week') ||
    lowerUserText.includes('weekly') ||
    lowerUserText.includes('linggo') ||
    lowerUserText.includes('7 days') ||
    lowerUserText.includes('whole week');

  const isInstallmentQuery =
    lowerUserText.includes('installment') ||
    lowerUserText.includes('installments') ||
    lowerUserText.includes('hulugan') ||
    lowerUserText.includes('cut-off') ||
    lowerUserText.includes('cutoff') ||
    lowerUserText.includes('bnpl') ||
    lowerUserText.includes('babayaran');

  const isInstallmentDeductAction =
    isInstallmentQuery &&
    (lowerUserText.includes('deduct') ||
      lowerUserText.includes('pay') ||
      lowerUserText.includes('bayaran') ||
      lowerUserText.includes('bawasan') ||
      lowerUserText.includes('bawas') ||
      lowerUserText.includes('bayad'));

  const isFinancialQuery =
    !hasValidTransactionIntent &&
    (isGoalQuery ||
      isCardListQuery ||
      isTodaySpendQuery ||
      isWeekSpendQuery ||
      isInstallmentQuery ||
      lowerUserText.includes('magkano') ||
      lowerUserText.includes('how much') ||
      lowerUserText.includes('what is') ||
      lowerUserText.includes('what are') ||
      lowerUserText.includes('balance') ||
      lowerUserText.includes('balances') ||
      lowerUserText.includes('saan ako') ||
      lowerUserText.includes('ano ang') ||
      lowerUserText.includes('ilan') ||
      lowerUserText.includes('laman') ||
      lowerUserText.includes('pila') ||
      lowerUserText.includes('aabot') ||
      lowerUserText.includes('net worth'));

  // A. Process Transaction Intent FIRST if user is stating a transaction (e.g. "Kumain ako sa labas 180 gamit gotyme")
  if (hasValidTransactionIntent) {
    try {
      const savedItems: ParsedTransaction[] = [];

      for (const item of candidateTransactions) {
        const newId = uuidv4();
        const date = Date.now();
        const bankName = item.bankName || 'GCash';

        await db.execute(
          'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [newId, item.amount, date, item.categoryId, item.type, item.note, bankName]
        );

        if (item.type === 'transfer') {
          const src = item.sourceBank || 'Maya';
          const dst = item.destinationBank || 'MariBank';
          await db.execute('UPDATE cards SET balance = balance - ? WHERE LOWER(bankName) = LOWER(?)', [item.amount, src]);
          await db.execute('UPDATE cards SET balance = balance + ? WHERE LOWER(bankName) = LOWER(?)', [item.amount, dst]);
        } else if (item.type === 'credit_payment') {
          const src = item.sourceBank || 'GCash';
          await db.execute('UPDATE cards SET balance = balance - ? WHERE LOWER(bankName) = LOWER(?)', [item.amount, src]);
          await db.execute(
            'UPDATE cards SET outstandingBalance = MAX(0, outstandingBalance - ?), availableCredit = availableCredit + ? WHERE LOWER(bankName) = "visa"',
            [item.amount, item.amount]
          );
        } else if (item.type === 'credit_purchase') {
          await db.execute(
            'UPDATE cards SET outstandingBalance = outstandingBalance + ?, availableCredit = availableCredit - ? WHERE LOWER(bankName) = "visa"',
            [item.amount, item.amount]
          );
        } else if (item.type === 'expense') {
          await db.execute('UPDATE cards SET balance = balance - ? WHERE LOWER(bankName) = LOWER(?)', [item.amount, bankName]);
        } else if (item.type === 'income') {
          await db.execute('UPDATE cards SET balance = balance + ? WHERE LOWER(bankName) = LOWER(?)', [item.amount, bankName]);
        }

        savedItems.push(item);
      }

      DeviceEventEmitter.emit('transactions_updated');

      if (savedItems.length === 1) {
        const single = savedItems[0];
        const targetBank = single.bankName || 'GCash';
        const cardRes = await db.execute('SELECT balance, outstandingBalance, type FROM cards WHERE LOWER(bankName) = LOWER(?)', [targetBank]);
        const cardRow = cardRes.rows?._array[0];
        const newBalStr = cardRow
          ? (cardRow.type === 'CREDIT_CARD'
              ? ` (Kasalukuyang utang: ${symbol}${Number(cardRow.outstandingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})`
              : ` (Natitirang balance sa ${targetBank}: ${symbol}${Number(cardRow.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})`)
          : '';

        if (single.type === 'transfer') {
          fullResponse = isTagalog
            ? `✓ Na-transfer na ang ${symbol}${single.amount.toFixed(2)} mula ${single.sourceBank} papunta sa ${single.destinationBank}. Hindi nabawasan ang kabuuang assets mo!`
            : `✓ Transferred ${symbol}${single.amount.toFixed(2)} from ${single.sourceBank} to ${single.destinationBank}.`;
        } else if (single.type === 'credit_payment') {
          fullResponse = isTagalog
            ? `✓ Na-record ang ${symbol}${single.amount.toFixed(2)} pagbayad ng credit card sa Visa gamit ang ${single.sourceBank}. Nabawasan ang utang mo sa Visa!`
            : `✓ Paid ${symbol}${single.amount.toFixed(2)} towards Visa credit card from ${single.sourceBank}. Credit debt reduced!`;
        } else if (single.type === 'credit_purchase') {
          fullResponse = isTagalog
            ? `✓ Na-record ang ${symbol}${single.amount.toFixed(2)} (${single.note}) gamit ang Visa credit card. Nadagdagan ang utang sa Visa, walang nabawas sa cash balances mo.`
            : `✓ Charged ${symbol}${single.amount.toFixed(2)} (${single.note}) to Visa credit card. Added to credit debt.`;
        } else if (single.type === 'expense') {
          const isLost = single.categoryId === 'Adjustment' || single.note.toLowerCase().includes('lost') || single.note.toLowerCase().includes('nawala');
          if (isLost) {
            fullResponse = isTagalog
              ? `✓ Na-record na ang nawalang ${symbol}${single.amount.toFixed(2)} (${single.note}). Nabawas na ito sa ${single.bankName} balance mo!${newBalStr}`
              : `✓ Recorded ${symbol}${single.amount.toFixed(2)} lost money (${single.note}). Deducted from your ${single.bankName} balance!${newBalStr}`;
          } else {
            fullResponse = isTagalog
              ? `✓ Na-record na ang ${single.note} worth ${symbol}${single.amount.toFixed(2)} (${single.categoryId}). Nabawas na ito sa ${single.bankName} card mo!${newBalStr}`
              : `✓ Logged ${symbol}${single.amount.toFixed(2)} expense for "${single.note}" under ${single.categoryId} on ${single.bankName}.${newBalStr}`;
          }
        } else {
          fullResponse = isTagalog
            ? `✓ Na-record na ang natanggap mong ${single.note} worth +${symbol}${single.amount.toFixed(2)}. Nadagdag na ito sa ${single.bankName} card mo!${newBalStr}`
            : `✓ Logged +${symbol}${single.amount.toFixed(2)} income to ${single.bankName}.${newBalStr}`;
        }
      } else {
        const listStr = savedItems
          .map(i => `• ${i.note}: ${symbol}${i.amount.toFixed(2)} [${i.bankName || 'GCash'}]`)
          .join('\n');
        fullResponse = isTagalog
          ? `✓ Na-record ko na ang ${savedItems.length} transactions:\n${listStr}`
          : `✓ Logged ${savedItems.length} transactions:\n${listStr}`;
      }
    } catch (err) {
      console.error('Failed to execute AI transaction:', err);
      fullResponse = "I understood the transaction, but I couldn't save it locally. Nothing was changed.";
    }
  }
  // B. Check if user is asking a Financial Question (Local RAG / SQL query)
  else if (isFinancialQuery) {
    if (isInstallmentDeductAction) {
      // ── Execute Real-Time Installment Cut-Off Deduction ──
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

      const res = await db.execute('SELECT * FROM installments WHERE status = "active" ORDER BY nextCutoff ASC');
      const activeInstallments = (res.rows?._array || []) as any[];

      if (activeInstallments.length === 0) {
        fullResponse = isTagalog
          ? `Wala kang active na installment plan sa ngayon!`
          : `You don't have any active installment plans to deduct!`;
      } else {
        let matched = activeInstallments.find((inst: any) =>
          lowerUserText.includes(inst.title.toLowerCase())
        );
        if (!matched) {
          matched = activeInstallments[0];
        }

        if (matched.paidMonths >= matched.totalMonths) {
          fullResponse = isTagalog
            ? `Bayad na nang buo ang installment plan na **${matched.title}**!`
            : `The installment plan **${matched.title}** is already fully paid!`;
        } else {
          const knownBanks = ['cash', 'gotyme', 'gcash', 'maya', 'maribank', 'bpi', 'bdo', 'metrobank', 'unionbank', 'seabank', 'visa'];
          let targetBank = 'GCash';
          for (const b of knownBanks) {
            if (lowerUserText.includes(b)) {
              if (b === 'cash') targetBank = 'Cash';
              else if (b === 'gotyme') targetBank = 'GoTyme';
              else if (b === 'gcash') targetBank = 'GCash';
              else if (b === 'maya') targetBank = 'Maya';
              else if (b === 'maribank') targetBank = 'MariBank';
              else if (b === 'bpi') targetBank = 'BPI';
              else if (b === 'bdo') targetBank = 'BDO';
              else if (b === 'metrobank') targetBank = 'Metrobank';
              else if (b === 'unionbank') targetBank = 'UnionBank';
              else if (b === 'seabank') targetBank = 'SeaBank';
              else if (b === 'visa') targetBank = 'Visa';
              break;
            }
          }

          const newPaidMonths = matched.paidMonths + 1;
          const isCompleted = newPaidMonths >= matched.totalMonths;
          const newStatus = isCompleted ? 'completed' : 'active';
          const nextCutoff = matched.nextCutoff + 30 * 86400000;

          await db.execute(
            'UPDATE installments SET paidMonths = ?, status = ?, nextCutoff = ? WHERE id = ?',
            [newPaidMonths, newStatus, nextCutoff, matched.id]
          );

          const txId = uuidv4();
          const now = Date.now();
          const note = `Installment (${newPaidMonths}/${matched.totalMonths}) - ${matched.title}`;
          await db.execute(
            'INSERT INTO transactions (id, amount, type, categoryId, date, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [txId, matched.monthlyAmount, 'expense', 'Bills & Utilities', now, note, targetBank]
          );

          await db.execute(
            'UPDATE cards SET balance = balance - ? WHERE LOWER(bankName) = LOWER(?)',
            [matched.monthlyAmount, targetBank]
          );

          const cardRes = await db.execute('SELECT balance FROM cards WHERE LOWER(bankName) = LOWER(?)', [targetBank]);
          const newBal = cardRes.rows?._array[0]?.balance;
          const balStr = newBal !== undefined ? ` (Natitirang balance sa ${targetBank}: ${symbol}${Number(newBal).toLocaleString('en-US', { minimumFractionDigits: 2 })})` : '';

          DeviceEventEmitter.emit('transactions_updated');
          DeviceEventEmitter.emit('installments_updated');

          fullResponse = isTagalog
            ? `✓ Na-deduct na ang cut-off ${newPaidMonths}/${matched.totalMonths} (${symbol}${matched.monthlyAmount.toFixed(2)}) para sa **${matched.title}** mula sa iyong ${targetBank}!${balStr}`
            : `✓ Deducted cut-off ${newPaidMonths}/${matched.totalMonths} (${symbol}${matched.monthlyAmount.toFixed(2)}) for **${matched.title}** from your ${targetBank}!${balStr}`;
        }
      }
    } else if (isInstallmentQuery) {
      // ── Retrieve Real-Time Active Installment Plans ──
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

      const res = await db.execute('SELECT * FROM installments ORDER BY status ASC, nextCutoff ASC');
      const installmentsList = (res.rows?._array || []) as any[];

      if (installmentsList.length === 0) {
        fullResponse = isTagalog
          ? `Wala ka pang recorded na installment plan sa SQLite. Pwede kang magdagdag sa Installment Plans widget!`
          : `You don't have any recorded installment plans. You can add one under Installment Plans!`;
      } else {
        const lines = installmentsList.map((inst: any) => {
          const paidStr = `${inst.paidMonths} of ${inst.totalMonths} paid`;
          const cutoffDate = new Date(inst.nextCutoff).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const isDone = inst.status === 'completed';
          const statusBadge = isDone ? ' (Completed 🎉)' : ` (Next cut-off: ${cutoffDate})`;
          return `• **${inst.title}**: ${symbol}${Number(inst.monthlyAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}/cut-off [${paidStr}, Total: ${symbol}${Number(inst.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}]${statusBadge}`;
        });

        fullResponse = isTagalog
          ? `Narito ang kasalukuyang status ng iyong Installment Plans:\n\n` + lines.join('\n')
          : `Here is the current real-time status of your Installment Plans:\n\n` + lines.join('\n');
      }
    } else if (isGoalQuery) {
      // ── Real-Time Savings Goals Retrieval from SQLite ──
      const goalsRes = await db.execute('SELECT * FROM goals');
      const goals = (goalsRes.rows?._array || []) as any[];

      if (goals.length === 0) {
        fullResponse = isTagalog
          ? `Wala ka pang active na savings goals sa SQLite. Pwede kang magdagdag sa Savings Goals tab!`
          : `You don't have any active savings goals currently set up. You can add one in the Savings Goals tab!`;
      } else {
        // ── Intelligent Fuzzy Goal Matching (handles typos like 'onexplaye' -> 'OneXplayer' or 'drone') ──
        const cleanUserWords = lowerUserText.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);

        let bestGoal: any = null;
        let highestScore = 0;

        for (const g of goals) {
          const titleLower = g.title.toLowerCase().replace(/[^a-z0-9]/g, '');
          let score = 0;

          // 1. Direct exact or substring match
          if (lowerUserText.includes(g.title.toLowerCase()) || lowerUserText.includes(titleLower)) {
            score += 10;
          }

          // 2. Token overlap & prefix fuzzy matching
          for (const word of cleanUserWords) {
            const cleanW = word.replace(/[^a-z0-9]/g, '');
            if (cleanW.length >= 3) {
              if (titleLower.includes(cleanW) || cleanW.includes(titleLower)) {
                score += 8;
              } else {
                const minLen = Math.min(cleanW.length, titleLower.length);
                if (minLen >= 4 && cleanW.slice(0, 4) === titleLower.slice(0, 4)) {
                  score += 6;
                }
              }
            }
          }

          if (score > highestScore) {
            highestScore = score;
            bestGoal = g;
          }
        }

        const isFeasibilityQuery = 
          highestScore > 0 ||
          lowerUserText.includes('can i') ||
          lowerUserText.includes('can make') ||
          lowerUserText.includes('make my goal') ||
          lowerUserText.includes('reach') ||
          lowerUserText.includes('aabot') ||
          lowerUserText.includes('maabot') ||
          lowerUserText.includes('kaya ba') ||
          lowerUserText.includes('kaya ko') ||
          lowerUserText.includes('kaya pa') ||
          lowerUserText.includes('kakayanin') ||
          lowerUserText.includes('mabibili') ||
          lowerUserText.includes('cutoff') ||
          lowerUserText.includes('cut off') ||
          lowerUserText.includes('per cutoff') ||
          lowerUserText.includes('how much needed') ||
          lowerUserText.includes('how much per') ||
          ['jan', 'january', 'feb', 'february', 'fubuary', 'mar', 'march', 'apr', 'april', 'may', 'jun', 'june', 'jul', 'july', 'aug', 'august', 'sep', 'sept', 'september', 'oct', 'october', 'nov', 'november', 'dec', 'december'].some(m => lowerUserText.includes(m));

        const targetGoal = highestScore > 0 ? bestGoal : goals[0];

        if (isFeasibilityQuery && targetGoal) {
          const cur = Number(targetGoal.current || 0);
          const tgt = Number(targetGoal.target || 0);
          const needed = Math.max(0, tgt - cur);
          const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;

          // Compute remaining months & paydays (15th & 30th cutoffs) dynamically from targetDate
          const now = new Date();
          let targetYear = now.getFullYear();
          let targetMonthIndex = 11; // default Dec

          if (targetGoal.targetDate) {
            const dateStr = targetGoal.targetDate.toLowerCase();
            const yearMatch = dateStr.match(/\d{4}/);
            if (yearMatch) targetYear = parseInt(yearMatch[0], 10);
            
            const monthsMap: Record<string, number> = {
              jan: 0, january: 0,
              feb: 1, february: 1, fubuary: 1,
              mar: 2, march: 2,
              apr: 3, april: 3,
              may: 4,
              jun: 5, june: 5,
              jul: 6, july: 6,
              aug: 7, august: 7,
              sep: 8, sept: 8, september: 8,
              oct: 9, october: 9,
              nov: 10, november: 10,
              dec: 11, december: 11
            };
            for (const [mName, mIdx] of Object.entries(monthsMap)) {
              if (dateStr.includes(mName)) {
                targetMonthIndex = mIdx;
                break;
              }
            }
          }

          const targetDateObj = new Date(targetYear, targetMonthIndex, 30);
          const diffMs = targetDateObj.getTime() - now.getTime();
          const monthsRemaining = Math.max(0.5, Math.round((diffMs / (30 * 86400000)) * 10) / 10);
          const cutoffsRemaining = Math.max(1, Math.round(monthsRemaining * 2));

          const neededPerMonth = needed / monthsRemaining;
          const neededPerCutoff = needed / cutoffsRemaining;

          // Fetch average income or user configured cutoff income
          const incRes = await db.execute('SELECT SUM(amount) as totalInc FROM transactions WHERE type = "income"');
          const totalInc = Number(incRes.rows?._array[0]?.totalInc || 0);
          const userCutoff = getCutoffIncome();
          const estimatedCutoffIncome = userCutoff > 0 ? userCutoff : (totalInc > 0 ? (totalInc / 2) : 15000);
          const remainingForLiving = Math.max(0, estimatedCutoffIncome - neededPerCutoff);

          if (isTagalog) {
            fullResponse = `Oo! Kaya mong maabot ang iyong goal na **${targetGoal.title}** sa **${targetGoal.targetDate}** sa tulong ng cutoff savings plan na ito:\n\n` +
              `📊 **Goal Breakdown:**\n` +
              `• Target Amount: ${symbol}${tgt.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
              `• Naka-ipon na: ${symbol}${cur.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${pct}% funded)\n` +
              `• Kulang pa: **${symbol}${needed.toLocaleString('en-US', { minimumFractionDigits: 2 })}**\n\n` +
              `🗓️ **Timeline & Payday Cutoffs:**\n` +
              `• May **${monthsRemaining} buwan** pa (humigit-kumulang **${cutoffsRemaining} salary cutoffs**: 15th & 30th paydays hanggang ${targetGoal.targetDate}).\n\n` +
              `💡 **Suggested Cutoff Savings Guide:**\n` +
              `• **I-set aside bawat cutoff:** **${symbol}${neededPerCutoff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / cutoff** (${symbol}${neededPerMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / buwan).\n` +
              `• **Cutoff Allocation:** Mula sa humigit-kumulang ${symbol}${estimatedCutoffIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} sahod bawat cutoff, itabi ang **${symbol}${neededPerCutoff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** sa ${targetGoal.title} goal mo, at mananatili ang **${symbol}${remainingForLiving.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** para sa pang-araw-araw na gastos at bills.\n\n` +
              `Kaya mo 'yan! I-lock ang ${symbol}${Math.ceil(neededPerCutoff).toLocaleString()} bawat sweldo at maiuwi mo ang ${targetGoal.title} sa ${targetGoal.targetDate}! 🚀`;
          } else {
            fullResponse = `Yes! You can definitely reach your **${targetGoal.title}** goal by **${targetGoal.targetDate}** with this cutoff savings plan:\n\n` +
              `📊 **Goal Breakdown:**\n` +
              `• Target Amount: ${symbol}${tgt.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
              `• Currently Saved: ${symbol}${cur.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${pct}% funded)\n` +
              `• Remaining Needed: **${symbol}${needed.toLocaleString('en-US', { minimumFractionDigits: 2 })}**\n\n` +
              `🗓️ **Timeline & Payday Cutoffs:**\n` +
              `• You have **${monthsRemaining} months** remaining (approx. **${cutoffsRemaining} salary cutoffs**: 15th & 30th paydays until ${targetGoal.targetDate}).\n\n` +
              `💡 **Suggested Cutoff Savings Guide:**\n` +
              `• **Save per cutoff:** **${symbol}${neededPerCutoff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / cutoff** (${symbol}${neededPerMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month).\n` +
              `• **Cutoff Budget Allocation:** Out of an estimated ${symbol}${estimatedCutoffIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} income per cutoff: set aside **${symbol}${neededPerCutoff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** directly to your ${targetGoal.title} goal, leaving **${symbol}${remainingForLiving.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** for living expenses and bills.\n\n` +
              `Stick to saving ${symbol}${Math.ceil(neededPerCutoff).toLocaleString()} every payday and you'll hit your ${targetGoal.title} goal right on schedule for ${targetGoal.targetDate}! 🚀`;
          }
        } else {
          // Standard overview list of all goals
          const goalList = goals.map(g => {
            const cur = Number(g.current || 0);
            const tgt = Number(g.target || 0);
            const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
            const needed = Math.max(0, tgt - cur);
            return isTagalog
              ? `🎯 ${g.title}: Naka-ipon ka na ng ${symbol}${cur.toLocaleString('en-US', { minimumFractionDigits: 2 })} sa target na ${symbol}${tgt.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${pct}% funded, ${symbol}${needed.toLocaleString('en-US', { minimumFractionDigits: 2 })} pa ang kailangan by ${g.targetDate}).`
              : `🎯 ${g.title}: Saved ${symbol}${cur.toLocaleString('en-US', { minimumFractionDigits: 2 })} of ${symbol}${tgt.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${pct}% funded, ${symbol}${needed.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining by ${g.targetDate}).`;
          }).join('\n\n');

          fullResponse = isTagalog
            ? `Narito ang iyong active savings goals:\n\n${goalList}`
            : `Here are your current savings goals:\n\n${goalList}`;
        }
      }
    } else if (isTodaySpendQuery) {
      // ── Real-Time Today's Spending Breakdown from SQLite ──
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfToday = startOfToday + 86400000;

      const todayByBankRes = await db.execute(
        `SELECT bankName, SUM(amount) as cardSpent 
         FROM transactions 
         WHERE (type = "expense" OR type = "credit_purchase") 
           AND CAST(date AS INTEGER) >= ? 
           AND CAST(date AS INTEGER) < ? 
         GROUP BY bankName 
         ORDER BY cardSpent DESC`,
        [startOfToday, endOfToday]
      );

      const todayTotalRes = await db.execute(
        `SELECT SUM(amount) as grandTotal 
         FROM transactions 
         WHERE (type = "expense" OR type = "credit_purchase") 
           AND CAST(date AS INTEGER) >= ? 
           AND CAST(date AS INTEGER) < ?`,
        [startOfToday, endOfToday]
      );

      const grandTotal = Number(todayTotalRes.rows?._array[0]?.grandTotal || 0);
      const byBank = todayByBankRes.rows?._array || [];

      if (grandTotal === 0) {
        fullResponse = isTagalog
          ? `Wala ka pang na-record na gastos ngayong araw!`
          : `You haven't spent any money today!`;
      } else {
        const breakdownLines = byBank.map((row: any) => {
          const bank = row.bankName || 'Other';
          const spent = Number(row.cardSpent || 0);
          return `${bank} = -${spent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
        });

        fullResponse = isTagalog
          ? `Ang kabuuang nagastos mo ngayong araw:\n**-${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}**\n\n` + breakdownLines.join('\n')
          : `You spent money today:\n**-${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}**\n\n` + breakdownLines.join('\n');
      }
    } else if (isWeekSpendQuery) {
      // ── Real-Time Weekly Spending Breakdown from SQLite ──
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfWeek = startOfToday - 6 * 86400000; // Past 7 days including today

      const weekByBankRes = await db.execute(
        `SELECT bankName, SUM(amount) as cardSpent 
         FROM transactions 
         WHERE (type = "expense" OR type = "credit_purchase") 
           AND CAST(date AS INTEGER) >= ? 
         GROUP BY bankName 
         ORDER BY cardSpent DESC`,
        [startOfWeek]
      );

      const weekTotalRes = await db.execute(
        `SELECT SUM(amount) as grandTotal 
         FROM transactions 
         WHERE (type = "expense" OR type = "credit_purchase") 
           AND CAST(date AS INTEGER) >= ?`,
        [startOfWeek]
      );

      const grandTotal = Number(weekTotalRes.rows?._array[0]?.grandTotal || 0);
      const byBank = weekByBankRes.rows?._array || [];

      if (grandTotal === 0) {
        fullResponse = isTagalog
          ? `Wala ka pang na-record na gastos ngayong linggo!`
          : `You haven't spent any money this whole week!`;
      } else {
        const breakdownLines = byBank.map((row: any) => {
          const bank = row.bankName || 'Other';
          const spent = Number(row.cardSpent || 0);
          return `${bank} = -${spent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
        });

        fullResponse = isTagalog
          ? `Ang kabuuang nagastos mo ngayong linggo:\n**-${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}**\n\n` + breakdownLines.join('\n')
          : `You spent money this whole week:\n**-${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}**\n\n` + breakdownLines.join('\n');
      }
    } else if (isCardListQuery || lowerUserText.includes('cards') || lowerUserText.includes('wallets')) {
      // ── Real-Time Cards & E-Wallets Balances from SQLite ──
      const cardsRes = await db.execute('SELECT bankName, balance, type, outstandingBalance, availableCredit FROM cards ORDER BY balance DESC');
      const cards = (cardsRes.rows?._array || []) as any[];

      const hasMoneyOnly = 
        lowerUserText.includes('may laman') ||
        lowerUserText.includes('may pera') ||
        lowerUserText.includes('laman na pera') ||
        lowerUserText.includes('with money') ||
        lowerUserText.includes('has money') ||
        lowerUserText.includes('positive balance') ||
        lowerUserText.includes('cards with money') ||
        lowerUserText.includes('nonzero') ||
        !lowerUserText.includes('all'); // Filter out 0 balance cards by default unless user explicitly asks for "all cards"

      const targetCards = hasMoneyOnly
        ? cards.filter((c: any) => c.type === 'CREDIT_CARD' ? Number(c.outstandingBalance || 0) > 0 : Number(c.balance || 0) > 0)
        : cards;

      if (targetCards.length === 0) {
        fullResponse = isTagalog
          ? `Wala pang cards o e-wallets na may laman na pera sa ngayon.`
          : `No cards or e-wallets currently have an active balance.`;
      } else {
        const cardLines = targetCards.map((c: any) => {
          if (c.type === 'CREDIT_CARD') {
            const debt = Number(c.outstandingBalance || 0);
            return `${c.bankName} (Credit Debt) = -${debt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
          } else {
            const bal = Number(c.balance || 0);
            return `${c.bankName} = ${bal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
          }
        });

        fullResponse = isTagalog
          ? (hasMoneyOnly
              ? `Narito ang mga cards & e-wallets mo na may laman na pera:\n\n` + cardLines.join('\n')
              : `Narito ang kasalukuyang balance ng iyong mga cards & e-wallets:\n\n` + cardLines.join('\n'))
          : (hasMoneyOnly
              ? `Here are your cards & e-wallets with an active balance:\n\n` + cardLines.join('\n')
              : `Here are all your current card & wallet balances:\n\n` + cardLines.join('\n'));
      }
    } else {
      // ── Dynamic Specific Card/Bank Balance Lookup ──
      const cardsRes = await db.execute('SELECT bankName, balance, type, outstandingBalance, availableCredit FROM cards');
      const allCards = (cardsRes.rows?._array || []) as any[];
      const matchedCards = allCards.filter((c: any) => {
        const name = (c.bankName || '').toLowerCase();
        if (!name) return false;
        if (lowerUserText.includes(name)) return true;
        const words = name.split(/\s+/);
        return words.some((w: string) => w.length >= 3 && lowerUserText.includes(w));
      });

      if (matchedCards.length === 1) {
        const matchedCard = matchedCards[0];
        if (matchedCard.type === 'CREDIT_CARD') {
          const debt = Number(matchedCard.outstandingBalance || 0);
          const avail = Number(matchedCard.availableCredit || 0);
          fullResponse = isTagalog
            ? `Ang kasalukuyang utang mo sa ${matchedCard.bankName} ay ${symbol}${debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}. May available credit ka pa na ${symbol}${avail.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
            : `Your current ${matchedCard.bankName} credit card debt is ${symbol}${debt.toLocaleString('en-US', { minimumFractionDigits: 2 })} with ${symbol}${avail.toLocaleString('en-US', { minimumFractionDigits: 2 })} available credit remaining.`;
        } else {
          const bal = Number(matchedCard.balance || 0);
          fullResponse = isTagalog
            ? `Ang natitirang pera / balance mo sa ${matchedCard.bankName} ay ${symbol}${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
            : `Your current ${matchedCard.bankName} balance is ${symbol}${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`;
        }
      } else if (matchedCards.length > 1) {
        const cardLines = matchedCards.map((c: any) => {
          if (c.type === 'CREDIT_CARD') {
            const debt = Number(c.outstandingBalance || 0);
            return `• ${c.bankName} (Credit Debt): -${symbol}${debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
          } else {
            const bal = Number(c.balance || 0);
            return `• ${c.bankName}: ${symbol}${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
          }
        });

        fullResponse = isTagalog
          ? `Narito ang kasalukuyang balance ng iyong mga hinahanap na cards & e-wallets:\n\n` + cardLines.join('\n')
          : `Here are the current balances for your requested cards & wallets:\n\n` + cardLines.join('\n');
      } else if (lowerUserText.includes('lahat') || lowerUserText.includes('total') || lowerUserText.includes('net worth')) {
        const totalAssets = allCards.filter((c: any) => c.type !== 'CREDIT_CARD').reduce((acc: number, c: any) => acc + Number(c.balance || 0), 0);
        const creditDebt = allCards.filter((c: any) => c.type === 'CREDIT_CARD').reduce((acc: number, c: any) => acc + Number(c.outstandingBalance || 0), 0);
        const netWorth = totalAssets - creditDebt;

        fullResponse = isTagalog
          ? `May kabuuang ${symbol}${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })} sa iyong mga bank accounts & e-wallets. May utang sa credit card na ${symbol}${creditDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Ang iyong Net Worth ay ${symbol}${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
          : `Total Assets: ${symbol}${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}\nCredit Debt: ${symbol}${creditDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}\nNet Worth: ${symbol}${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      } else {
        const aggRes = await db.execute('SELECT categoryId, SUM(amount) as total FROM transactions WHERE type = "expense" GROUP BY categoryId ORDER BY total DESC LIMIT 1');
        const topCat = aggRes.rows?._array[0];
        if (topCat) {
          fullResponse = isTagalog
            ? `Ang pinakamalaki mong pinag-gastusan ay sa ${topCat.categoryId} na may kabuuang ${symbol}${Number(topCat.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
            : `Your highest expense category is ${topCat.categoryId} with a total of ${symbol}${Number(topCat.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`;
        } else {
          fullResponse = isTagalog ? `Wala pang recorded na gastos.` : `No expenses logged yet.`;
        }
      }
    }
  } 
  // 2. Check for Correction (e.g., "actually 250" or "250 pala")
  else if ((lowerUserText.includes('actually') || lowerUserText.includes('pala')) && /\d+/.test(lowerUserText)) {
    const newAmountMatch = lowerUserText.match(/\d+(?:\.\d+)?/);
    if (newAmountMatch) {
      const newAmount = parseFloat(newAmountMatch[0]);
      const lastTxRes = await db.execute('SELECT * FROM transactions ORDER BY date DESC LIMIT 1');
      const lastTx = lastTxRes.rows?._array[0];

      if (lastTx) {
        const diff = newAmount - Number(lastTx.amount);
        const bankName = lastTx.bankName || 'GCash';

        await db.execute('UPDATE transactions SET amount = ? WHERE id = ?', [newAmount, lastTx.id]);
        if (lastTx.type === 'expense') {
          await db.execute('UPDATE cards SET balance = balance - ? WHERE LOWER(bankName) = LOWER(?)', [diff, bankName]);
        } else if (lastTx.type === 'income') {
          await db.execute('UPDATE cards SET balance = balance + ? WHERE LOWER(bankName) = LOWER(?)', [diff, bankName]);
        }

        DeviceEventEmitter.emit('transactions_updated');
        fullResponse = isTagalog
          ? `Sige! Na-update ko na ang nakaraang transaction sa ${symbol}${newAmount.toFixed(2)} at inayos ang balance ng ${bankName}.`
          : `Updated previous transaction to ${symbol}${newAmount.toFixed(2)} and adjusted ${bankName} balance!`;
      }
    }
  }
  else {
    fullResponse = isTagalog
      ? "May maitutulong ba ako sa iyong budget, cards, o transactions ngayong araw?"
      : "How can I help you manage your budget and cards today?";
  }

  // Stream output token by token
  const tokens = fullResponse.split(/(?<=\s)/);
  for (const token of tokens) {
    await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25));
    onToken(token);
  }

  useAIStore.getState().updateMetrics(0, 1000 / 55);
  return fullResponse;
};

export const unloadModel = async () => {
  isModelLoaded = false;
  useAIStore.getState().setStatus(false, undefined);
};
