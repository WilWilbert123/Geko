/**
 * High-Accuracy Receipt Parser for Geko Budget Tracker
 * Supports POS thermal receipts, e-receipts, supermarket/grocery bills,
 * dining slips, convenience stores, gas stations, pharmacies,
 * utility bills, and Philippine payment slips (GCash, Maya, Grab).
 */

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface ParsedReceipt {
  merchant: string;
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  items: ReceiptItem[];
  date: Date;
  dateString: string;
  category: string;
  paymentMethod?: string;
  suggestedBank?: string;
  confidence: number; // 0 - 100
  rawText: string;
}

// Known merchants mapped to their default budget category & bank
interface MerchantProfile {
  name: string;
  category: string;
  bank?: string;
}

const KNOWN_MERCHANTS: Record<string, MerchantProfile> = {
  // Fast Food & Dining
  jollibee: { name: 'Jollibee', category: 'Food' },
  mcdonalds: { name: "McDonald's", category: 'Food' },
  mcdo: { name: "McDonald's", category: 'Food' },
  kfc: { name: 'KFC', category: 'Food' },
  chowking: { name: 'Chowking', category: 'Food' },
  manginasal: { name: 'Mang Inasal', category: 'Food' },
  greenwich: { name: 'Greenwich', category: 'Food' },
  burgerking: { name: 'Burger King', category: 'Food' },
  popeyes: { name: 'Popeyes', category: 'Food' },
  bonchon: { name: 'BonChon', category: 'Food' },
  wendys: { name: "Wendy's", category: 'Food' },
  subway: { name: 'Subway', category: 'Food' },
  pizzahut: { name: 'Pizza Hut', category: 'Food' },
  shakeys: { name: "Shakey's", category: 'Food' },
  yellowcab: { name: 'Yellow Cab Pizza', category: 'Food' },
  dominos: { name: "Domino's Pizza", category: 'Food' },
  potatocorner: { name: 'Potato Corner', category: 'Food' },
  auntieannes: { name: "Auntie Anne's", category: 'Food' },
  dunkin: { name: "Dunkin'", category: 'Food' },
  krispykreme: { name: 'Krispy Kreme', category: 'Food' },
  tokyotokyo: { name: 'Tokyo Tokyo', category: 'Food' },
  marugame: { name: 'Marugame Udon', category: 'Food' },
  pepperlunch: { name: 'Pepper Lunch', category: 'Food' },
  armynavy: { name: 'Army Navy', category: 'Food' },
  periperi: { name: 'Peri-Peri Charcoal Chicken', category: 'Food' },
  kennyrogers: { name: 'Kenny Rogers Roasters', category: 'Food' },
  kuyaj: { name: 'Kuya J Restaurant', category: 'Food' },
  manam: { name: 'Manam Comfort Filipino', category: 'Food' },
  gerrysgrill: { name: "Gerry's Grill", category: 'Food' },
  samgyupsal: { name: 'Samgyupsal Korean BBQ', category: 'Food' },

  // Cafes & Milk Tea
  starbucks: { name: 'Starbucks', category: 'Food' },
  coffeebean: { name: 'The Coffee Bean & Tea Leaf', category: 'Food' },
  cbtl: { name: 'The Coffee Bean & Tea Leaf', category: 'Food' },
  boscoffee: { name: "Bo's Coffee", category: 'Food' },
  timhortons: { name: 'Tim Hortons', category: 'Food' },
  highlands: { name: 'Highlands Coffee', category: 'Food' },
  pickupcoffee: { name: 'PickUp Coffee', category: 'Food' },
  zuscoffee: { name: 'Zus Coffee', category: 'Food' },
  butfirstcoffee: { name: 'But First, Coffee', category: 'Food' },
  macaoimperial: { name: 'Macao Imperial Tea', category: 'Food' },
  gongcha: { name: 'Gong Cha', category: 'Food' },
  coco: { name: 'CoCo Fresh Tea & Juice', category: 'Food' },
  chatime: { name: 'Chatime', category: 'Food' },
  tigersugar: { name: 'Tiger Sugar', category: 'Food' },

  // Supermarkets & Groceries
  puregold: { name: 'Puregold Supermarket', category: 'Shopping' },
  smsupermarket: { name: 'SM Supermarket', category: 'Shopping' },
  smhypermarket: { name: 'SM Hypermarket', category: 'Shopping' },
  savemore: { name: 'Savemore Market', category: 'Shopping' },
  robinsons: { name: 'Robinsons Supermarket', category: 'Shopping' },
  landers: { name: 'Landers Superstore', category: 'Shopping' },
  snr: { name: 'S&R Membership Shopping', category: 'Shopping' },
  waltermart: { name: 'WalterMart Supermarket', category: 'Shopping' },
  allday: { name: 'AllDay Supermarket', category: 'Shopping' },
  dali: { name: 'Dali Everyday Grocery', category: 'Shopping' },
  osave: { name: 'O!Save Trading', category: 'Shopping' },
  alfamart: { name: 'Alfamart', category: 'Shopping' },

  // Convenience Stores
  '7-eleven': { name: '7-Eleven', category: 'Food' },
  '7eleven': { name: '7-Eleven', category: 'Food' },
  seveneleven: { name: '7-Eleven', category: 'Food' },
  lawson: { name: 'Lawson', category: 'Food' },
  ministop: { name: "Uncle John's / Ministop", category: 'Food' },
  unclejohns: { name: "Uncle John's", category: 'Food' },
  familymart: { name: 'FamilyMart', category: 'Food' },

  // Pharmacies & Health
  mercurydrug: { name: 'Mercury Drug', category: 'Health' },
  mercury: { name: 'Mercury Drug', category: 'Health' },
  watsons: { name: 'Watsons Personal Care Stores', category: 'Health' },
  southstar: { name: 'Southstar Drug', category: 'Health' },
  rosepharmacy: { name: 'Rose Pharmacy', category: 'Health' },
  generika: { name: 'Generika Drugstore', category: 'Health' },
  tgp: { name: 'The Generics Pharmacy', category: 'Health' },
  healthyoptions: { name: 'Healthy Options', category: 'Health' },

  // Transport & Fuel
  shell: { name: 'Shell Gasoline', category: 'Transport' },
  petron: { name: 'Petron Gas Station', category: 'Transport' },
  caltex: { name: 'Caltex Gasoline', category: 'Transport' },
  total: { name: 'Total Gas Station', category: 'Transport' },
  seaoil: { name: 'Seaoil Gas Station', category: 'Transport' },
  cleanfuel: { name: 'Cleanfuel', category: 'Transport' },
  phoenix: { name: 'Phoenix Petroleum', category: 'Transport' },
  unioil: { name: 'Unioil Gas Station', category: 'Transport' },
  grab: { name: 'Grab Transport', category: 'Transport', bank: 'GrabPay' },
  grabfood: { name: 'GrabFood', category: 'Food', bank: 'GrabPay' },
  angkas: { name: 'Angkas Motorcycle Taxi', category: 'Transport', bank: 'GCash' },
  joyride: { name: 'JoyRide', category: 'Transport', bank: 'GCash' },
  moveit: { name: 'Move It', category: 'Transport', bank: 'GCash' },

  // E-Commerce & Retail
  shopee: { name: 'Shopee', category: 'Shopping', bank: 'ShopeePay' },
  lazada: { name: 'Lazada', category: 'Shopping', bank: 'GCash' },
  tiktokshop: { name: 'TikTok Shop', category: 'Shopping', bank: 'GCash' },
  uniqlo: { name: 'Uniqlo Philippines', category: 'Shopping' },
  hm: { name: 'H&M', category: 'Shopping' },
  zara: { name: 'Zara', category: 'Shopping' },
  decathlon: { name: 'Decathlon Sports', category: 'Shopping' },
  miniso: { name: 'Miniso', category: 'Shopping' },
  mumuso: { name: 'Mumuso', category: 'Shopping' },
  daiso: { name: 'Daiso Japan', category: 'Shopping' },
  japanhome: { name: 'Japan Home Centre', category: 'Shopping' },
  acehardware: { name: 'Ace Hardware', category: 'Shopping' },
  handyman: { name: 'Handyman Do It Best', category: 'Shopping' },
  wilcon: { name: 'Wilcon Depot', category: 'Shopping' },
  nationalbook: { name: 'National Book Store', category: 'Shopping' },
  fullybooked: { name: 'Fully Booked', category: 'Shopping' },

  // Utilities
  meralco: { name: 'Meralco Electric', category: 'Utilities' },
  maynilad: { name: 'Maynilad Water', category: 'Utilities' },
  manilawater: { name: 'Manila Water', category: 'Utilities' },
  pldt: { name: 'PLDT Home Fiber', category: 'Utilities' },
  globe: { name: 'Globe Telecom', category: 'Utilities' },
  smart: { name: 'Smart Communications', category: 'Utilities' },
  dito: { name: 'DITO Telecommunity', category: 'Utilities' },
  converge: { name: 'Converge ICT Fiber', category: 'Utilities' },
  skycable: { name: 'Sky Cable', category: 'Utilities' },
  cignal: { name: 'Cignal TV', category: 'Utilities' },
};

/**
 * Normalizes common OCR character confusions in receipt text
 */
function normalizeOCRArtifacts(str: string): string {
  return str
    .replace(/\b([P|p][H|h][P|p]|[P|p][H|h]|Php|PHP)\b/g, '₱')
    .replace(/[—–]/g, '-')
    .replace(/[""]/g, '"');
}

/**
 * Parses raw text extracted from a receipt image or entered manually
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const normalizedText = normalizeOCRArtifacts(rawText);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let detectedMerchant = '';
  let detectedCategory = 'Food';
  let suggestedBank: string | undefined;
  let subtotal: number | undefined;
  let tax: number | undefined;
  let discount: number | undefined;
  let explicitTotal: number | undefined;
  let date: Date = new Date();
  let paymentMethod: string | undefined;

  const items: ReceiptItem[] = [];

  // 1. Detect Merchant Name
  // Check the first 8 lines against known merchants
  const headerBlock = lines
    .slice(0, 8)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  for (const [key, profile] of Object.entries(KNOWN_MERCHANTS)) {
    if (headerBlock.includes(key)) {
      detectedMerchant = profile.name;
      detectedCategory = profile.category;
      suggestedBank = profile.bank;
      break;
    }
  }

  // Fallback: examine early non-metadata lines
  if (!detectedMerchant && lines.length > 0) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const candidate = lines[i].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
      const lowerCandidate = candidate.toLowerCase();
      // Skip lines that look like TIN, receipt header, phone, or date
      if (
        candidate.length >= 3 &&
        !/\b(receipt|invoice|tax|tin|terminal|machine|or#|reg|branch|welcome|official|tel|date|time)\b/i.test(
          lowerCandidate
        ) &&
        !/^\d+$/.test(candidate)
      ) {
        detectedMerchant = candidate.toUpperCase();
        break;
      }
    }
    if (!detectedMerchant) {
      detectedMerchant = 'Store Receipt';
    }
  }

  // 2. Detect Date
  const datePatterns = [
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
    /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/,
    /\b(\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{2,4})\b/i,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/i,
  ];

  for (const line of lines) {
    let matched = false;
    for (const pat of datePatterns) {
      const m = line.match(pat);
      if (m) {
        const parsedDate = new Date(m[1].replace(/-/g, '/'));
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000 && parsedDate.getFullYear() < 2035) {
          date = parsedDate;
          matched = true;
          break;
        }
      }
    }
    if (matched) break;
  }

  // 3. Detect Payment Method / Bank tender
  const paymentRegex =
    /\b(cash|gcash|maya|paymaya|visa|mastercard|bpi|bdo|gotyme|unionbank|metrobank|landbank|security\s*bank|debit|credit|amex|shopeepay|grabpay)\b/i;

  for (const line of lines) {
    const m = line.match(paymentRegex);
    if (m) {
      const tender = m[1].toLowerCase().replace(/\s+/g, '');
      if (tender === 'cash') {
        paymentMethod = 'Cash';
        if (!suggestedBank) suggestedBank = 'Cash';
      } else if (tender === 'gcash') {
        paymentMethod = 'GCash';
        suggestedBank = 'GCash';
      } else if (tender.includes('maya')) {
        paymentMethod = 'Maya';
        suggestedBank = 'Maya';
      } else if (tender === 'gotyme') {
        paymentMethod = 'GoTyme';
        suggestedBank = 'GoTyme';
      } else if (tender === 'bpi') {
        paymentMethod = 'BPI';
        suggestedBank = 'BPI';
      } else if (tender === 'bdo') {
        paymentMethod = 'BDO';
        suggestedBank = 'BDO';
      } else if (tender === 'visa' || tender === 'mastercard' || tender.includes('credit')) {
        paymentMethod = m[1].toUpperCase();
        if (!suggestedBank) suggestedBank = 'Visa / Card';
      }
      break;
    }
  }

  // 4. Financial totals (Total Amount, Subtotal, VAT, Discounts, Cash Tendered)
  // Walk backwards from bottom of receipt
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Check for tender or change lines first to avoid confusing with total
    const isTenderLine =
      lower.includes('tender') ||
      lower.includes('cash received') ||
      lower.includes('received') ||
      lower.includes('change due') ||
      lower.includes('sukli') ||
      lower.includes('change:');

    const amounts = extractAmountsFromLine(line);
    if (amounts.length === 0) continue;
    const lastAmount = amounts[amounts.length - 1];

    if (!isTenderLine) {
      // Grand Total keywords
      const isTotalKeyword =
        lower.includes('grand total') ||
        lower.includes('total amount') ||
        lower.includes('amount due') ||
        lower.includes('total due') ||
        lower.includes('net total') ||
        lower.includes('total sales') ||
        /\btotal\s*[:=]?\s*[p₱]?\s*[\d,.]+/i.test(line) ||
        /^total\b/i.test(line.trim());

      if (
        !explicitTotal &&
        isTotalKeyword &&
        !lower.includes('subtotal') &&
        !lower.includes('sub-total') &&
        !lower.includes('vatable') &&
        !lower.includes('qty') &&
        !lower.includes('items')
      ) {
        explicitTotal = lastAmount;
      }

      // Subtotal
      if (
        !subtotal &&
        (lower.includes('subtotal') || lower.includes('sub-total') || lower.includes('gross total'))
      ) {
        subtotal = lastAmount;
      }

      // VAT / Tax
      if (!tax && (lower.includes('12% vat') || lower.includes('vat amount') || lower.includes('evat') || lower.includes('tax:'))) {
        tax = lastAmount;
      }

      // Discounts (SC, PWD, Promo)
      if (
        !discount &&
        (lower.includes('discount') || lower.includes('pwd') || lower.includes('senior') || lower.includes('promo'))
      ) {
        discount = Math.abs(lastAmount);
      }
    }
  }

  // 5. Line Item Extraction (supports both 1-line and 2-line POS receipt formats)
  const ignoredKeywords = [
    'total',
    'subtotal',
    'sub-total',
    'vat',
    'tax',
    'change',
    'cash',
    'tender',
    'balance',
    'discount',
    'disc',
    'senior',
    'pwd',
    'official receipt',
    'sales invoice',
    'tin:',
    'terminal',
    'invoice',
    'thank you',
    'date',
    'time',
    'welcome',
    'payment',
    'customer',
    'cashier',
    'reprint',
    'branch',
    'sukli',
    'trans#',
    'mastercard',
    'visa',
    'debit',
    'credit',
    'amex',
    'bank',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip financial summary and header lines
    if (ignoredKeywords.some((k) => lower.includes(k))) continue;

    // Check if current line contains a price
    const amounts = extractAmountsFromLine(line);

    if (amounts.length > 0) {
      const linePrice = amounts[amounts.length - 1];

      // Extract quantity (e.g. "2x", "2 *", "1PC", "3 PCS")
      let qty = 1;
      const qtyMatch = line.match(/^(\d{1,2})\s*(?:x|\*|pc|pcs)\b/i);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10);
      }

      // Check if current line is a POS unit-price subline (e.g. "1 @ 265.00  265.00", "10 PCS @ 9.50", "21.42 L @ 65.35")
      const isUnitPriceSubline = /^\s*(\d{1,4}(?:\.\d{1,3})?)?\s*(?:pcs|pc|liters?|l|kg|g|x|\*)?\s*[@]\s*[\d.]+/i.test(line.trim());

      let itemName = '';
      if (isUnitPriceSubline) {
        const atQtyMatch = line.match(/^(\d{1,4}(?:\.\d{1,3})?)\s*(?:pcs|pc|liters?|l|kg|g|x|\*)?\s*[@]/i);
        if (atQtyMatch) {
          qty = Math.round(parseFloat(atQtyMatch[1])) || 1;
        }
        if (i > 0) {
          const prevLine = lines[i - 1];
          itemName = prevLine
            .replace(/^\d{6,14}\s+/, '')
            .replace(/[^a-zA-Z0-9\s/&.'-]/g, ' ')
            .trim();
        }
      } else {
        // Clean item name on same line
        itemName = line
          .replace(/[p₱]?\s*[\d,.]+\s*$/i, '') // remove price at end
          .replace(/^(\d{1,2})\s*(?:x|\*|pc|pcs)\s*/i, '') // remove quantity prefix
          .replace(/^\d{6,14}\s+/, '') // remove barcode prefixes (e.g. 4800016644...)
          .replace(/[^a-zA-Z0-9\s/&.'-]/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();

        // Check if item name is empty but previous line had an item description (2-line POS format)
        if (itemName.length < 2 && i > 0) {
          const prevLine = lines[i - 1];
          const prevLower = prevLine.toLowerCase();
          if (!ignoredKeywords.some((k) => prevLower.includes(k))) {
            itemName = prevLine
              .replace(/^\d{6,14}\s+/, '')
              .replace(/[^a-zA-Z0-9\s/&.'-]/g, ' ')
              .trim();
          }
        }
      }

      // Validate price reasonableness (exclude years, barcodes, serials)
      if (
        itemName.length >= 2 &&
        linePrice > 0 &&
        linePrice < 100000 &&
        linePrice !== 2024 &&
        linePrice !== 2025 &&
        linePrice !== 2026
      ) {
        items.push({
          name: itemName,
          qty,
          price: Math.round((linePrice / qty) * 100) / 100,
          total: linePrice,
        });
      }
    }
  }

  // 6. Final Total Calculation & Validation
  let finalTotal = explicitTotal || 0;

  if (!finalTotal || finalTotal === 0) {
    if (items.length > 0) {
      finalTotal = items.reduce((sum, it) => sum + it.total, 0);
    } else {
      // Find all valid candidate amounts
      const allAmounts: number[] = [];
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (!lower.includes('tender') && !lower.includes('sukli') && !lower.includes('tin') && !lower.includes('vatable')) {
          allAmounts.push(...extractAmountsFromLine(line));
        }
      }
      const filtered = allAmounts.filter((n) => n > 5 && n < 100000 && n !== 2024 && n !== 2025 && n !== 2026);
      if (filtered.length > 0) {
        finalTotal = Math.max(...filtered);
      }
    }
  }

  // Confidence rating based on completeness of recognized data
  let confidence = 50;
  if (detectedMerchant && detectedMerchant !== 'Store Receipt') confidence += 20;
  if (finalTotal > 0) confidence += 15;
  if (items.length > 0) confidence += 15;

  const dateString = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    merchant: detectedMerchant,
    total: Math.round(finalTotal * 100) / 100,
    subtotal,
    tax,
    discount,
    items,
    date,
    dateString,
    category: detectedCategory,
    paymentMethod: paymentMethod || 'Cash',
    suggestedBank: suggestedBank || 'Cash',
    confidence: Math.min(100, confidence),
    rawText,
  };
}

/**
 * Extracts numeric prices from a single line of text with OCR cleanup
 */
function extractAmountsFromLine(line: string): number[] {
  // Guard against TIN numbers (e.g. 000-123-456-000)
  if (/\btin\b/i.test(line) || /^\d{3}-\d{3}-\d{3}/.test(line.trim())) {
    return [];
  }

  // Match currency expressions like ₱120.00, P99, 1,450.50, 45.00
  const matches = line.match(/(?:[p₱]\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2}))\b/g);
  if (!matches) return [];

  const results: number[] = [];
  for (const m of matches) {
    const cleanNum = m.replace(/[p₱,\s]/gi, '');
    const val = parseFloat(cleanNum);
    // Ignore pure 4-digit years like 2025 or 2026 without decimals
    if (!isNaN(val) && (m.includes('.') || val < 1900 || val > 2100)) {
      results.push(val);
    }
  }
  return results;
}

/**
 * Preset realistic samples for instant demonstration & testing
 */
export const SAMPLE_RECEIPTS = [
  {
    id: 'jollibee',
    title: '🍗 Jollibee Dine-In',
    store: 'Jollibee',
    category: 'Food',
    bank: 'GCash',
    rawText: `JOLLIBEE FOODS CORP.
SM MEGAMALL BRANCH
TIN: 000-333-888-000
REG: 10/27/2026 13:42

1x 1PC CHICKENJOY W/ RICE    ₱99.00
1x JOLLY SPAGHETTI           ₱65.00
1x LARGE COKE FLOAT          ₱55.00
1x EXTRA RICE                ₱29.00

SUBTOTAL:                   ₱248.00
12% VAT:                     ₱26.57
TOTAL AMOUNT:               ₱248.00
TENDERED (GCASH):           ₱248.00
CHANGE:                       ₱0.00

THANK YOU FOR DINING AT JOLLIBEE!`,
  },
  {
    id: '7eleven',
    title: '🏪 7-Eleven Quick Run',
    store: '7-Eleven',
    category: 'Food',
    bank: 'Maya',
    rawText: `PHILIPPINE SEVEN CORP
7-ELEVEN STORE #1842
MAKATI CITY
DATE: 27-OCT-2026 21:15

1x BIG BITE CHEESE HOTDOG    ₱49.00
1x GULP MOUNTAIN DEW 22OZ    ₱38.00
1x OREO COOKIE PACK          ₱28.00

TOTAL:                      ₱115.00
MAYA E-WALLET:              ₱115.00
CHANGE:                       ₱0.00

SAVED IN GEKO BUDGET`,
  },
  {
    id: 'puregold',
    title: '🛒 Puregold Grocery',
    store: 'Puregold Supermarket',
    category: 'Shopping',
    bank: 'BPI',
    rawText: `PUREGOLD PRICE CLUB INC.
BRANCH #042 QUEZON CITY
OR# 98214349 10/26/2026

2x SAN MIG FRESH MILK 1L    ₱198.00
1x CDO CORNED BEEF 260G      ₱85.50
1x UFC BANANA CATSUP 550G    ₱42.00
1x EQUAL SWEETENER 50S       ₱95.00
1x DOLE BANANA PACK         ₱125.00
1x TRESOR RICE 5KG          ₱285.00

SUBTOTAL:                   ₱830.50
12% VAT:                     ₱88.98
TOTAL AMOUNT:               ₱830.50
BPI VISA DEBIT:             ₱830.50

THANK YOU FOR SHOPPING AT PUREGOLD!`,
  },
  {
    id: 'shell',
    title: '⛽ Shell Gasoline Fuel',
    store: 'Shell Gasoline',
    category: 'Transport',
    bank: 'GoTyme',
    rawText: `PILIPINAS SHELL PETROLEUM
SHELL EDSA EXTENSION
DATE: 10/27/2026 08:30

1x FUELSHELL V-POWER GAS   ₱1,200.00
1x SELECT NATURE SPRING 1L    ₱35.00

SUBTOTAL:                 ₱1,235.00
TOTAL AMOUNT:             ₱1,235.00
GOTYME VISA DEBIT:        ₱1,235.00

GO WELL GO SHELL`,
  },
  {
    id: 'mercury',
    title: '💊 Mercury Drug Meds',
    store: 'Mercury Drug',
    category: 'Health',
    bank: 'Cash',
    rawText: `MERCURY DRUG CORPORATION
BRANCH 011 MANILA
OFFICIAL RECEIPT
DATE: 10/27/2026 15:20

10x BIOGESIC 500MG TAB       ₱85.00
1x BETADINE ANTISEPTIC 60ML ₱165.00
1x CEELIN PLUS 100ML        ₱145.00

TOTAL:                      ₱395.00
CASH TENDERED:              ₱500.00
CHANGE DUE:                 ₱105.00

NAKASISIGURO GAMOT AY BAGO`,
  },
];
