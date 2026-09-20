import { useAIStore } from '../../../store/aiStore';
import { getDb } from '../../../database/sqlite';
import { generateEmbedding } from './embeddingService';
import { DeviceEventEmitter } from 'react-native';
import { uuidv4 } from '../../../utils/uuid';
import { parseTransactionsFromText } from './nlpTransactionParser';
import { getCurrency } from '../../../store/userStore';

let isModelLoaded = false;

const MOCK_RESPONSES = [
  "Based on your recent spending, your grocery budget is looking good, but you're tracking 15% higher on dining out compared to last month. I recommend pausing on restaurants for the next two weeks to hit your monthly savings goal.",
  "Looking at your transaction history, you can afford this expense! You have a healthy surplus in your budget. Go ahead and proceed.",
  "I've analyzed your monthly cash flow. Your fixed expenses make up 45% of your income, which is an excellent ratio. Keep up the good budgeting habits!",
];

export const loadModel = async (modelPath: string) => {
  // Simulate load time
  await new Promise(resolve => setTimeout(resolve, 800));
  isModelLoaded = true;
  useAIStore.getState().setStatus(true, "geko-ai-v2 (Local Hybrid)");
  console.log('Mock Model loaded successfully');
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
  const lowerPrompt = prompt.toLowerCase();
  let fullResponse = "";

  const currency = getCurrency();
  const symbol = currency === 'PHP' ? '₱' : '$';

  // 1. NLP Intent Parsing for Tagalog / English Transactions (Single & Compound)
  const parsed = parseTransactionsFromText(userText);

  if (parsed.length > 0) {
    try {
      const db = getDb();
      const savedItems: { note: string; amount: number; categoryId: string; type: string; bankName?: string }[] = [];

      for (const item of parsed) {
        const newId = uuidv4();
        const date = Date.now();
        const bankName = item.bankName || 'GCash';

        await db.execute(
          'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [newId, item.amount, date, item.categoryId, item.type, item.note, bankName]
        );

        // Deduct / Add to targeted bank card balance
        try {
          if (item.type === 'expense') {
            await db.execute(
              'UPDATE cards SET balance = balance - ? WHERE LOWER(bankName) = LOWER(?)',
              [item.amount, bankName]
            );
          } else {
            await db.execute(
              'UPDATE cards SET balance = balance + ? WHERE LOWER(bankName) = LOWER(?)',
              [item.amount, bankName]
            );
          }
        } catch (cardErr) {
          console.warn('Failed to update card balance', cardErr);
        }

        // Vector indexing
        try {
          const res = await db.execute('SELECT last_insert_rowid() as id');
          const rowId = res.rows?._array[0]?.id || 0;
          const embedding = await generateEmbedding(`${item.note} ${item.categoryId} ${bankName} ${item.type} ${item.amount}`);
          await db.execute(
            'INSERT INTO vec_transactions (rowid, embedding) VALUES (?, ?)',
            [rowId, embedding]
          );
        } catch (e) {
          console.warn('Vector indexing warning:', e);
        }

        savedItems.push({ ...item, bankName });
      }

      DeviceEventEmitter.emit('transactions_updated');

      // Check if user input contains Filipino / Tagalog words
      const isTagalog = /(?:bumili|bili|kain|kumain|ulam|ng|sa|kami|ako|namin|tayo|sahod|sweldo|gastos|bayad|merienda|pamasahe|tsaka|saka|tapos)/i.test(userText);

      const totalDeducted = savedItems
        .filter(i => i.type === 'expense')
        .reduce((sum, i) => sum + i.amount, 0);

      if (isTagalog) {
        if (savedItems.length === 1) {
          const single = savedItems[0];
          const targetBank = single.bankName || 'GCash';
          if (single.type === 'expense') {
            fullResponse = `Sige! Na-record ko na ang ${single.note} worth ${symbol}${single.amount.toFixed(2)} (${single.categoryId}). Nabawas na ito sa ${targetBank} card mo! (-${symbol}${single.amount.toFixed(2)})`;
          } else {
            fullResponse = `Ayos! Na-record ko na ang natanggap mong ${single.note} worth +${symbol}${single.amount.toFixed(2)} (${single.categoryId}). Nadagdag na ito sa ${targetBank} card mo!`;
          }
        } else {
          const listStr = savedItems
            .map(i => `• ${i.note}: ${i.type === 'expense' ? '-' : '+'}${symbol}${i.amount.toFixed(2)} (${i.categoryId}) [${i.bankName || 'GCash'}]`)
            .join('\n');
          fullResponse = `Sige! Na-record ko na ang ${savedItems.length} transactions:\n${listStr}\n\nKabuuang nabawas sa GEKO cards mo: -${symbol}${totalDeducted.toFixed(2)}!`;
        }
      } else {
        if (savedItems.length === 1) {
          const single = savedItems[0];
          const targetBank = single.bankName || 'GCash';
          fullResponse = `Got it! I've logged ${single.type === 'expense' ? 'an expense' : 'income'} of ${symbol}${single.amount.toFixed(2)} for "${single.note}" under ${single.categoryId}. Deducted from your ${targetBank} card.`;
        } else {
          const listStr = savedItems
            .map(i => `• ${i.note}: ${i.type === 'expense' ? '-' : '+'}${symbol}${i.amount.toFixed(2)} (${i.categoryId}) [${i.bankName || 'GCash'}]`)
            .join('\n');
          fullResponse = `Got it! I've logged ${savedItems.length} transactions:\n${listStr}\n\nTotal deducted: -${symbol}${totalDeducted.toFixed(2)} across your Geko cards.`;
        }
      }
    } catch (err) {
      console.error('Failed to log transactions via AI:', err);
      fullResponse = `Error processing transaction. Please try again.`;
    }
  } else if (lowerPrompt.includes("grocery") || lowerPrompt.includes("food")) {
    fullResponse = MOCK_RESPONSES[0];
  } else if (lowerPrompt.includes("dinner") || lowerPrompt.includes("afford")) {
    fullResponse = MOCK_RESPONSES[1];
  } else if (lowerPrompt.includes("export") || lowerPrompt.includes("summary")) {
    fullResponse = "Sure, I can export your monthly summary. I've noticed you are managing your budget very well this month. Would you like to review your active installment plans or savings goals?";
  } else {
    fullResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  }

  // Simulate streaming token by token
  const tokens = fullResponse.split(/(?<=\s)/);
  
  for (const token of tokens) {
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 35));
    onToken(token);
  }

  useAIStore.getState().updateMetrics(
    0,
    1000 / 55
  );

  return fullResponse;
};

export const unloadModel = async () => {
  isModelLoaded = false;
  useAIStore.getState().setStatus(false, undefined);
};
