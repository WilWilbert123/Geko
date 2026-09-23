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
  'add',
  'added',
  'adding',
  'dagdag',
  'dagdagan',
  'dadagdagan',
  'nadagdagan',
  'magdagdag',
  'padagdag',
  'lagay',
  'lagyan',
  'maglagay',
  'palagyan',
  'palagay',
  'karga',
  'kargahan',
  'ipasok',
  'pasok',
  'pumasok',
  'deposit',
  'deposited',
  'cash in',
  'cashin',
  'cash-in',
  'top up',
  'topup',
  'top-up',
  'load',
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
  'plus',
];

const BANK_KEYWORDS: Record<string, string[]> = {
  GCash: ['gcash', 'g-cash', 'g cash', 'gcash credit'],
  GoTyme: ['gotyme', 'go tyme', 'go-tyme', 'gotime', 'go time', 'tyme', 'gotyme bank', 'go-time'],
  BPI: ['bpi', 'bpi bank', 'bpi savings'],
  Maya: ['maya', 'paymaya', 'pay maya', 'pay-maya'],
  Landbank: ['landbank', 'land bank', 'land-bank'],
  PNB: ['pnb', 'pnb bank'],
  BDO: ['bdo', 'bdo bank'],
  MariBank: ['maribank', 'mari bank', 'mari-bank', 'seabank', 'sea bank'],
  Metrobank: ['metrobank', 'metro bank', 'metro-bank'],
  UnionBank: ['unionbank', 'union bank', 'union-bank', 'ub'],
  Visa: ['visa', 'visa credit', 'credit card', 'creditcard', 'cc'],
  Cash: ['physical cash', 'geko cash', 'pera sa bulsa', 'papel', 'bulsa', 'cash money', 'kwarta'],
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
    'deposit',
    'cashin',
    'dagdag',
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
  'to',
  'into',
  'in',
  'at',
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
  'added',
  'dagdag',
  'dagdagan',
  'dadagdagan',
  'nadagdagan',
  'magdagdag',
  'padagdag',
  'lagay',
  'lagyan',
  'maglagay',
  'palagyan',
  'laman',
  'mo',
  'deposit',
  'cashin',
  'cash-in',
  'topup',
  'top-up',
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
  
  // 1. Check exact word boundaries for specific banks first
  if (/\bgcash\b/i.test(lower) || /\bg-cash\b/i.test(lower) || /\bg cash\b/i.test(lower)) {
    return 'GCash';
  }
  if (/\bgotyme\b/i.test(lower) || /\bgo-tyme\b/i.test(lower) || /\bgo tyme\b/i.test(lower)) {
    return 'GoTyme';
  }
  if (/\bmaribank\b/i.test(lower) || /\bmari-bank\b/i.test(lower) || /\bmari bank\b/i.test(lower) || /\bseabank\b/i.test(lower)) {
    return 'MariBank';
  }
  if (/\bmetrobank\b/i.test(lower) || /\bmetro-bank\b/i.test(lower) || /\bmetro bank\b/i.test(lower)) {
    return 'Metrobank';
  }
  if (/\bunionbank\b/i.test(lower) || /\bunion-bank\b/i.test(lower) || /\bunion bank\b/i.test(lower)) {
    return 'UnionBank';
  }
  if (/\blandbank\b/i.test(lower) || /\bland-bank\b/i.test(lower) || /\bland bank\b/i.test(lower)) {
    return 'Landbank';
  }
  if (/\bpnb\b/i.test(lower)) return 'PNB';
  if (/\bbdo\b/i.test(lower)) return 'BDO';
  if (/\bbpi\b/i.test(lower)) return 'BPI';
  if (/\bmaya\b/i.test(lower) || /\bpaymaya\b/i.test(lower)) return 'Maya';
  if (/\bvisa\b/i.test(lower)) return 'Visa';
  
  // Standalone 'cash' word check (must NOT match 'gcash')
  if (/\bcash\b/i.test(lower) && !lower.includes('gcash')) {
    return 'Cash';
  }

  for (const [bank, keywords] of Object.entries(BANK_KEYWORDS)) {
    for (const kw of keywords) {
      const kwCleaned = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleaned = lower.replace(/[^a-z0-9]/g, '');
      if (lower.includes(kw.toLowerCase()) || (kwCleaned.length >= 3 && cleaned.includes(kwCleaned))) {
        return bank;
      }
    }
  }
  return undefined;
};

const detectCategory = (text: string, isIncome: boolean): string => {
  if (isIncome) return 'Cash In';
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return 'Food';
};

const PREPOSITIONS = ['to', 'into', 'in', 'sa', 'papunta', 'dito', 'para', 'for', 'on', 'at', 'with', 'from', 'by'];

const cleanNote = (rawText: string, isIncome: boolean = false): string => {
  const lower = rawText.toLowerCase();
  const isLost = ['nawala', 'nawalan', 'lost', 'missing', 'stolen', 'nanakaw', 'nahulog'].some(w => lower.includes(w));

  let words = lower.split(/\s+/);
  words = words.filter((w) => !FILLER_WORDS.includes(w) && !PREPOSITIONS.includes(w) && !/^\d+$/.test(w) && !/^\d+k$/i.test(w));
  let result = words.join(' ').trim();

  // Normalize coffee typos
  if (result === 'coffe' || result === 'coffie' || result === 'kape' || result === 'coffee') {
    result = 'Coffee';
  }

  if (isLost) {
    return result.length > 0 && result.toLowerCase() !== 'lost money' ? `Lost Money - ${result}` : 'Lost Money';
  }

  if (!result || PREPOSITIONS.includes(result.toLowerCase())) {
    return isIncome ? 'Deposit' : '';
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

  // 1.5 Check for ATM WITHDRAWAL / CASH WITHDRAWAL intent (e.g., "withdraw 1000 sa BPI", "nagwithdraw 1000", "kuha cash 1k")
  if (lowerInput.includes('withdraw') || lowerInput.includes('nagwithdraw') || lowerInput.includes('kuha cash')) {
    const amount = normalizeAmount(trimmed);
    if (amount > 0) {
      const sourceBank = detectBank(trimmed) || 'BPI';
      return [
        {
          amount,
          type: 'transfer',
          categoryId: 'Housing',
          note: `ATM Cash Withdrawal from ${sourceBank}`,
          sourceBank,
          destinationBank: 'Cash',
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
      const note = cleanNote(segment, isIncome) || (isIncome ? 'Cash-In / Deposit' : 'Expense');
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
