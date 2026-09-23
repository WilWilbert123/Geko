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

    // 1. Match against user's actual cards in DB using word boundary
    const cardMatch = userCards.find(
      c => c.bankName.toLowerCase() === cleanStr || isBankInText(c.bankName, cleanStr)
    );
    if (cardMatch) {
      return { canonicalName: cardMatch.bankName, matchedCard: cardMatch };
    }

    // 2. Match against known bank list
    const knownMatch = KNOWN_BANKS.find(
      b => b.toLowerCase() === cleanStr || isBankInText(b, cleanStr)
    );
    if (knownMatch) {
      return { canonicalName: knownMatch };
    }

    return null;
  };

  const resolveAndSetCard = (bankName: string, parsedBal?: number, matchedCard?: Card) => {
    const key = bankName.toLowerCase();
    const theme = getBankTheme(bankName, matchedCard?.color1, matchedCard?.color2);

    const balance = parsedBal !== undefined && !isNaN(parsedBal)
      ? parsedBal
      : matchedCard
        ? (matchedCard.type === 'CREDIT_CARD' ? (matchedCard.outstandingBalance || 0) : matchedCard.balance)
        : 0;

    if (foundMap.has(key)) {
      // Deduplicate: Update balance on existing card entry if valid
      const existing = foundMap.get(key)!;
      if (parsedBal !== undefined && !isNaN(parsedBal)) {
        existing.balance = parsedBal;
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

  // 2. Sentence balance pattern (e.g. "balance sa GCash: ₱280.00" or "Natitirang balance sa GCash: ₱280.00")
  const sentenceRegex = /(?:balance|natitirang balance|remaining|owed)\s+(?:sa|in|on|for|from)?\s*([A-Za-z0-9]+)\s*[:=–-]?\s*₱?\s*([\d,]+(?:\.\d+)?)/gi;
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
    const bName = card.bankName.toLowerCase();
    if (isBankInText(card.bankName, text) && !foundMap.has(bName)) {
      resolveAndSetCard(card.bankName, undefined, card);
    }
  }

  for (const kBank of KNOWN_BANKS) {
    const key = kBank.toLowerCase();
    if (isBankInText(kBank, text) && !foundMap.has(key)) {
      resolveAndSetCard(kBank);
    }
  }

  return Array.from(foundMap.values());
};
