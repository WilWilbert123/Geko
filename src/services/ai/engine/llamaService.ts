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

  // 0. Check for Cutoff Income Configuration & Salary Cutoff Inquiries in Chat
  const isSalaryKeyword =
    lowerUserText.includes('salary') ||
    lowerUserText.includes('sweldo') ||
    lowerUserText.includes('sahod') ||
    lowerUserText.includes('payday') ||
    lowerUserText.includes('kita') ||
    lowerUserText.includes('payout');

  const isCutoffKeyword =
    lowerUserText.includes('cutoff') ||
    lowerUserText.includes('cut off') ||
    lowerUserText.includes('cut-off');

  const isSetCutoffQuery =
    (isCutoffKeyword || lowerUserText.includes('payday')) &&
    (lowerUserText.includes('set') || lowerUserText.includes('income') || lowerUserText.includes('is') || lowerUserText.includes('change') || lowerUserText.includes('update') || lowerUserText.includes('my') || lowerUserText.includes('sweldo') || lowerUserText.includes('sahod')) &&
    /\d+/.test(lowerUserText);

  const isGetCutoffQuery =
    isSalaryKeyword ||
    (isCutoffKeyword &&
      !lowerUserText.includes('installment') &&
      !lowerUserText.includes('installments') &&
      !lowerUserText.includes('hulugan') &&
      !lowerUserText.includes('iphone') &&
      !lowerUserText.includes('bnpl') &&
      !lowerUserText.includes('loan') &&
      !lowerUserText.includes('plan'));

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
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();

    let nextCutoffDate: Date;
    if (day < 15) {
      nextCutoffDate = new Date(year, month, 15);
    } else if (day < lastDay) {
      nextCutoffDate = new Date(year, month, lastDay);
    } else {
      nextCutoffDate = new Date(year, month + 1, 15);
    }

    const diffMs = nextCutoffDate.getTime() - new Date(year, month, day).getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const cutoffDateStr = nextCutoffDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const daysLeftTagalog = daysLeft === 0 ? 'Ngayon' : daysLeft === 1 ? 'Bukas' : `${daysLeft} araw na lang`;
    const daysLeftEnglish = daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `in ${daysLeft} days`;

    fullResponse = isTagalog
      ? `Ang iyong salary cutoff schedule ay tuwing **ika-15 at ika-30 (o katapusan)** ng bawat buwan.\n\n` +
        `📅 **Susunod na Salary Cut-off / Payday**: **${cutoffDateStr}** (${daysLeftTagalog})\n` +
        `💵 **Nakatakdang Salary Income**: **${symbol}${curCutoff.toLocaleString('en-US', { minimumFractionDigits: 2 })}** / cutoff.`
      : `Your salary cutoff schedule is on the **15th and 30th (or end of month)** of every month.\n\n` +
        `📅 **Next Salary Cut-off / Payday**: **${cutoffDateStr}** (${daysLeftEnglish})\n` +
        `💵 **Configured Cut-off Income**: **${symbol}${curCutoff.toLocaleString('en-US', { minimumFractionDigits: 2 })}** / cutoff.`;

    const tokens = fullResponse.split(/(?<=\s)/);
    for (const token of tokens) {
      await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25));
      onToken(token);
    }
    useAIStore.getState().updateMetrics(0, 1000 / 55);
    return fullResponse;
  }

  // 1. Check if input is a Transaction (e.g. "Kumain ako sa labas 180 gamit gotyme" or "Dagdagan Mo laman ng gcash ko 50") vs a Question
  const isExplicitQuestion =
    lowerUserText.includes('?') ||
    /\bmagkano\b/i.test(lowerUserText) ||
    /\bhow much\b/i.test(lowerUserText) ||
    /\bwhat is\b/i.test(lowerUserText) ||
    /\bwhat are\b/i.test(lowerUserText) ||
    /\baabot\b/i.test(lowerUserText) ||
    /\bkaya ba\b/i.test(lowerUserText) ||
    /\bpila\b/i.test(lowerUserText) ||
    /\bilan\b/i.test(lowerUserText) ||
    /\bano\b/i.test(lowerUserText) ||
    /\bcards balance\b/i.test(lowerUserText) ||
    /\bcard balance\b/i.test(lowerUserText) ||
    /\bwallet balance\b/i.test(lowerUserText) ||
    /\blist my card\b/i.test(lowerUserText) ||
    /\blist card\b/i.test(lowerUserText) ||
    /\blist wallet\b/i.test(lowerUserText) ||
    /\bshow my cards\b/i.test(lowerUserText);

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

  const isEmptyCardQuery =
    lowerUserText.includes('walang laman') ||
    lowerUserText.includes('walang pera') ||
    lowerUserText.includes('empty card') ||
    lowerUserText.includes('empty cards') ||
    lowerUserText.includes('zero balance') ||
    lowerUserText.includes('0 balance') ||
    lowerUserText.includes('no balance') ||
    lowerUserText.includes('no money') ||
    (
      (lowerUserText.includes('card') || lowerUserText.includes('cards') || lowerUserText.includes('wallet') || lowerUserText.includes('wallets') || lowerUserText.includes('bank') || lowerUserText.includes('banks')) &&
      (lowerUserText.includes('empty') || lowerUserText.includes('zero') || lowerUserText.includes('0') || lowerUserText.includes('walang') || lowerUserText.includes('ubos'))
    );

  const isCardListQuery =
    !hasValidTransactionIntent && (
      isEmptyCardQuery ||
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
        (lowerUserText.includes('all') || lowerUserText.includes('list') || lowerUserText.includes('show') || lowerUserText.includes('balance') || lowerUserText.includes('lahat'))
      )
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
    (lowerUserText.includes('installment') ||
      lowerUserText.includes('installments') ||
      lowerUserText.includes('hulugan') ||
      lowerUserText.includes('bnpl') ||
      lowerUserText.includes('babayaran') ||
      ((lowerUserText.includes('cut-off') || lowerUserText.includes('cutoff')) && !isSalaryKeyword)) &&
    !isGetCutoffQuery;

  const isInstallmentDeductAction =
    isInstallmentQuery &&
    (lowerUserText.includes('deduct') ||
      lowerUserText.includes('pay') ||
      lowerUserText.includes('bayaran') ||
      lowerUserText.includes('bawasan') ||
      lowerUserText.includes('bawas') ||
      lowerUserText.includes('bayad'));

  const isBankMentioned = ['cash', 'gotyme', 'gcash', 'maya', 'maribank', 'bpi', 'bdo', 'metrobank', 'unionbank', 'seabank', 'visa', 'landbank', 'pnb'].some(b => {
    if (b === 'cash') return /\bcash\b/i.test(lowerUserText) && !lowerUserText.includes('gcash');
    return lowerUserText.includes(b);
  });

  const isFollowUpQuery =
    !hasValidTransactionIntent &&
    (lowerUserText.includes('how about') ||
      lowerUserText.includes('what about') ||
      lowerUserText.includes('how bout') ||
      lowerUserText.includes('eh sa') ||
      lowerUserText.includes('eh ang') ||
      lowerUserText.includes('pano sa') ||
      lowerUserText.includes('paano sa') ||
      lowerUserText.includes('paano naman') ||
      lowerUserText.includes('kamusta sa') ||
      lowerUserText.includes('musta sa') ||
      lowerUserText.includes('kumusta sa') ||
      (isBankMentioned && (isExplicitQuestion || lowerUserText.includes('bal') || lowerUserText.includes('per') || lowerUserText.includes('laman'))));

  const isAffordabilityQuery =
    lowerUserText.includes('afford') ||
    lowerUserText.includes('dinner') ||
    lowerUserText.includes('lunch') ||
    lowerUserText.includes('breakfast') ||
    lowerUserText.includes('merienda') ||
    lowerUserText.includes('hapunan') ||
    lowerUserText.includes('tanghalian') ||
    lowerUserText.includes('almusal') ||
    lowerUserText.includes('can i buy') ||
    lowerUserText.includes('can i spend') ||
    lowerUserText.includes('should i buy') ||
    lowerUserText.includes('kaya ba') ||
    lowerUserText.includes('kakayanin ba') ||
    lowerUserText.includes('afford ko ba') ||
    lowerUserText.includes('pwede ba ako') ||
    lowerUserText.includes('pwede ba bumili') ||
    lowerUserText.includes('may budget pa ba');

  // ── Creator & Developer Recognition ──
  const isCreatorQuery =
    lowerUserText.includes('who create') ||
    lowerUserText.includes('who created') ||
    lowerUserText.includes('who develop') ||
    lowerUserText.includes('who developed') ||
    lowerUserText.includes('who made you') ||
    lowerUserText.includes('who made this') ||
    lowerUserText.includes('who build you') ||
    lowerUserText.includes('who built you') ||
    lowerUserText.includes('who built this') ||
    lowerUserText.includes('who designed you') ||
    lowerUserText.includes('who is the creator') ||
    lowerUserText.includes('who is your creator') ||
    lowerUserText.includes('who is the developer') ||
    lowerUserText.includes('who is your developer') ||
    lowerUserText.includes('who is your maker') ||
    lowerUserText.includes('who is the maker') ||
    lowerUserText.includes('who is the author') ||
    lowerUserText.includes('who is the owner') ||
    lowerUserText.includes('who owns you') ||
    lowerUserText.includes('who owns this app') ||
    lowerUserText.includes('who programmed') ||
    lowerUserText.includes('who wrote this') ||
    lowerUserText.includes('sino gumawa') ||
    lowerUserText.includes('sino lumikha') ||
    lowerUserText.includes('sino nag develop') ||
    lowerUserText.includes('sino nag-develop') ||
    lowerUserText.includes('sino nagdevelop') ||
    lowerUserText.includes('sino developer') ||
    lowerUserText.includes('sino creator') ||
    lowerUserText.includes('sino ang gumawa') ||
    lowerUserText.includes('sino may-ari') ||
    lowerUserText.includes('sino may ari') ||
    lowerUserText.includes('sino ang lumikha');

  // ── How to Save Card Allowance Tutorial ──
  const isSaveAllowanceTutorial =
    (lowerUserText.includes('allowance') || lowerUserText.includes('baon')) &&
    (lowerUserText.includes('save') ||
      lowerUserText.includes('ipon') ||
      lowerUserText.includes('tipid') ||
      lowerUserText.includes('manage') ||
      lowerUserText.includes('budget') ||
      lowerUserText.includes('hatiin') ||
      lowerUserText.includes('alokasyon'));

  // ── How to Save (General Savings Tutorial) ──
  const isSaveGeneralTutorial =
    !isSaveAllowanceTutorial &&
    (lowerUserText.includes('how to to save') ||
      lowerUserText.includes('how to save') ||
      lowerUserText.includes('how do i save') ||
      lowerUserText.includes('how can i save') ||
      lowerUserText.includes('tips to save') ||
      lowerUserText.includes('ways to save') ||
      lowerUserText.includes('how to start saving') ||
      lowerUserText.includes('pano mag save') ||
      lowerUserText.includes('paano mag save') ||
      lowerUserText.includes('pano mag-save') ||
      lowerUserText.includes('paano mag-save') ||
      lowerUserText.includes('pano mag ipon') ||
      lowerUserText.includes('paano mag ipon') ||
      lowerUserText.includes('pano mag-ipon') ||
      lowerUserText.includes('paano mag-ipon') ||
      lowerUserText.includes('paano magtipid') ||
      lowerUserText.includes('pano magtipid') ||
      lowerUserText.includes('paano mag tipid') ||
      lowerUserText.includes('pano mag tipid') ||
      ((lowerUserText.includes('paano') || lowerUserText.includes('pano') || lowerUserText.includes('how')) &&
        (lowerUserText.includes('saving') || lowerUserText.includes('mag-ipon') || lowerUserText.includes('maka-ipon') || lowerUserText.includes('makaipon'))));

  // ── How to Add New Card Tutorial ──
  const isAddCardTutorial =
    !hasValidTransactionIntent &&
    (lowerUserText.includes('how to add new card') ||
      lowerUserText.includes('how to add card') ||
      lowerUserText.includes('how to add a card') ||
      lowerUserText.includes('how to create card') ||
      lowerUserText.includes('how to register card') ||
      lowerUserText.includes('how to connect card') ||
      lowerUserText.includes('how to add account') ||
      lowerUserText.includes('how to add new account') ||
      lowerUserText.includes('pano mag add ng card') ||
      lowerUserText.includes('paano mag add ng card') ||
      lowerUserText.includes('pano mag add card') ||
      lowerUserText.includes('paano mag add card') ||
      lowerUserText.includes('pano mag-add ng card') ||
      lowerUserText.includes('paano mag-add ng card') ||
      lowerUserText.includes('pano mag lagay ng card') ||
      lowerUserText.includes('paano maglagay ng card') ||
      lowerUserText.includes('pano mag gawa ng card') ||
      lowerUserText.includes('paano gumawa ng card') ||
      lowerUserText.includes('pano mag register ng card') ||
      lowerUserText.includes('paano magrehistro ng card') ||
      ((lowerUserText.includes('how to') || lowerUserText.includes('paano') || lowerUserText.includes('pano')) &&
        (lowerUserText.includes('add') || lowerUserText.includes('lagay') || lowerUserText.includes('gawa')) &&
        (lowerUserText.includes('card') || lowerUserText.includes('account') || lowerUserText.includes('wallet'))));

  // ── General App Tutorial & Features ──
  const isGeneralAppTutorial =
    !isCreatorQuery &&
    !isSaveAllowanceTutorial &&
    !isSaveGeneralTutorial &&
    !isAddCardTutorial &&
    (lowerUserText.includes('tutorial') ||
      lowerUserText.includes('how to use geko') ||
      lowerUserText.includes('paano gamitin ang geko') ||
      lowerUserText.includes('pano gamitin ang geko') ||
      lowerUserText.includes('how to use this app') ||
      lowerUserText.includes('paano gamitin tong app') ||
      lowerUserText.includes('pano gamitin to') ||
      lowerUserText.includes('quick start guide') ||
      lowerUserText.includes('app guide'));

  const isGreetingQuery =
    /^(hi|hello|hey|yo|sup|kamusta|kumusta|good morning|good afternoon|good evening|magandang araw|greetings)\b/i.test(lowerUserText.trim()) ||
    lowerUserText.includes('who are you') ||
    lowerUserText.includes('what can you do') ||
    lowerUserText.includes('sino ka') ||
    lowerUserText.includes('ano pwede mo gawin');

  const isSummaryOrAdviceQuery =
    lowerUserText.includes('financial status') ||
    lowerUserText.includes('financial advice') ||
    lowerUserText.includes('how am i doing') ||
    lowerUserText.includes('how is my budget') ||
    lowerUserText.includes('budget status') ||
    lowerUserText.includes('kamusta budget') ||
    lowerUserText.includes('summary') ||
    lowerUserText.includes('overview') ||
    lowerUserText.includes('advice');

  const isFinancialQuery =
    !hasValidTransactionIntent &&
    (isCreatorQuery ||
      isSaveAllowanceTutorial ||
      isSaveGeneralTutorial ||
      isAddCardTutorial ||
      isGeneralAppTutorial ||
      isGoalQuery ||
      isCardListQuery ||
      isTodaySpendQuery ||
      isWeekSpendQuery ||
      isInstallmentQuery ||
      isFollowUpQuery ||
      isAffordabilityQuery ||
      isGreetingQuery ||
      isSummaryOrAdviceQuery ||
      /\bmagkano\b/i.test(lowerUserText) ||
      /\bhow much\b/i.test(lowerUserText) ||
      /\bwhat is\b/i.test(lowerUserText) ||
      /\bwhat are\b/i.test(lowerUserText) ||
      /\bbalance\b/i.test(lowerUserText) ||
      /\bbalances\b/i.test(lowerUserText) ||
      /\bsaan ako\b/i.test(lowerUserText) ||
      /\bano ang\b/i.test(lowerUserText) ||
      /\bilan\b/i.test(lowerUserText) ||
      /\blaman\b/i.test(lowerUserText) ||
      /\bpila\b/i.test(lowerUserText) ||
      /\baabot\b/i.test(lowerUserText) ||
      /\bnet worth\b/i.test(lowerUserText));

  // A. Process Transaction Intent FIRST if user is stating a transaction (e.g. "Kumain ako sa labas 180 gamit gotyme")
  if (hasValidTransactionIntent) {
    try {
      const savedItems: ParsedTransaction[] = [];

      for (const item of candidateTransactions) {
        const newId = uuidv4();
        const date = Date.now();
        const bankName = item.bankName || 'GCash';

        if (bankName.toLowerCase() === 'cash') {
          const cashCardCheck = await db.execute("SELECT id FROM cards WHERE LOWER(bankName) = 'cash'");
          if (!cashCardCheck.rows?._array?.length) {
            await db.execute(
              "INSERT INTO cards (id, bankName, color1, color2, balance, monthlyBudget, type, paymentNetwork, creditLimit, outstandingBalance, availableCredit) VALUES ('card-physical-cash', 'Cash', '#0B0D12', '#10B981', 0, 5000, 'CASH', 'OTHER', 0, 0, 0)"
            );
            DeviceEventEmitter.emit('cards_updated');
          }
        }

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
        const isCash = targetBank.toLowerCase() === 'cash';
        const walletLabel = isCash ? 'Physical Cash wallet' : `${targetBank} card`;
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
              ? `✓ Na-record na ang nawalang ${symbol}${single.amount.toFixed(2)} (${single.note}). Nabawas na ito sa ${walletLabel} mo!${newBalStr}`
              : `✓ Recorded ${symbol}${single.amount.toFixed(2)} lost money (${single.note}). Deducted from your ${walletLabel}!${newBalStr}`;
          } else {
            fullResponse = isTagalog
              ? `✓ Na-record na ang ${single.note} worth ${symbol}${single.amount.toFixed(2)} (${single.categoryId}). Nabawas na ito sa ${walletLabel} mo!${newBalStr}`
              : `✓ Logged ${symbol}${single.amount.toFixed(2)} expense for "${single.note}" under ${single.categoryId} on ${targetBank}.${newBalStr}`;
          }
        } else {
          fullResponse = isTagalog
            ? `✓ Na-record na ang natanggap mong ${single.note} worth +${symbol}${single.amount.toFixed(2)}. Nadagdag na ito sa ${walletLabel} mo!${newBalStr}`
            : `✓ Logged +${symbol}${single.amount.toFixed(2)} income to ${targetBank}.${newBalStr}`;
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
    if (isCreatorQuery) {
      fullResponse = isTagalog
        ? `Ako ay nilikha at binuo ni **Wilbert Gamis**! 🦎\n\n` +
          `Binuo ni Wilbert ang **Geko** bilang isang matalino, pribado, at 100% offline na personal finance companion para sa bawat Pilipino. Ang layunin ay gawing simple at madali ang pamamahala ng pera nang walang anumang cloud tracking o ad spying:\n\n` +
          `• 💳 **Lahat ng Cards & E-Wallets sa Isang Lugar**: Real-time balances para sa BPI, GCash, Maya, GoTyme, MariBank, BDO, at 100+ Philippine presets na may interactive 3D card visuals.\n` +
          `• ⚡ **Natural Chat Logging**: Sabihin lang ang iyong gastos o kita (hal. *"Kumain 150 sa GCash"*), at agad itong naitatala nang walang paligoy-ligoy.\n` +
          `• 🎯 **Smart Ipon Goals & Payday Cutoffs**: Awtomatikong nagkakalkula kung magkano ang itatabi sa bawat 15th at 30th na sweldo para maabot ang iyong pangarap.\n` +
          `• 🔒 **100% Offline & Secure**: Lahat ng iyong records ay ligtas na nakatago sa iyong device lamang.\n\n` +
          `May maitutulong ba ako sa iyong mga accounts, budget, o savings goals ngayon?`
        : `I was created and developed by **Wilbert Gamis**! 🦎\n\n` +
          `Wilbert built **Geko** as an offline-first, intelligent personal finance assistant designed specifically for Filipinos. The mission is to make money management simple, empowering, and completely private on your device with zero cloud tracking:\n\n` +
          `• 💳 **All Your Cards & E-Wallets in One View**: Real-time balances with 100+ Philippine bank and digital wallet presets (BPI, GCash, Maya, GoTyme, MariBank, BDO, etc.) with interactive 3D cards.\n` +
          `• ⚡ **Hands-Free Natural Chat**: Just type or speak to log daily expenses, check balances, or add accounts.\n` +
          `• 🎯 **Smart Savings Goals & Payday Cutoffs**: Auto-calculated savings schedules aligned with your 15th & 30th paydays.\n` +
          `• 🔒 **100% Offline & Private**: All your financial data stays securely on your device—never sent to third-party servers.\n\n` +
          `Is there anything specific about your finances or accounts that I can assist you with today?`;
    } else if (isSaveAllowanceTutorial) {
      fullResponse = isTagalog
        ? `Narito ang pinakamabisang gabay para makapag-save at magtipid mula sa iyong **Card Allowance**! 💳✨\n\n` +
          `1. 🏦 **Ang 2-Card Separation Method**\n` +
          `• **Card 1: Pang-Araw-araw na Gastos (E-Wallet)** – Gamitin ang GCash o Maya para sa pamasahe, tanghalian, at merienda.\n` +
          `• **Card 2: Tagong Ipon (Untouchable Card)** – Magbukas ng high-yield savings card tulad ng GoTyme, SeaBank, o BPI. Huwag itong galawin para lumago ang interes.\n\n` +
          `2. 📅 **Magtakda ng Daily Allowance Cap**\n` +
          `• Hatiin ang kabuuang allowance sa bilang ng araw (hal. kung may ₱1,500 ka para sa 5 araw ng pasok, ang ceiling mo ay **₱300 bawat araw**).\n` +
          `• Ilipat lamang ang panggastos para sa araw na iyon sa iyong spending card; iwanan ang natitirang ₱1,200 sa iyong savings account.\n\n` +
          `3. ⚡ **I-record Agad ang Bawat Bawas Dito sa Geko AI**\n` +
          `• Sa tuwing gagastos o mamamasahe, i-chat lang agad kay Geko:\n` +
          `  - *"Bumili ng lunch 120 gamit GCash"*\n` +
          `  - *"Pamasahe 35 sa Maya"*\n` +
          `• Agad babawasan ni Geko ang balance ng iyong card para laging tumpak ang natitirang pera mo.\n\n` +
          `4. 🎯 **Magbukas ng Allowance Savings Goal**\n` +
          `• Pumunta sa **Plan** tab at pindutin ang **+ Add Goal** (hal. *"Emergency Baon"* o *"Gadget Fund"*).\n` +
          `• Sa pagtatapos ng linggo, anuman ang matira sa iyong allowance (kahit ₱50 o ₱100), ilipat agad sa iyong Goal!`
        : `Here is the ultimate step-by-step guide to saving from your **Card Allowance** in Geko! 💳✨\n\n` +
          `1. 🏦 **The 2-Card Separation Rule**\n` +
          `• **Card 1: Daily Spending (E-Wallet)** – Dedicate GCash or Maya solely for transit, lunch, and daily essentials.\n` +
          `• **Card 2: Untouchable Savings Card** – Keep your core funds in GoTyme, SeaBank, or BPI where high daily interest accumulates.\n\n` +
          `2. 📅 **Set a Strict Daily Spending Cap**\n` +
          `• Divide your allowance by active days (e.g. ₱1,500 across 5 days = **₱300/day maximum**).\n` +
          `• Only fund your spending wallet with today's ₱300 allocation; keep the remaining ₱1,200 locked in your savings account.\n\n` +
          `3. ⚡ **Log Transactions in Real-Time via Geko AI**\n` +
          `• Whenever you buy lunch or pay transit fare, simply chat with Geko:\n` +
          `  - *"Lunch 120 on GCash"*\n` +
          `  - *"Commute 40 on Maya"*\n` +
          `• Geko immediately deducts the amount from your card balance so you always know your exact remaining allowance.\n\n` +
          `4. 🎯 **Sweep Weekly Leftovers into a Geko Goal**\n` +
          `• Go to the **Plan** tab and tap **+ Add Goal** (e.g., *"Emergency Baon"* or *"Weekend Fund"*).\n` +
          `• Every Friday or weekend, transfer whatever remains from your daily allowance directly into this goal!`;
    } else if (isSaveGeneralTutorial) {
      fullResponse = isTagalog
        ? `Narito ang sunod-sunod na paraan kung paano mag-save at mag-ipon nang matagumpay gamit ang **Geko**! 🎯💰\n\n` +
          `1. 🎯 **Magtakda ng Malinaw na Savings Goal**\n` +
          `• Pumunta sa **Plan** tab sa ibaba ng screen.\n` +
          `• Pindutin ang **+ Add Goal** at ilagay ang iyong pinag-iipunan (hal. *Emergency Fund*, *New Phone*, o *Travel*).\n` +
          `• Ilagay ang iyong target amount at target date.\n\n` +
          `2. 📅 **Gamitin ang Payday Cut-off Method (15th & 30th)**\n` +
          `• Huwag mag-ipon mula sa kung ano ang "matira" sa katapusan ng buwan. Magtabi agad ng ipon sa mismong araw ng sahod!\n` +
          `• Awtomatikong kinakalkula ni Geko kung magkano ang kailangan mong itabi bawat salary cutoff para maabot ang target mo sa tamang oras.\n\n` +
          `3. 📊 **Sundan ang 50/30/20 Budgeting Rule**\n` +
          `• **50% Needs (Pangangailangan)**: Upa, kuryente, tubig, pagkain, groceries, pamasahe.\n` +
          `• **30% Wants (Kagustuhan)**: Kape, kain sa labas, sine, shopping.\n` +
          `• **20% Savings (Ipon & Debt)**: Diretso sa emergency fund at savings accounts.\n\n` +
          `4. 💬 **Makipag-usap kay Geko AI para sa Payo**\n` +
          `• Pwede kang magtanong dito sa chat kahit kailan:\n` +
          `  - *"Can I afford dinner tonight?"*\n` +
          `  - *"Magkano kailangan kong i-save bawat cutoff?"*\n` +
          `  - *"Aabot ba ako sa aking goal?"*`
        : `Here is how to save money effectively using **Geko**! 🎯💰\n\n` +
          `1. 🎯 **Set a Clear Savings Goal**\n` +
          `• Navigate to the **Plan** tab at the bottom navigation bar.\n` +
          `• Tap **+ Add Goal** and enter what you are saving for (e.g., *Emergency Fund*, *New Laptop*, *Travel*).\n` +
          `• Specify your target amount and target completion date.\n\n` +
          `2. 📅 **Follow the Payday Cut-Off Rule (15th & 30th)**\n` +
          `• Don't save what is left after spending—spend what is left after saving! Transfer your savings allocation as soon as your salary arrives.\n` +
          `• Geko automatically calculates the exact amount you need to lock in per cutoff to reach your goal on time.\n\n` +
          `3. 📊 **Apply the 50/30/20 Rule**\n` +
          `• **50% Needs**: Housing, utilities, groceries, transportation.\n` +
          `• **30% Wants**: Dining out, coffee, entertainment, shopping.\n` +
          `• **20% Savings**: Direct transfer into your high-yield savings and emergency fund.\n\n` +
          `4. 💬 **Ask Geko AI for Real-Time Budget Guidance**\n` +
          `• You can ask Geko anytime right here in chat:\n` +
          `  - *"Can I afford dinner tonight?"*\n` +
          `  - *"How much do I need to save each cutoff?"*\n` +
          `  - *"Show all my cards with money"*`;
    } else if (isAddCardTutorial) {
      fullResponse = isTagalog
        ? `Napakadaling magdagdag ng bagong card o account sa Geko! May **2 mabilis na paraan** para gawin ito: 💳✨\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `**Paraan 1: Diretso Dito sa Geko AI Chat (Pinakamabilis!)**\n` +
          `I-type o sabihin lang dito sa chat ang gusto mong card at balance:\n` +
          `• *"Add new card GoTyme 2500"*\n` +
          `• *"Create card MariBank 500"*\n` +
          `• *"Magdagdag ng card BPI 5000"*\n` +
          `• *"Gawa ng GCash account 1500"*\n\n` +
          `Awtomatikong irerehistro ni Geko ang iyong card, gagawan ng interactive 3D preview, at iu-update ang balance sa real time!\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `**Paraan 2: Sa Wallet Screen**\n` +
          `1. Pindutin ang **Wallet** tab sa ibaba ng screen.\n` +
          `2. Pindutin ang **+ Add Account** button sa itaas sa kanan.\n` +
          `3. **Pumili ng Preset**: Pumili mula sa 100+ Philippine presets (BPI, Maya, GCash, GoTyme, MariBank, BDO, Seabank, Landbank, atbp.) o mag-type ng sariling pangalan.\n` +
          `4. **Baguhin ang Kulay at Estilo**: Sa ilalim ng 3D card preview, pumili ng paborito mong color style tulad ng *Sapphire Ocean*, *Emerald*, o *Neon Magenta*.\n` +
          `5. **Ilagay ang Starting Balance**: I-type ang kasalukuyang pera sa card.\n` +
          `6. Pindutin ang **Connect Account**!`
        : `Adding a new card or account in Geko is fast and seamless! You have **2 easy options**: 💳✨\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `**Method 1: Direct in Geko AI Chat (Instant & Hands-Free)**\n` +
          `Simply type or speak to Geko right here in chat:\n` +
          `• *"Add new card GoTyme 2500"*\n` +
          `• *"Create card MariBank 500"*\n` +
          `• *"Add account BPI 10000"*\n` +
          `• *"Magdagdag ng GCash 1500"*\n\n` +
          `Geko AI will automatically register the card, create the interactive 3D card preview, and update your live balance immediately!\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `**Method 2: Via the Wallet Screen**\n` +
          `1. Tap the **Wallet** tab at the bottom navigation bar.\n` +
          `2. Tap the **+ Add Account** button at the top right.\n` +
          `3. **Select a Preset**: Choose from 100+ Philippine presets (BPI, GCash, Maya, GoTyme, MariBank, BDO, Seabank, Landbank, etc.) or enter a custom card name.\n` +
          `4. **Customize Color & Style**: Right beneath the interactive 3D preview, tap any style preset (*Sapphire Ocean*, *Emerald*, *Neon Magenta*, etc.) or choose custom gradient swatches.\n` +
          `5. **Set Starting Balance**: Enter the current account balance.\n` +
          `6. Tap **Connect Account** to finish!`;
    } else if (isGeneralAppTutorial) {
      fullResponse = isTagalog
        ? `Maligayang pagdating sa **Geko**! 🦎 Narito ang mabilisang gabay sa mga pangunahing feature ng app:\n\n` +
          `• 💳 **Wallet & Accounts**: Tingnan at i-customize ang iyong mga bangko at e-wallets gamit ang interactive 3D cards na may real-time balances.\n` +
          `• 📝 **Natural Chat Logging**: Sabihin lang kay Geko ang iyong mga gastusin (hal. *"Kumain 180 sa GCash"* o *"Sahod 25000"*) para maitala agad.\n` +
          `• 📸 **Receipt & Bill Scanner**: Pindutin ang center **+** button at piliin ang *"Scan Receipt / Bill to Auto-Fill"* para awtomatikong basahin ang mga resibo.\n` +
          `• 🎯 **Savings Goals & Cutoffs**: Sa **Plan** tab, magtakda ng mga layunin. Awtomatikong tutukuyin ni Geko kung magkano ang dapat itabi sa bawat 15th at 30th na sweldo.\n` +
          `• 🍽️ **Smart Affordability**: Tanungin si Geko *"Can I afford dinner tonight?"* bago gumastos para makasiguro sa budget.\n` +
          `• 🔒 **100% Offline & Private**: Lahat ng iyong datos ay mananatili lamang sa iyong cellphone.`
        : `Welcome to **Geko**! 🦎 Here is a quick overview of how to get the most out of the app:\n\n` +
          `• 💳 **Wallet & Accounts**: View and manage all your bank cards and e-wallets with interactive 3D cards and real-time balances.\n` +
          `• 📝 **Instant Chat Logging**: Tell Geko about your daily expenses (e.g. *"Spent 150 on food on GCash"*) and it will log them hands-free.\n` +
          `• 📸 **Receipt & Bill Scanner**: Tap the center **+** button and select *"Scan Receipt / Bill to Auto-Fill"* to extract totals from physical receipts.\n` +
          `• 🎯 **Savings Goals & Payday Cutoffs**: On the **Plan** tab, track savings goals with auto-calculated allocations for every 15th & 30th payday.\n` +
          `• 🍽️ **Real-Time Affordability**: Ask Geko *"Can I afford dinner tonight?"* to verify your safe spending buffer.\n` +
          `• 🔒 **100% Offline & Private**: Your financial data is securely stored locally on your device with zero cloud tracking.`;
    } else if (isInstallmentDeductAction) {
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
          status TEXT NOT NULL,
          imageUrl TEXT
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
          status TEXT NOT NULL,
          imageUrl TEXT
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

      const isEmptyQuery =
        lowerUserText.includes('walang laman') ||
        lowerUserText.includes('walang pera') ||
        lowerUserText.includes('empty card') ||
        lowerUserText.includes('empty cards') ||
        lowerUserText.includes('zero balance') ||
        lowerUserText.includes('0 balance') ||
        lowerUserText.includes('no balance') ||
        lowerUserText.includes('no money') ||
        lowerUserText.includes('empty') ||
        lowerUserText.includes('zero') ||
        (lowerUserText.includes('0') && (lowerUserText.includes('card') || lowerUserText.includes('balance') || lowerUserText.includes('laman')));

      const hasMoneyOnly = 
        !isEmptyQuery && (
          lowerUserText.includes('may laman') ||
          lowerUserText.includes('may pera') ||
          lowerUserText.includes('laman na pera') ||
          lowerUserText.includes('with money') ||
          lowerUserText.includes('has money') ||
          lowerUserText.includes('positive balance') ||
          lowerUserText.includes('cards with money') ||
          lowerUserText.includes('nonzero') ||
          !lowerUserText.includes('all') // Filter out 0 balance cards by default unless user explicitly asks for "all cards" or empty cards
        );

      let targetCards = cards;
      if (isEmptyQuery) {
        targetCards = cards.filter((c: any) => c.type === 'CREDIT_CARD' ? Number(c.outstandingBalance || 0) === 0 : Number(c.balance || 0) === 0);
      } else if (hasMoneyOnly) {
        targetCards = cards.filter((c: any) => c.type === 'CREDIT_CARD' ? Number(c.outstandingBalance || 0) > 0 : Number(c.balance || 0) > 0);
      }

      if (targetCards.length === 0) {
        if (isEmptyQuery) {
          fullResponse = isTagalog
            ? `Walang card o e-wallet na walang laman sa ngayon. Lahat ng iyong cards ay may laman na balance!`
            : `None of your cards or e-wallets are empty. All your cards currently have an active balance!`;
        } else if (hasMoneyOnly) {
          fullResponse = isTagalog
            ? `Wala pang cards o e-wallets na may laman na pera sa ngayon.`
            : `No cards or e-wallets currently have an active balance.`;
        } else {
          fullResponse = isTagalog
            ? `Wala pang na-record na cards o e-wallets.`
            : `No cards or e-wallets found.`;
        }
      } else {
        const cardLines = targetCards.map((c: any) => {
          if (c.type === 'CREDIT_CARD') {
            const debt = Number(c.outstandingBalance || 0);
            return `${c.bankName} (Credit Debt) = ₱${debt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else {
            const bal = Number(c.balance || 0);
            return `${c.bankName} = ₱${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        });

        if (isEmptyQuery) {
          fullResponse = isTagalog
            ? `Narito ang mga cards & e-wallets mo na walang laman (₱0.00 balance):\n\n` + cardLines.join('\n')
            : `Here are your empty cards & e-wallets (₱0.00 balance):\n\n` + cardLines.join('\n');
        } else if (hasMoneyOnly) {
          fullResponse = isTagalog
            ? `Narito ang mga cards & e-wallets mo na may laman na pera:\n\n` + cardLines.join('\n')
            : `Here are your cards & e-wallets with an active balance:\n\n` + cardLines.join('\n');
        } else {
          fullResponse = isTagalog
            ? `Narito ang kasalukuyang balance ng iyong mga cards & e-wallets:\n\n` + cardLines.join('\n')
            : `Here are all your current card & wallet balances:\n\n` + cardLines.join('\n');
        }
      }
    } else if (isAffordabilityQuery) {
      // ── Real-Time Affordability Engine (e.g. "Can I afford dinner tonight?") ──
      const cardsRes = await db.execute('SELECT bankName, balance, type, outstandingBalance, availableCredit FROM cards');
      const allCards = (cardsRes.rows?._array || []) as any[];

      const totalLiquid = allCards
        .filter((c: any) => c.type !== 'CREDIT_CARD')
        .reduce((acc: number, c: any) => acc + Number(c.balance || 0), 0);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayTotalRes = await db.execute(
        `SELECT SUM(amount) as grandTotal 
         FROM transactions 
         WHERE (type = "expense" OR type = "credit_purchase") 
           AND CAST(date AS INTEGER) >= ?`,
        [startOfToday]
      );
      const todaySpent = Number(todayTotalRes.rows?._array[0]?.grandTotal || 0);

      const amtMatch = lowerUserText.match(/\d+(?:\.\d+)?/);
      const isDinner = lowerUserText.includes('dinner') || lowerUserText.includes('hapunan');
      const isLunch = lowerUserText.includes('lunch') || lowerUserText.includes('tanghalian');
      const mealType = isDinner ? 'dinner' : isLunch ? 'lunch' : (isTagalog ? 'gastos' : 'expense');

      const estimatedCost = amtMatch ? parseFloat(amtMatch[0]) : (isDinner || isLunch ? 250 : 300);
      const safeBuffer = totalLiquid - estimatedCost;

      if (totalLiquid === 0) {
        fullResponse = isTagalog
          ? `Medyo gipit tayo ngayon! ⚠️\n\n` +
            `• **Kasalukuyang Balance:** ${symbol}0.00 sa lahat ng iyong registered cards at wallets.\n` +
            `• **Nagastos mo ngayong araw:** ${symbol}${todaySpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
            `Wala pang laman ang iyong registered accounts. Mas mabuting mag-ingat muna o magluto sa bahay hanggang sa susunod na sahod!`
          : `You might want to hold off! ⚠️\n\n` +
            `• **Available Balance:** ${symbol}0.00 across your registered accounts.\n` +
            `• **Today's Spending:** ${symbol}${todaySpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
            `Your recorded liquid funds are currently ${symbol}0.00. I recommend sticking to home-cooked meals until your next salary cutoff!`;
      } else if (totalLiquid >= estimatedCost) {
        const recoMin = Math.min(totalLiquid, Math.max(120, Math.round(estimatedCost * 0.7)));
        const recoMax = Math.min(totalLiquid, Math.round(estimatedCost * 1.1));

        fullResponse = isTagalog
          ? `Oo naman! Kayang-kaya mo mag-${mealType} ngayong gabi! 🍽️✨\n\n` +
            `💰 **Kasalukuyang Pera:** **${symbol}${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}** sa iyong registered accounts.\n` +
            `📊 **Nagastos Mo Ngayong Araw:** **${symbol}${todaySpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}**.\n\n` +
            `💡 **Geko Budget Guide:**\n` +
            `• Maglaan ng humigit-kumulang **${symbol}${recoMin} – ${symbol}${recoMax}** para sa iyong ${mealType}.\n` +
            `• May matitira ka pang safe buffer na humigit-kumulang **${symbol}${Math.max(0, safeBuffer).toLocaleString('en-US', { minimumFractionDigits: 2 })}** para sa mga susunod na araw hanggang sa susunod na payday.`
          : `Yes! You can definitely afford ${mealType} tonight! 🍽️✨\n\n` +
            `💰 **Available Funds:** **${symbol}${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}** across your active accounts.\n` +
            `📊 **Spent Today:** **${symbol}${todaySpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}**.\n\n` +
            `💡 **Geko Spending Recommendation:**\n` +
            `• Target a meal budget between **${symbol}${recoMin} – ${symbol}${recoMax}**.\n` +
            `• This leaves you with a comfortable safety cushion of **~${symbol}${Math.max(0, safeBuffer).toLocaleString('en-US', { minimumFractionDigits: 2 })}** for the rest of the week until your next payday.\n\n` +
            `Enjoy your meal! 🦎`;
      } else {
        fullResponse = isTagalog
          ? `Medyo alanganin ang budget para sa ${mealType} na ${symbol}${estimatedCost.toFixed(2)}. ⚠️\n\n` +
            `• **Available Funds:** ${symbol}${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
            `• **Kulang:** ${symbol}${(estimatedCost - totalLiquid).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
            `Mas ligtas na pumili ng budget option (around ${symbol}${Math.min(totalLiquid, 100).toFixed(2)}) para hindi maubos ang laman ng iyong wallet bago mag-payday!`
          : `Your budget is a bit tight for a ${symbol}${estimatedCost.toFixed(2)} ${mealType}. ⚠️\n\n` +
            `• **Available Funds:** ${symbol}${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
            `• **Shortfall:** ${symbol}${(estimatedCost - totalLiquid).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
            `Consider a budget-friendly option under ${symbol}${Math.min(totalLiquid, 120).toFixed(2)} to protect your emergency cash flow!`;
      }
    } else if (isGreetingQuery) {
      fullResponse = isTagalog
        ? `Kumusta! 🦎 Ako si **Geko**, ang iyong personal financial companion.\n\n` +
          `Narito ang mga pwede mong itanong o ipagawa sa akin:\n` +
          `• 📝 **Mag-log ng Gastos o Sahod:** Sabihin lang *"Kumain ako 180 sa GCash"* o *"Sahod 25000"*\n` +
          `• 💳 **Tingnan ang Balance:** *"Magkano balance ng Maya ko?"* o *"Lahat ng cards na may laman"*\n` +
          `• 🍽️ **Budget & Affordability:** *"Can I afford dinner tonight?"*\n` +
          `• 📅 **Cut-off & Payday:** *"Kailan ang susunod na cutoff?"* o *"Set cutoff income 20000"*\n` +
          `• 🎯 **Savings Goals:** *"Aabot ba ako sa aking goal?"*`
        : `Hey there! 🦎 I'm **Geko**, your offline-first smart finance assistant.\n\n` +
          `Here are some things you can ask me anytime:\n` +
          `• 📝 **Quick Logging:** *"Spent 150 for lunch on GCash"* or *"Received 1000 from client"*\n` +
          `• 💳 **Check Balances:** *"What is my GCash balance?"* or *"Show all cards with money"*\n` +
          `• 🍽️ **Affordability Advice:** *"Can I afford dinner tonight?"*\n` +
          `• 📅 **Payday Schedules:** *"When is my next salary cutoff?"*\n` +
          `• 🎯 **Goal Feasibility:** *"Can I reach my savings goal by December?"*`;
    } else if (isSummaryOrAdviceQuery) {
      const cardsRes = await db.execute('SELECT bankName, balance, type, outstandingBalance, availableCredit FROM cards');
      const allCards = (cardsRes.rows?._array || []) as any[];
      const totalLiquid = allCards.filter((c: any) => c.type !== 'CREDIT_CARD').reduce((acc: number, c: any) => acc + Number(c.balance || 0), 0);
      const creditDebt = allCards.filter((c: any) => c.type === 'CREDIT_CARD').reduce((acc: number, c: any) => acc + Number(c.outstandingBalance || 0), 0);
      const netWorth = totalLiquid - creditDebt;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayTotalRes = await db.execute(
        `SELECT SUM(amount) as grandTotal FROM transactions WHERE (type = "expense" OR type = "credit_purchase") AND CAST(date AS INTEGER) >= ?`,
        [startOfToday]
      );
      const todaySpent = Number(todayTotalRes.rows?._array[0]?.grandTotal || 0);

      fullResponse = isTagalog
        ? `Narito ang iyong kasalukuyang financial health summary:\n\n` +
          `• 💰 **Total Liquid Cash:** ${symbol}${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• 💳 **Total Credit Card Debt:** ${symbol}${creditDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• 📈 **Estimated Net Worth:** ${symbol}${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• 📉 **Gastos Ngayong Araw:** ${symbol}${todaySpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
          (totalLiquid > 1000 ? `Maayos ang iyong cash buffer! Panatilihin ang pag-track ng mga maliliit na gastos.` : `Medyo mababa ang cash buffer. Magandang mag-ingat sa mga non-essential na gastusin.`)
        : `Here is your current real-time financial health summary:\n\n` +
          `• 💰 **Total Liquid Cash:** ${symbol}${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• 💳 **Total Credit Card Debt:** ${symbol}${creditDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• 📈 **Estimated Net Worth:** ${symbol}${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• 📉 **Spent Today:** ${symbol}${todaySpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
          (totalLiquid > 1000 ? `Your liquid reserves are in solid shape! Keep logging your daily expenses to stay on track.` : `Keep non-essential spending minimal until your next salary cutoff to rebuild your buffer!`);
    } else {
      // ── Dynamic Specific Card/Bank Balance Lookup ──
      const cardsRes = await db.execute('SELECT bankName, balance, type, outstandingBalance, availableCredit FROM cards');
      const allCards = (cardsRes.rows?._array || []) as any[];
      const matchedCards = allCards.filter((c: any) => {
        const name = (c.bankName || '').toLowerCase().trim();
        if (!name) return false;

        // Distinguish GCash vs Cash (physical on-hand money)
        if (name === 'cash') {
          if (lowerUserText.includes('gcash')) {
            return false;
          }
          return /\bcash\b/i.test(lowerUserText) || lowerUserText.includes('on hand') || lowerUserText.includes('onhand') || lowerUserText.includes('bulsa');
        }

        if (name === 'gcash' || name === 'gcash e-wallet' || name === 'gcash ewallet' || name === 'gcash wallet') {
          return lowerUserText.includes('gcash') || lowerUserText.includes('g-cash') || lowerUserText.includes('g cash');
        }

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
    const cardsRes = await db.execute('SELECT bankName, balance, type, outstandingBalance FROM cards');
    const allCards = (cardsRes.rows?._array || []) as any[];
    const totalLiquid = allCards.filter((c: any) => c.type !== 'CREDIT_CARD').reduce((acc: number, c: any) => acc + Number(c.balance || 0), 0);
    
    fullResponse = isTagalog
      ? `May kabuuang **${symbol}${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}** ka sa iyong mga registered accounts. Paano kita matutulungan? Pwede mong sabihing:\n\n• *"Gumastos ako ng 200 sa pagkain"*\n• *"Can I afford dinner tonight?"*\n• *"Magkano balance ng aking cards?"*\n• *"Kailan ang susunod na cutoff?"*`
      : `You currently have **${symbol}${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}** in available funds across your registered accounts. Here are some things you can ask me:\n\n• *"Spent 150 on food on GCash"*\n• *"Can I afford dinner tonight?"*\n• *"Show all my card balances"*\n• *"When is my salary cutoff?"*`;
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
