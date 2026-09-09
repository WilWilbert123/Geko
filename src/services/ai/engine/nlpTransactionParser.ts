export interface ParsedTransaction {
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  note: string;
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
    'milktea',
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
    'gamit',
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
];

const detectCategory = (text: string, isIncome: boolean): string => {
  if (isIncome) return 'Salary';
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return 'Food'; // sensible default for everyday Philippine retail / street expenses
};

const cleanNote = (rawText: string): string => {
  let words = rawText.toLowerCase().split(/\s+/);
  words = words.filter((w) => !FILLER_WORDS.includes(w) && !/^\d+$/.test(w));
  const result = words.join(' ').trim();
  return result.length > 0 ? result : rawText.trim();
};

export const parseTransactionsFromText = (input: string): ParsedTransaction[] => {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const results: ParsedTransaction[] = [];

  // Split by explicit connectors first (comma, 'at', 'and', 'tapos', 'saka', '&', newline)
  const segments = trimmed
    .split(/(?:,|\bat\b|\band\b|\btapos\b|\bsaka\b|&|\n)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    // Check if segment has multiple transactions, e.g. "kumain kami 100 bumili ulam 200"
    // Regex matches [words] [number] pairs
    const pairRegex = /([a-zA-Z\s\-ñÑ]+?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:pesos|php|dollars|\$|p)?/gi;
    let match: RegExpExecArray | null;
    let foundPairs = false;

    // Check count of numbers in segment
    const numbersInSegment = segment.match(/\d+(?:\.\d+)?/g);
    if (numbersInSegment && numbersInSegment.length > 1) {
      while ((match = pairRegex.exec(segment)) !== null) {
        const rawNote = match[1].trim();
        const amount = parseFloat(match[2]);
        if (amount > 0 && rawNote.length > 0) {
          const isIncome = INCOME_KEYWORDS.some((kw) => rawNote.toLowerCase().includes(kw));
          const cleaned = cleanNote(rawNote);
          const categoryId = detectCategory(rawNote, isIncome);
          results.push({
            amount,
            type: isIncome ? 'income' : 'expense',
            categoryId,
            note: cleaned || rawNote,
          });
          foundPairs = true;
        }
      }
    }

    if (!foundPairs) {
      // Single transaction in this segment
      const numMatch = segment.match(/(\d+(?:\.\d+)?)/);
      if (numMatch) {
        const amount = parseFloat(numMatch[1]);
        if (amount > 0) {
          const isIncome = INCOME_KEYWORDS.some((kw) => segment.toLowerCase().includes(kw));
          const cleaned = cleanNote(segment);
          const categoryId = detectCategory(segment, isIncome);
          results.push({
            amount,
            type: isIncome ? 'income' : 'expense',
            categoryId,
            note: cleaned || 'Expenses',
          });
        }
      }
    }
  }

  return results;
};
