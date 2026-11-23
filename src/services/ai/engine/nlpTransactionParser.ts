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
  GCash: ['gcash', 'g-cash', 'g cash', 'gcash credit', 'gcash e-wallet', 'gcash ewallet', 'gcash wallet'],
  GoTyme: ['gotyme', 'go tyme', 'go-tyme', 'gotime', 'go time', 'tyme', 'gotyme bank', 'go-time'],
  BPI: ['bpi', 'bpi bank', 'bpi savings', 'bpi rewards', 'bpi gold', 'bpi platinum', 'bpi amore', 'bpi signature', 'bpi epay'],
  Maya: ['maya', 'paymaya', 'pay maya', 'pay-maya', 'maya black', 'maya bank'],
  Landbank: ['landbank', 'land bank', 'land-bank', 'ofbank'],
  PNB: ['pnb', 'pnb bank', 'pnb ze-lo', 'pnb mabuhay miles', 'mabuhay miles'],
  BDO: ['bdo', 'bdo bank', 'bdo shopmore', 'bdo gold', 'bdo visa', 'bdo platinum', 'bdo unibank'],
  MariBank: ['maribank', 'mari bank', 'mari-bank'],
  SeaBank: ['seabank', 'sea bank'],
  Metrobank: ['metrobank', 'metro bank', 'metro-bank', 'metrobank titanium', 'metrobank platinum', 'metrobank m free', 'metrobank world'],
  UnionBank: ['unionbank', 'union bank', 'union-bank', 'ub', 'uniondigital', 'unionbank rewards', 'unionbank miles'],
  SecurityBank: ['security bank', 'securitybank', 'sb', 'security bank wave', 'security bank platinum', 'security bank world'],
  RCBC: ['rcbc', 'rcbc bank', 'rcbc rewards', 'rcbc black card', 'rcbc airasia', 'mywallet'],
  EastWest: ['eastwest', 'east west', 'east-west', 'eastwest priority', 'eastwest everyday', 'eastwest platinum'],
  HSBC: ['hsbc', 'hsbc bank', 'hsbc red', 'hsbc gold', 'hsbc platinum'],
  GrabPay: ['grabpay', 'grab pay', 'grab'],
  ShopeePay: ['shopeepay', 'shopee pay', 'shopee'],
  Wise: ['wise', 'transferwise'],
  Tonik: ['tonik', 'tonik bank'],
  CIMB: ['cimb', 'cimb bank'],
  Chinabank: ['chinabank', 'china bank'],
  Beep: ['beep', 'beep card'],
  PalawanPay: ['palawanpay', 'palawan pay', 'palawan'],
  BanKo: ['banko', 'bpi banko'],
  Payoneer: ['payoneer'],
  PayPal: ['paypal', 'pay pal'],
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
    'utang',
    'debt',
    'loan',
    'pautang',
    'hulugan',
    'bayad utang',
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
    'pabango',
    'pabanog',
    'perfume',
    'cologne',
    'fragrance',
    'lotion',
    'makeup',
    'make-up',
    'beauty',
    'cleanser',
    'facial wash',
    'facewash',
    'face wash',
    'facial',
    'hilamos',
    'panghilamos',
    'skincare',
    'skin care',
    'sunscreen',
    'sunblock',
    'moisturizer',
    'serum',
    'toner',
    'acne',
    'soap',
    'sabon',
    'shampoo',
    'conditioner',
    'body wash',
    'deodorant',
    'deo',
    'toothpaste',
    'toothbrush',
    'floss',
    'mouthwash',
    'cotton',
    'wipes',
    'tissue',
    'napkin',
    'cosmetics',
    'lipstick',
    'powder',
    'lip balm',
    'watsons',
    'personal care',
    'toiletries',
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
  'kanina',
  'kahapon',
  'ngayon',
  'mamaya',
  'nga',
  'din',
  'rin',
  'lang',
  'nag',
  'ay',
  'na',
  'pa',
  'eto',
  'etong',
  'itong',
  'nitong',
  'neto',
  'netong',
  'ung',
  'kay',
  'kina',
  'ba',
  'eh',
  'kasi',
  'dahil',
  'pala',
  'daw',
  'raw',
  'naman',
  'nila',
  'niya',
  'natin',
  'bayaran',
  'worth',
  'halaga',
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
  const isLent =
    lower.includes('pautang') ||
    lower.includes('nagpautang') ||
    lower.includes('pinautang') ||
    lower.includes('lent') ||
    lower.includes('owes me') ||
    lower.includes('owe me') ||
    lower.includes('own me') ||
    lower.includes('utang to me') ||
    lower.includes('utang sa akin') ||
    lower.includes('utang sakin');
  if (isLent) {
    return 'Lent';
  }
  if (lower.includes('debt') || lower.includes('utang') || lower.includes('loan') || lower.includes('hiram')) {
    return 'Debt';
  }
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return 'Food';
};

const PREPOSITIONS = ['to', 'into', 'in', 'sa', 'papunta', 'dito', 'para', 'for', 'on', 'at', 'with', 'from', 'by'];

const cleanNote = (rawText: string, isIncome: boolean = false): string => {
  let lower = rawText.toLowerCase();
  const isLost = ['nawala', 'nawalan', 'lost', 'missing', 'stolen', 'nanakaw', 'nahulog'].some(w => lower.includes(w));

  // Special handling for Utang / Debt / Loans / Lent (Pautang)
  if (
    lower.includes('utang') ||
    lower.includes('debt') ||
    lower.includes('loan') ||
    lower.includes('pautang') ||
    lower.includes('hiram') ||
    lower.includes('owe') ||
    lower.includes('lent')
  ) {
    const isIOwe =
      lower.includes('i owe') ||
      lower.includes('i owed') ||
      lower.includes('utang ko') ||
      lower.includes('may utang ako') ||
      lower.includes('umutang ako') ||
      lower.includes('nagkautang ako') ||
      lower.includes('borrowed from');

    const isLent =
      !isIOwe &&
      (lower.includes('pautang') ||
        lower.includes('nagpautang') ||
        lower.includes('pinautang') ||
        lower.includes('lent') ||
        lower.includes('owes me') ||
        lower.includes('owe me') ||
        lower.includes('own me') ||
        lower.includes('utang to me') ||
        lower.includes('utang sa akin') ||
        lower.includes('utang sakin'));

    let person = '';
    const amtPersonMatch = rawText.match(/(?:add\s+)?(?:\d+(?:,\d{3})*(?:\.\d+)?(?:k)?)\s+([a-zA-Z0-9_\-]+)\s+(?:i\s+owe|who\s+i\s+owe|that\s+i\s+owe)/i);
    if (amtPersonMatch) {
      person = amtPersonMatch[1].trim();
    } else {
      const personAmtMatch = rawText.match(/\b([a-zA-Z0-9_\-]+)\s+(?:(?:\d+(?:,\d{3})*(?:\.\d+)?(?:k)?)\s+)?(?:i\s+owe|that\s+i\s+owe)/i);
      if (personAmtMatch && !/^(?:add|i|owe|money|debt|utang)$/i.test(personAmtMatch[1])) {
        person = personAmtMatch[1].trim();
      } else {
        const iOweMatch = rawText.match(/\b(?:i\s+owe|owe)\s+(?:money\s+(?:to|on)\s+)?([a-zA-Z0-9_\-]+)\s+(?:\d+)/i);
        if (iOweMatch) {
          person = iOweMatch[1].trim();
        } else {
          const subjectMatch = rawText.match(/\b([a-zA-Z0-9_\-]+)\s+(?:owes?\s+me|own\s+me|has\s+(?:an\s+)?utang)/i);
          if (subjectMatch) {
            person = subjectMatch[1].trim();
          } else {
            const targetMatch = rawText.match(/(?:to|kay|kina|from|galing\s+kay|galing\s+sa)\s+([a-zA-Z0-9_\-]+)/i);
            if (targetMatch) {
              person = targetMatch[1].trim();
            } else {
              const lentMatch = rawText.match(/(?:pinautang|nagpautang|pautang)\s+(?:si|ni)?\s*([a-zA-Z0-9_\-]+)/i);
              if (lentMatch) {
                person = lentMatch[1].trim();
              }
            }
          }
        }
      }
    }

    const stopWords = new Set([
      'add', 'i', 'owe', 'owed', 'a', 'an', 'the', 'money', 'on', 'to', 'him', 'her', 'them',
      'me', 'from', 'my', 'debt', 'utang', 'loan', 'pautang', 'cash', 'gcash', 'maya',
      'bpi', 'gotyme', 'kay', 'si', 'ni', 'sa', 'akin', 'sakin', 'ko', 'mo', 'na', 'ng', 'din', 'rin', 'please',
      'ako', 'ikaw', 'ka', 'siya', 'kami', 'tayo', 'kayo', 'sila', 'namin', 'natin', 'ninyo', 'nila', 'other', 'people', 'human', 'card', 'bank', 'account'
    ]);

    if (stopWords.has(person.toLowerCase()) || !person) {
      const tokens = rawText.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w && isNaN(Number(w)));
      const candidate = tokens.find(t => !stopWords.has(t.toLowerCase()));
      person = candidate || '';
    }

    const formattedPerson = person ? person.charAt(0).toUpperCase() + person.slice(1) : '';

    if (isLent) {
      return formattedPerson ? `${formattedPerson} owes me` : 'Pautang (Owed to Me)';
    }
    return formattedPerson ? `Debt to ${formattedPerson}` : 'Utang / Debt';
  }

  // 1. Strip payment method phrases and bank references so they never pollute the note
  // e.g. "gamit ko cash", "gamit ang cash", "gamit gcash", "via maya", "using bpi", "thru cash", "gamit gotyme"
  lower = lower
    .replace(/\b(?:gamit(?:\s+(?:ko|ang|namin|ng|mo))?|via|thru|through|using|paid\s+with|bayad\s+sa|bayad\s+gamit)\s+(?:cash|gcash|maya|gotyme|bpi|bdo|unionbank|landbank|pnb|metrobank|seabank|maribank|visa|card|credit\s*card)\b/gi, ' ')
    .replace(/\b(?:gamit|gamitan|gamitin|using|via|thru|through)\b/gi, ' ')
    .replace(/\b(?:cash|gcash|maya|gotyme|bpi|bdo|unionbank|landbank|pnb|metrobank|seabank|maribank|visa)\b/gi, ' ');

  // 2. Strip transaction verbs & filler words
  lower = lower
    .replace(/\b(?:bumili|bili|nagbayad|pambili|pambayad|nagastos|gastos|naglabas|binili|order|nag-order)\b/gi, ' ')
    .replace(/\b(?:ako|kami|tayo|siya|sila|ko|namin|mo|niya|ng|nang|sa|kay|para|mga|worth|pesos|peso|php|[p₱])\b/gi, ' ')
    .replace(/\b\d+(?:,\d{3})*(?:\.\d{1,2})?(?:k)?\b/gi, ' ');

  let result = lower.replace(/\s+/g, ' ').trim();

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

  // Capitalize title case nicely, preserving 'at' / 'and' / '&' between words
  return result
    .split(' ')
    .map((w, idx) => {
      if ((w === 'at' || w === 'and' || w === '&') && idx > 0) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
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

  // Check if text has multiple separate numeric amounts
  const amountMatches = trimmed.match(/(?:[p₱]\s*)?\b\d+(?:,\d{3})*(?:\.\d{1,2})?(?:k)?\b/gi) || [];

  // If there's only 1 amount, treat the whole sentence as a single transaction!
  // This ensures compound item phrases like "cleanser at facial wash" are not split.
  const segments =
    amountMatches.length <= 1
      ? [trimmed]
      : trimmed
          .split(/(?:,|\btapos\b|\bsaka\b|\n)/i)
          .map((s) => s.trim())
          .filter(Boolean);

  for (const segment of segments) {
    const lowerSegment = segment.toLowerCase();
    const isDebtOrLoan =
      lowerSegment.includes('debt') ||
      lowerSegment.includes('utang') ||
      lowerSegment.includes('loan') ||
      lowerSegment.includes('pautang') ||
      lowerSegment.includes('hiram') ||
      lowerSegment.includes('babayaran');

    const isExplicitExpense =
      isDebtOrLoan ||
      lowerSegment.includes('spent') ||
      lowerSegment.includes('spend') ||
      lowerSegment.includes('gastos') ||
      lowerSegment.includes('bili') ||
      lowerSegment.includes('bumili') ||
      lowerSegment.includes('bayad') ||
      lowerSegment.includes('nagbayad') ||
      lowerSegment.includes('bill') ||
      lowerSegment.includes('bills');

    const segmentBank = detectBank(segment) || defaultBank || (isDebtOrLoan ? 'Personal Debt' : 'Cash');
    const amount = normalizeAmount(segment);

    if (amount > 0) {
      const isIncome = !isExplicitExpense && INCOME_KEYWORDS.some((kw) => lowerSegment.includes(kw));
      const categoryId = detectCategory(segment, isIncome);
      const note = cleanNote(segment, isIncome) || (isIncome ? 'Cash-In / Deposit' : (isDebtOrLoan ? 'Utang / Debt' : 'Expense'));
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
