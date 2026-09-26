import { Card } from '../hooks/useCards';
import { getBankTheme } from './bankThemes';

export interface ExtractedCardInfo {
  id?: string;
  bankName: string;
  balance?: number;
  type?: string;
  color1: string;
  color2: string;
  cardNumber?: string;
}

const KNOWN_BANKS = [
  'GCash',
  'GoTyme',
  'BPI',
  'Maya',
  'PNB',
  'BDO',
  'MariBank',
  'SeaBank',
  'Metrobank',
  'UnionBank',
  'Landbank',
  'Visa',
  'Cash',
];

// Canonical bank key normalization (GCash, GCash E-Wallet, GCash Wallet -> 'gcash')
export const getCanonicalBankKey = (bankName?: string): string => {
  if (!bankName) return '';
  const lower = bankName.toLowerCase().trim();
  if (lower === 'cash') return 'cash'; // physical on-hand cash
  if (lower.startsWith('gcash') || lower.includes('gcash')) {
    return 'gcash';
  }
  if (lower.startsWith('maya') || lower.includes('paymaya')) {
    return 'maya';
  }
  if (lower.startsWith('gotyme') || lower.includes('gotyme')) {
    return 'gotyme';
  }
  if (lower.startsWith('grabpay') || lower.includes('grab pay') || lower.includes('grabpay')) {
    return 'grabpay';
  }
  return lower.replace(/\s+(e-wallet|ewallet|wallet|digital bank|bank)$/i, '').trim();
};

// Accurate word-boundary text matcher to prevent "Cash" matching inside "GCash"
const isBankInText = (bankName: string, text: string): boolean => {
  if (!bankName || !text) return false;
  const lowerBank = bankName.toLowerCase().trim();
  const lowerText = text.toLowerCase();

  if (lowerBank === 'cash') {
    // Strictly match standalone word "cash", ignore when part of "gcash"
    return /\bcash\b/i.test(text) && !/\bgcash\b/i.test(text);
  }

  // Exact word boundary check for bank names (e.g. \bBPI\b, \bGCash\b, \bGoTyme\b)
  const escaped = lowerBank.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(lowerText);
};

export const extractCardsFromText = (
  text: string,
  userCards: Card[] = []
): ExtractedCardInfo[] => {
  if (!text) return [];

  const foundMap = new Map<string, ExtractedCardInfo>();

  // Helper to match a raw bank name string against userCards DB or KNOWN_BANKS
  const findMatchingBank = (str: string): { canonicalName: string; matchedCard?: Card } | null => {
    if (!str) return null;
    const cleanStr = str.trim().toLowerCase();

    // Ignore long sentences / paragraphs falsely captured by loose regex
    if (cleanStr.length > 25) return null;

    const targetKey = getCanonicalBankKey(cleanStr);

    // 1. Match against user's actual cards in DB using canonical key & word boundary
    const cardMatch = userCards.find(c => {
      const cKey = getCanonicalBankKey(c.bankName);
      if (cKey && cKey === targetKey) return true;
      return c.bankName.toLowerCase() === cleanStr || isBankInText(c.bankName, cleanStr);
    });

    if (cardMatch) {
      return { canonicalName: cardMatch.bankName, matchedCard: cardMatch };
    }

    // 2. Match against known bank list
    const knownMatch = KNOWN_BANKS.find(b => {
      const bKey = getCanonicalBankKey(b);
      if (bKey && bKey === targetKey) return true;
      return b.toLowerCase() === cleanStr || isBankInText(b, cleanStr);
    });

    if (knownMatch) {
      return { canonicalName: knownMatch };
    }

    return null;
  };

  const resolveAndSetCard = (bankName: string, parsedBal?: number, matchedCard?: Card) => {
    const key = getCanonicalBankKey(bankName);
    const theme = getBankTheme(bankName, matchedCard?.color1, matchedCard?.color2);

    const balance = parsedBal !== undefined && !isNaN(parsedBal)
      ? parsedBal
      : matchedCard
        ? (matchedCard.type === 'CREDIT_CARD' ? (matchedCard.outstandingBalance || 0) : matchedCard.balance)
        : 0;

    if (foundMap.has(key)) {
      // Deduplicate: If an entry already exists under this canonical key, update balance
      const existing = foundMap.get(key)!;
      if (parsedBal !== undefined && !isNaN(parsedBal)) {
        existing.balance = parsedBal;
      } else if ((existing.balance === 0 || existing.balance === undefined) && balance > 0) {
        existing.balance = balance;
      }
      if (!existing.id && matchedCard?.id) {
        existing.id = matchedCard.id;
        existing.bankName = matchedCard.bankName;
      }
    } else {
      foundMap.set(key, {
        id: matchedCard?.id || key,
        bankName: matchedCard ? matchedCard.bankName : bankName,
        balance,
        type: matchedCard?.type || (key === 'visa' ? 'CREDIT_CARD' : key === 'cash' ? 'CASH' : 'EWALLET'),
        color1: matchedCard?.color1 || theme.bg1,
        color2: matchedCard?.color2 || theme.bg2,
        cardNumber: matchedCard?.cardNumber || `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
      });
    }
  };

  // 1. Line list pattern (e.g. "BPI = 1,290" or "GCash: ₱280.00" or "Cash = 500")
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const listMatch = line.match(/^\s*([A-Za-z0-9\s-]+?)\s*[:=–-]\s*₱?\s*([\d,]+(?:\.\d+)?)\b/);
    if (listMatch) {
      const rawBank = listMatch[1].trim();
      const rawBal = parseFloat(listMatch[2].replace(/,/g, ''));
      const matchRes = findMatchingBank(rawBank);
      if (matchRes && !isNaN(rawBal)) {
        resolveAndSetCard(matchRes.canonicalName, rawBal, matchRes.matchedCard);
      }
    }
  }

  // 2. Sentence balance pattern (e.g. "balance sa GCash ay ₱500.00" or "Natitirang balance sa GCash: ₱280.00")
  const sentenceRegex = /(?:balance|natitirang balance|natitirang pera|pera|laman|remaining|owed)(?:\s+(?:mo|ko|ng|sa|in|on|for|from|ay))*\s+([A-Za-z0-9\s-]+?)(?:\s+(?:ay|is|na|sa|:|=|-))*\s*₱?\s*([\d,]+(?:\.\d+)?)/gi;
  let sMatch;
  while ((sMatch = sentenceRegex.exec(text)) !== null) {
    const rawBank = sMatch[1] ? sMatch[1].trim() : '';
    const rawBal = parseFloat(sMatch[2].replace(/,/g, ''));
    if (rawBank) {
      const matchRes = findMatchingBank(rawBank);
      if (matchRes) {
        resolveAndSetCard(matchRes.canonicalName, !isNaN(rawBal) ? rawBal : undefined, matchRes.matchedCard);
      }
    }
  }

  // 3. Check for specific cards mentioned with strict word boundaries in text
  for (const card of userCards) {
    const bKey = getCanonicalBankKey(card.bankName);
    const isMentioned = isBankInText(card.bankName, text) || (bKey && isBankInText(bKey, text));
    if (isMentioned && !foundMap.has(bKey)) {
      resolveAndSetCard(card.bankName, undefined, card);
    }
  }

  // 4. Fallback for KNOWN_BANKS:
  // If user already has cards in userCards, NEVER add a 0-balance phantom card for a bank that is already owned or unowned!
  for (const kBank of KNOWN_BANKS) {
    const key = getCanonicalBankKey(kBank);
    const userCard = userCards.find(c => getCanonicalBankKey(c.bankName) === key);
    if (userCard) {
      // If user owns this bank and it was mentioned in text, ensure it's displayed using the user's real card
      if (isBankInText(kBank, text) && !foundMap.has(key)) {
        resolveAndSetCard(userCard.bankName, undefined, userCard);
      }
    } else if (userCards.length === 0) {
      // Only inject unowned dummy cards if user has 0 cards registered in their entire wallet
      if (isBankInText(kBank, text) && !foundMap.has(key)) {
        resolveAndSetCard(kBank);
      }
    }
  }

  return Array.from(foundMap.values());
};
