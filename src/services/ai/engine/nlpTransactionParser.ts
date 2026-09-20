export interface ParsedTransaction {
  amount: number;
  type: 'expense' | 'income' | 'transfer' | 'credit_purchase' | 'credit_payment';
  categoryId: string;
  note: string;
  bankName?: string;
  sourceBank?: string;
  destinationBank?: string;
}

const INCOME_KEYWORDS = [
  'sweldo',
  'sahod',
  'kita',
  'kumita',
  'bonus',
  'padala',
  'allowance',
  'income',
  'salary',
  'receive',
  'received',
  'got paid',
];

const BANK_KEYWORDS: Record<string, string[]> = {
  GCash: ['gcash', 'g-cash', 'g cash'],
  GoTyme: ['gotyme', 'go tyme', 'tyme'],
  BPI: ['bpi'],
  Maya: ['maya', 'paymaya', 'pay maya'],
  Landbank: ['landbank', 'land bank'],
  PNB: ['pnb'],
  BDO: ['bdo'],
  MariBank: ['maribank', 'mari bank'],
  Metrobank: ['metrobank', 'metro bank'],
  UnionBank: ['unionbank', 'union bank', 'ub'],
  Visa: ['visa', 'visa credit', 'credit card', 'creditcard', 'cc'],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    'ulam',
    'kain',
    'kumain',
    'pagkain',
    'lunch',
    'dinner',
    'breakfast',
    'almusal',
    'tanghalian',
    'hapunan',
    'merienda',
    'snack',
    'kape',
    'coffee',
    'coffe',
    'coffie',
    'kopi',
    'milktea',
    'starbucks',
    'cafe',
    'espresso',
    'latte',
    'cappuccino',
    'restaurant',
    'resto',
    'jollibee',
    'mcdo',
    'fastfood',
    'food',
    'grocery',
    'groceries',
    'tinapay',
    'tubig',
    'pizza',
    'burger',
  ],
  Transport: [
    'pamasahe',
    'fare',
    'jeep',
    'bus',
    'mrt',
    'lrt',
    'angkas',
    'grab',
    'moveit',
    'joyride',
    'taxi',
    'gas',
    'gasolina',
    'toll',
    'tricycle',
    'trike',
    'uber',
  ],
  Housing: [
    'kuryente',
    'meralco',
    'tubig',
    'maynilad',
    'rent',
    'upa',
    'wifi',
    'internet',
    'pldt',
    'converge',
    'globe',
    'smart',
    'load',
    'utilities',
    'bill',
    'bills',
  ],
  Shopping: [
    'shopee',
    'lazada',
    'tiktok shop',
    'damit',
    'shoes',
    'sapatos',
    'tshirt',
    't-shirt',
    'shirt',
    'mall',
    'bili',
    'bumili',
    'shopping',
    'clothes',
  ],
  Salary: [
    'sweldo',
    'sahod',
    'salary',
    'income',
    'payroll',
  ],
  Adjustment: [
    'nawala',
    'nawalan',
    'nahulog',
    'nanakaw',
    'kinaltas',
    'kulang',
    'lost',
    'missing',
    'stolen',
    'dropped',
    'misplaced',
    'discrepancy',
    'adjustment',
    'scam',
    'scammed',
  ],
};

const FILLER_WORDS = [
  'bumili',
  'bili',
  'nagbayad',
  'bayad',
  'ako',
  'kami',
  'tayo',
  'siya',
  'ko',
  'namin',
  'ng',
  'nang',
  'sa',
  'mga',
  'para',
  'at',
  'saka',
  'tapos',
  'then',
  'and',
  'for',
  'on',
  'pesos',
  'peso',
  'php',
  'dollars',
  'dollar',
  'spent',
  'spend',
  'pay',
  'paid',
  'add',
  'deduct',
  'using',
  'via',
  'thru',
  'through',
  'gamit',
  'gamitan',
  'pambili',
  'pambayad',
  'pang',
  'nito',
  'ito',
  'dito',
  'mula',
  'galing',
  'nawala',
  'nawalan',
  'yung',
  'ang',
  'lost',
  'missing',
  'stolen',
  'nanakaw',
  'nahulog',
  'hulog',
  'gcash',
  'bpi',
  'gotyme',
  'maya',
  'landbank',
  'bdo',
  'pnb',
  'maribank',
  'metrobank',
  'unionbank',
  'visa',
];

export const normalizeAmount = (text: string): number => {
  // Support 2k, 2.5k, 2K, 2,000, 2000
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000;
  }
  const cleanStr = text.replace(/,/g, '');
  const numMatch = cleanStr.match(/(\d+(?:\.\d+)?)/);
  return numMatch ? parseFloat(numMatch[1]) : 0;
};

export const detectBank = (text: string): string | undefined => {
  const lower = text.toLowerCase();
  for (const [bank, keywords] of Object.entries(BANK_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return bank;
    }
  }
  return undefined;
};

const detectCategory = (text: string, isIncome: boolean): string => {
  if (isIncome) return 'Salary';
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return 'Food';
};

const cleanNote = (rawText: string): string => {
  const lower = rawText.toLowerCase();
  const isLost = ['nawala', 'nawalan', 'lost', 'missing', 'stolen', 'nanakaw', 'nahulog'].some(w => lower.includes(w));

  let words = lower.split(/\s+/);
  words = words.filter((w) => !FILLER_WORDS.includes(w) && !/^\d+$/.test(w) && !/^\d+k$/i.test(w));
  let result = words.join(' ').trim();

  // Normalize coffee typos
  if (result === 'coffe' || result === 'coffie' || result === 'kape' || result === 'coffee') {
    result = 'Coffee';
  }

  if (isLost) {
    return result.length > 0 && result.toLowerCase() !== 'lost money' ? `Lost Money - ${result}` : 'Lost Money';
  }

  if (!result) {
    return rawText.trim();
  }

  // Capitalize title case nicely
  return result
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export const parseTransactionsFromText = (input: string): ParsedTransaction[] => {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const lowerInput = trimmed.toLowerCase();

  // 1. Check for TRANSFER intent (e.g., "nagtransfer ako 2000 from Maya to Maribank" or "transfer 2k Maya to Maribank")
  if (lowerInput.includes('transfer') || lowerInput.includes('nagtransfer') || lowerInput.includes('lipat')) {
    const amount = normalizeAmount(trimmed);
    if (amount > 0) {
      let sourceBank = 'Maya';
      let destinationBank = 'MariBank';

      const fromToMatch = trimmed.match(/(?:from|galing|sa)\s+([a-zA-Z]+)\s+(?:to|papunta|sa)\s+([a-zA-Z]+)/i);
      if (fromToMatch) {
        sourceBank = detectBank(fromToMatch[1]) || sourceBank;
        destinationBank = detectBank(fromToMatch[2]) || destinationBank;
      } else {
        const banksFound: string[] = [];
        for (const [bank, keywords] of Object.entries(BANK_KEYWORDS)) {
          if (keywords.some((kw) => lowerInput.includes(kw))) {
            banksFound.push(bank);
          }
        }
        if (banksFound.length >= 2) {
          sourceBank = banksFound[0];
          destinationBank = banksFound[1];
        }
      }

      return [
        {
          amount,
          type: 'transfer',
          categoryId: 'Housing',
          note: `Transfer from ${sourceBank} to ${destinationBank}`,
          sourceBank,
          destinationBank,
        },
      ];
    }
  }

  // 2. Check for CREDIT CARD PAYMENT intent (e.g., "nagbayad ako ng Visa 5000 gamit GCash" or "pay 5k Visa from GCash")
  if (
    (lowerInput.includes('nagbayad') || lowerInput.includes('pay') || lowerInput.includes('paid')) &&
    (lowerInput.includes('visa') || lowerInput.includes('credit card') || lowerInput.includes('cc')) &&
    !lowerInput.includes('bumili')
  ) {
    const amount = normalizeAmount(trimmed);
    if (amount > 0) {
      let sourceBank = 'GCash';
      const sourceMatch = trimmed.match(/(?:gamit|using|via|from|thru)\s+([a-zA-Z]+)/i);
      if (sourceMatch) {
        sourceBank = detectBank(sourceMatch[1]) || sourceBank;
      }

      return [
        {
          amount,
          type: 'credit_payment',
          categoryId: 'Housing',
          note: 'Visa Credit Card Payment',
          bankName: 'Visa',
          sourceBank,
          destinationBank: 'Visa',
        },
      ];
    }
  }

  // 3. Multi-transaction or standard expense / income / credit purchase parsing
  const results: ParsedTransaction[] = [];
  const defaultBank = detectBank(trimmed);

  // Split by explicit connectors (comma, 'at', 'and', 'tapos', 'saka', '&', newline)
  const segments = trimmed
    .split(/(?:,|\bat\b|\band\b|\btapos\b|\bsaka\b|&|\n)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const segmentBank = detectBank(segment) || defaultBank || 'GCash';
    const amount = normalizeAmount(segment);

    if (amount > 0) {
      const isIncome = INCOME_KEYWORDS.some((kw) => segment.toLowerCase().includes(kw));
      const categoryId = detectCategory(segment, isIncome);
      const note = cleanNote(segment) || (isIncome ? 'Salary / Income' : 'Expense');
      const isCredit = segmentBank.toLowerCase() === 'visa';

      results.push({
        amount,
        type: isIncome ? 'income' : isCredit ? 'credit_purchase' : 'expense',
        categoryId,
        note,
        bankName: segmentBank,
      });
    }
  }

  return results;
};
