import { useAIStore } from '../../../store/aiStore';
import { getDb } from '../../../database/sqlite';
import { generateEmbedding } from './embeddingService';
import { DeviceEventEmitter } from 'react-native';
import { uuidv4 } from '../../../utils/uuid';

let isModelLoaded = false;

// NLP Regex for capturing "buy/bought/spent X on Y"
const TRANSACTION_REGEX = /(?:buy|bought|spent|pay|paid)(?:\s+a|\s+for)?\s+([A-Za-z\s]+)\s+(?:for\s+)?(?:around\s+)?(\d+(?:\.\d+)?)\s*(?:pesos|php|dollars|\$)?/i;
const REVERSE_TRANSACTION_REGEX = /(?:buy|bought|spent|pay|paid)(?:\s+a|\s+for)?\s+(\d+(?:\.\d+)?)\s*(?:pesos|php|dollars|\$)?\s+(?:on|for)\s+([A-Za-z\s]+)/i;

const MOCK_RESPONSES = [
  "Based on your recent spending, your grocery budget is looking good, but you're tracking 15% higher on dining out compared to last month. I recommend pausing on restaurants for the next two weeks to hit your $500 monthly savings goal.",
  "Looking at your transaction history, you can absolutely afford dinner tonight! You currently have a $120 surplus in your 'Entertainment & Dining' envelope. Go ahead and treat yourself.",
  "I've analyzed your monthly cash flow. Your fixed expenses (rent, utilities, insurance) make up 45% of your income, which is an excellent ratio. If you want to optimize further, consider moving $300 of your surplus into a high-yield savings account or your 'Car Downpayment' goal.",
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

  // 1. NLP Intent Parsing for Transactions (Robust Fallback)
  let amount = 0;
  let note = '';
  
  // Look for any number in the user input
  const numberMatch = lowerUserText.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    amount = parseFloat(numberMatch[1]);
    
    // Remove the number and currency words from the note
    note = lowerUserText
      .replace(numberMatch[0], '')
      .replace(/(pesos|php|dollars|\$|add|buy|bought|spent|spend|pay|paid|for|on|sa|income|salary|sweldo|kumita|receive|got)/gi, '')
      .trim();
      
    // If note is empty after stripping, just use 'miscellaneous'
    if (!note || note.length === 0) {
      note = 'miscellaneous';
    }
  }

  if (amount > 0 && note) {
    try {
      const db = getDb();
      const newId = uuidv4();
      const date = new Date().toISOString();
      
      // Determine if it's an income or expense
      const incomeKeywords = ['income', 'sweldo', 'kumita', 'salary', 'receive', 'bonus', 'got'];
      const isIncome = incomeKeywords.some(kw => lowerUserText.includes(kw));
      const type = isIncome ? 'income' : 'expense';
      
      // Attempt to guess category based on note string (heuristic)
      let categoryId = isIncome ? 'Salary' : 'Miscellaneous';
      if (!isIncome) {
        if (note.includes('pizza') || note.includes('food') || note.includes('dinner')) categoryId = 'Food';
        if (note.includes('gas') || note.includes('uber') || note.includes('bus')) categoryId = 'Transport';
      }

      // Insert transaction
      await db.execute(
        'INSERT INTO transactions (id, amount, date, categoryId, type, note) VALUES (?, ?, ?, ?, ?, ?)',
        [newId, amount, date, categoryId, type, note]
      );

      // Get rowid
      const res = await db.execute('SELECT last_insert_rowid() as id');
      const rowId = res.rows?._array[0]?.id || 0;

      // Generate embedding and insert into vector store
      const embedding = await generateEmbedding(`${note} ${categoryId} ${type} ${amount}`);
      await db.execute(
        'INSERT INTO vec_transactions (rowid, embedding) VALUES (?, ?)',
        [rowId, embedding]
      );

      fullResponse = `Got it! I've automatically logged an ${type} of $${amount} for "${note}" under the ${categoryId} category.`;
      
      // Notify UI to refresh
      DeviceEventEmitter.emit('transactions_updated');
    } catch (err) {
      console.error('Failed to log transaction via AI:', err);
      fullResponse = `I understood you spent $${amount} on ${note}, but I encountered a database error while trying to save it.`;
    }
  } 
  // 2. Standard Responses (if not a transaction logging intent)
  else if (lowerPrompt.includes("grocery") || lowerPrompt.includes("food")) {
    fullResponse = MOCK_RESPONSES[0];
  } else if (lowerPrompt.includes("dinner") || lowerPrompt.includes("afford")) {
    fullResponse = MOCK_RESPONSES[1];
  } else if (lowerPrompt.includes("export") || lowerPrompt.includes("summary")) {
    fullResponse = "Sure, I can export your monthly summary. However, I've noticed a recurring subscription of $14.99 that you haven't used in 3 months. Should we look into cancelling it to save $180 a year?";
  } else {
    // Random selection for generic queries
    fullResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  }

  // Simulate streaming token by token
  const tokens = fullResponse.split(/(?<=\s)/); // Split keeping whitespace
  
  for (const token of tokens) {
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50)); // 30-80ms per token
    onToken(token);
  }

  // Update metrics
  useAIStore.getState().updateMetrics(
    0, // Cloud doesn't use local RAM
    1000 / 55 // Simulated tokens per second
  );

  return fullResponse;
};

export const unloadModel = async () => {
  isModelLoaded = false;
  useAIStore.getState().setStatus(false, null);
};
