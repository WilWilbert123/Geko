import { DeviceEventEmitter } from 'react-native';
import { getDb } from '../../database/sqlite';
import { uuidv4 } from '../../utils/uuid';
import { formatCurrency } from '../../utils/formatters';
import { getInstallmentImageUri } from '../../utils/installmentExtractor';
import { getGoalImageUri } from '../../utils/goalExtractor';
import { getBankTheme } from '../../utils/bankThemes';
import { getCanonicalBankKey } from '../../utils/cardExtractor';

const BANK_ALIASES: Record<string, string> = {
  gcash: 'GCash',
  'g-cash': 'GCash',
  'g cash': 'GCash',
  maya: 'Maya',
  paymaya: 'Maya',
  'pay-maya': 'Maya',
  'pay maya': 'Maya',
  gotyme: 'GoTyme',
  'go tyme': 'GoTyme',
  'go-tyme': 'GoTyme',
  'gotyme bank': 'GoTyme',
  maribank: 'MariBank',
  'mari bank': 'MariBank',
  'mari-bank': 'MariBank',
  seabank: 'SeaBank',
  'sea bank': 'SeaBank',
  'sea-bank': 'SeaBank',
  bdo: 'BDO',
  'bdo bank': 'BDO',
  'bdo unibank': 'BDO',
  bpi: 'BPI',
  'bpi bank': 'BPI',
  pnb: 'PNB',
  'pnb bank': 'PNB',
  unionbank: 'UnionBank',
  'union bank': 'UnionBank',
  ub: 'UnionBank',
  metrobank: 'Metrobank',
  'metro bank': 'Metrobank',
  rcbc: 'RCBC',
  'rcbc bank': 'RCBC',
  'security bank': 'Security Bank',
  securitybank: 'Security Bank',
  security: 'Security Bank',
  landbank: 'Landbank',
  'land bank': 'Landbank',
  eastwest: 'EastWest',
  'east west': 'EastWest',
  'eastwest bank': 'EastWest',
  chinabank: 'Chinabank',
  'china bank': 'Chinabank',
  cimb: 'CIMB Bank',
  'cimb bank': 'CIMB Bank',
  tonik: 'Tonik',
  'tonik bank': 'Tonik',
  ownbank: 'OwnBank',
  'own bank': 'OwnBank',
  komo: 'Komo',
  diskartech: 'DiskarTech',
  salmon: 'Salmon',
  uno: 'UNO Bank',
  'uno bank': 'UNO Bank',
  uniondigital: 'UnionDigital',
  'union digital': 'UnionDigital',
  ofbank: 'OFBank',
  netbank: 'Netbank',
  zed: 'Zed',
  wise: 'Wise',
  transferwise: 'Wise',
  grabpay: 'GrabPay',
  'grab pay': 'GrabPay',
  shopeepay: 'ShopeePay',
  'shopee pay': 'ShopeePay',
  shopee: 'ShopeePay',
  paypal: 'PayPal',
  'pay pal': 'PayPal',
  payoneer: 'Payoneer',
  hsbc: 'HSBC',
  'hsbc bank': 'HSBC',
  visa: 'Visa',
  mastercard: 'Mastercard',
  'physical cash': 'Physical Cash',
  cash: 'Physical Cash',
};

const normalizeBankName = (rawName: string): string => {
  const clean = rawName.trim().toLowerCase();
  if (BANK_ALIASES[clean]) return BANK_ALIASES[clean];
  for (const [key, val] of Object.entries(BANK_ALIASES)) {
    if (clean === key || clean.startsWith(key) || clean.includes(key)) return val;
  }
  return rawName.charAt(0).toUpperCase() + rawName.slice(1);
};

const getBankStyle = (bankName: string) => {
  const theme = getBankTheme(bankName);
  const lower = bankName.toLowerCase();
  let type: 'EWALLET' | 'BANK' | 'CASH' = 'BANK';
  if (lower.includes('cash') && !lower.includes('gcash')) {
    type = 'CASH';
  } else if (
    lower.includes('gcash') ||
    lower.includes('maya') ||
    lower.includes('grabpay') ||
    lower.includes('shopee') ||
    lower.includes('paypal') ||
    lower.includes('payoneer') ||
    lower.includes('wise')
  ) {
    type = 'EWALLET';
  }
  return {
    c1: theme.bg1,
    c2: theme.bg2,
    type,
    paymentNetwork: theme.network,
  };
};

const isTagalog = (text: string): boolean => {
  const lower = text.toLowerCase();
  return (
    lower.includes('magdagdag') ||
    lower.includes('dagdag') ||
    lower.includes('maglagay') ||
    lower.includes('lagyan') ||
    lower.includes('hulugan') ||
    lower.includes('ipon') ||
    lower.includes('kotse') ||
    lower.includes('bahay') ||
    lower.includes('ko') ||
    lower.includes('ako') ||
    lower.includes('meron') ||
    lower.includes('nako') ||
    lower.includes('kailangan') ||
    lower.includes('sa') ||
    lower.includes('ng') ||
    lower.includes('bago') ||
    lower.includes('bagong') ||
    lower.includes('gawa') ||
    lower.includes('gumawa')
  );
};

// In-memory store for last deleted item to support Undo
let lastDeletedItem: { table: 'goals' | 'cards' | 'installments'; data: any } | null = null;

export const processAIIntent = async (
  input: string
): Promise<{ executed: boolean; message?: string }> => {
  const text = input.trim();
  const lower = text.toLowerCase();
  const db = getDb();
  const tagalog = isTagalog(text);

  const isQuestionOrTutorial =
    lower.includes('?') ||
    lower.startsWith('how') ||
    lower.startsWith('paano') ||
    lower.startsWith('pano') ||
    lower.includes('how to') ||
    lower.includes('how do') ||
    lower.includes('paano mag') ||
    lower.includes('pano mag') ||
    lower.includes('tutorial') ||
    lower.includes('guide') ||
    lower.includes('who') ||
    lower.includes('sino') ||
    lower.includes('magkano') ||
    lower.includes('what is');

  // ── 0. RESET / CLEAR DATA INTENT ──────────────────────────────
  if (
    lower.includes('reset data') ||
    lower.includes('clear data') ||
    lower.includes('clear records') ||
    lower.includes('reset all') ||
    lower.includes('clear all') ||
    lower.includes('burahin lahat') ||
    lower.includes('fresh start')
  ) {
    try {
      await db.execute('DELETE FROM cards');
      await db.execute('DELETE FROM transactions');
      await db.execute('DELETE FROM goals');
      await db.execute('DELETE FROM installments');
      await db.execute('DELETE FROM budgets');

      lastDeletedItem = null;

      DeviceEventEmitter.emit('transactions_updated');
      DeviceEventEmitter.emit('goals_updated');
      DeviceEventEmitter.emit('installments_updated');

      return {
        executed: true,
        message: tagalog
          ? '🧹 Na-reset at na-clear na ang lahat ng records! Fresh slate na si Geko para sa mga bagong accounts, goals, at transactions mo.'
          : '🧹 Cleared all records! Geko is now starting fresh with a clean slate for your accounts, goals, and transactions.',
      };
    } catch (e) {
      console.error('Failed to reset data:', e);
    }
  }

  // ── 0.5. UNDO INTENT ───────────────────────────────────────────
  if (
    lower === 'undo' ||
    lower.includes('i-undo') ||
    lower.includes('undo delete') ||
    lower.includes('undo remove') ||
    lower.includes('ibalik') ||
    lower.includes('restore')
  ) {
    if (lastDeletedItem) {
      try {
        const item = lastDeletedItem;
        if (item.table === 'goals') {
          const g = item.data;
          await db.execute(
            'INSERT INTO goals (id, title, current, target, targetDate, iconName, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [g.id, g.title, g.current, g.target, g.targetDate || 'Dec 2026', g.iconName || 'Target', g.imageUrl || null]
          );
          DeviceEventEmitter.emit('goals_updated');
          lastDeletedItem = null;
          return {
            executed: true,
            message: tagalog
              ? `↩️ Na-undo na! Naibalik ang **${g.title}** goal.`
              : `↩️ Undo successful! Restored the **${g.title}** goal.`,
          };
        } else if (item.table === 'cards') {
          const c = item.data;
          await db.execute(
            'INSERT INTO cards (id, bankName, balance, color1, color2, cardNumber, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [c.id, c.bankName, c.balance, c.color1, c.color2, c.cardNumber, c.type]
          );
          DeviceEventEmitter.emit('transactions_updated');
          lastDeletedItem = null;
          return {
            executed: true,
            message: tagalog
              ? `↩️ Na-undo na! Naibalik ang **${c.bankName}** account.`
              : `↩️ Undo successful! Restored the **${c.bankName}** account.`,
          };
        } else if (item.table === 'installments') {
          const inst = item.data;
          await db.execute(
            'INSERT INTO installments (id, title, totalAmount, monthlyAmount, totalMonths, paidMonths, startDate, nextCutoff, status, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [inst.id, inst.title, inst.totalAmount, inst.monthlyAmount, inst.totalMonths, inst.paidMonths, inst.startDate, inst.nextCutoff, inst.status, inst.imageUrl || null]
          );
          DeviceEventEmitter.emit('installments_updated');
          lastDeletedItem = null;
          return {
            executed: true,
            message: tagalog
              ? `↩️ Na-undo na! Naibalik ang **${inst.title}** installment.`
              : `↩️ Undo successful! Restored the **${inst.title}** installment.`,
          };
        }
      } catch (e) {
        console.error('Failed to undo deletion:', e);
      }
    }
    return {
      executed: true,
      message: tagalog
        ? '↩️ Walang item na pwedeng i-undo.'
        : '↩️ No recent deletion to undo.',
    };
  }

  // ── 0.8. DELETE GOAL INTENT ────────────────────────────────────
  if (
    lower.includes('delete') ||
    lower.includes('remove') ||
    lower.includes('burahin') ||
    lower.includes('alisin') ||
    lower.includes('tanggalin')
  ) {
    if (lower.includes('goal') || lower.includes('drone') || lower.includes('onexplayer') || lower.includes('oneplayer') || lower.includes('car') || lower.includes('house') || lower.includes('iphone') || lower.includes('laptop') || lower.includes('macbook') || lower.includes('ps5')) {
      try {
        const res = await db.execute('SELECT * FROM goals');
        const goals = res.rows?._array || [];
        if (goals.length > 0) {
          // Find matching goal
          const targetGoal = goals.find((g: any) => {
            const gTitle = (g.title || '').toLowerCase();
            return (
              (lower.includes('drone') && gTitle.includes('drone')) ||
              ((lower.includes('onexplayer') || lower.includes('oneplayer')) && (gTitle.includes('onexplayer') || gTitle.includes('oneplayer'))) ||
              (lower.includes('car') && (gTitle.includes('car') || gTitle.includes('kotse'))) ||
              (lower.includes('house') && (gTitle.includes('house') || gTitle.includes('bahay'))) ||
              (lower.includes('iphone') && gTitle.includes('iphone')) ||
              (lower.includes('macbook') && gTitle.includes('macbook')) ||
              (lower.includes('laptop') && gTitle.includes('laptop')) ||
              (lower.includes('ps5') && gTitle.includes('ps5')) ||
              gTitle.includes(lower.replace(/\b(delete|remove|burahin|alisin|tanggalin|my|goal)\b/gi, '').trim())
            );
          });

          if (targetGoal) {
            lastDeletedItem = { table: 'goals', data: targetGoal };
            await db.execute('DELETE FROM goals WHERE id = ?', [targetGoal.id]);
            DeviceEventEmitter.emit('goals_updated');
            return {
              executed: true,
              message: tagalog
                ? `🗑️ Goal Deleted! Na-delete ang **${targetGoal.title}** goal. *(I-type ang "undo" kung gustong ibalik.)*`
                : `🗑️ Goal Deleted! Removed **${targetGoal.title}** goal. *(Type "undo" if you want to restore it.)*`,
            };
          }
        }
      } catch (e) {
        console.error('Failed to delete goal intent:', e);
      }
    }
  }

  // ── 0.9. UPDATE GOAL INTENT ────────────────────────────────────
  if (
    lower.includes('update') ||
    lower.includes('baguhin') ||
    lower.includes('bago') ||
    lower.includes('change') ||
    lower.includes('dagdagan') ||
    lower.includes('bawasan') ||
    lower.includes('palitan') ||
    lower.includes('savings to') ||
    lower.includes('ipon to')
  ) {
    if (lower.includes('goal') || lower.includes('drone') || lower.includes('onexplayer') || lower.includes('oneplayer') || lower.includes('car') || lower.includes('house') || lower.includes('iphone') || lower.includes('laptop') || lower.includes('macbook') || lower.includes('ps5') || lower.includes('savings') || lower.includes('ipon')) {
      try {
        const res = await db.execute('SELECT * FROM goals');
        const goals = res.rows?._array || [];
        if (goals.length > 0) {
          const targetGoal = goals.find((g: any) => {
            const gTitle = (g.title || '').toLowerCase();
            return (
              (lower.includes('drone') && gTitle.includes('drone')) ||
              ((lower.includes('onexplayer') || lower.includes('oneplayer')) && (gTitle.includes('onexplayer') || gTitle.includes('oneplayer'))) ||
              (lower.includes('car') && (gTitle.includes('car') || gTitle.includes('kotse'))) ||
              (lower.includes('house') && (gTitle.includes('house') || gTitle.includes('bahay'))) ||
              (lower.includes('iphone') && gTitle.includes('iphone')) ||
              (lower.includes('macbook') && gTitle.includes('macbook')) ||
              (lower.includes('laptop') && gTitle.includes('laptop')) ||
              (lower.includes('ps5') && gTitle.includes('ps5')) ||
              (gTitle.length >= 3 && lower.includes(gTitle))
            );
          });

          if (targetGoal) {
            const numMatches = text.match(/(\d+[\d,]*\.?\d*)/g);
            if (numMatches && numMatches.length > 0) {
              const numbers = numMatches.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0);
              const pureFinNumbers = numbers.filter(n => n >= 100);
              const val = pureFinNumbers.length > 0 ? pureFinNumbers[0] : numbers[0];

              const isTargetUpdate = lower.includes('target') || lower.includes('price') || lower.includes('halaga') || lower.includes('kabuuan') || lower.includes('total');

              if (isTargetUpdate) {
                await db.execute('UPDATE goals SET target = ? WHERE id = ?', [val, targetGoal.id]);
                DeviceEventEmitter.emit('goals_updated');
                return {
                  executed: true,
                  message: tagalog
                    ? `🎯 Target Updated! Na-update ang target ng **${targetGoal.title}** to **${formatCurrency(val)}** (Naka-ipon: **${formatCurrency(targetGoal.current)}**).`
                    : `🎯 Target Updated! Updated target for **${targetGoal.title}** to **${formatCurrency(val)}** (Current Savings: **${formatCurrency(targetGoal.current)}**).`,
                };
              } else {
                let newSavings = val;
                if (lower.includes('dagdag') || lower.includes('add')) {
                  newSavings = Number(targetGoal.current || 0) + val;
                }
                await db.execute('UPDATE goals SET current = ? WHERE id = ?', [newSavings, targetGoal.id]);
                DeviceEventEmitter.emit('goals_updated');
                return {
                  executed: true,
                  message: tagalog
                    ? `🎯 Savings Updated! Na-update ang ipon sa **${targetGoal.title}** to **${formatCurrency(newSavings)}** (Target: **${formatCurrency(targetGoal.target)}**).`
                    : `🎯 Savings Updated! Updated savings for **${targetGoal.title}** to **${formatCurrency(newSavings)}** (Target: **${formatCurrency(targetGoal.target)}**).`,
                };
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to process update goal intent:', e);
      }
    }
  }

  // ── 1. ACCOUNT / BANK / CASH BALANCE INTENT ──────────────────
  // Matches phrases like:
  // "add new card maribank 500", "add new card maya 2500", "add 300 to my gotyme"
  // "create card bdo 1000", "add account 2000 gcash", "lagyan ng 500 ang maribank"
  const isCardKeyword =
    lower.includes('card') ||
    lower.includes('kard') ||
    lower.includes('account') ||
    lower.includes('akawnt') ||
    lower.includes('wallet');

  const isBankKeyword = Object.keys(BANK_ALIASES).some(alias => {
    if (alias === 'cash') {
      return /\bcash\b/i.test(lower) && !/\bgcash\b/i.test(lower);
    }
    return lower.includes(alias);
  });

  const isActionVerb =
    lower.includes('add') ||
    lower.includes('magdagdag') ||
    lower.includes('dagdag') ||
    lower.includes('maglagay') ||
    lower.includes('lagay') ||
    lower.includes('lagyan') ||
    lower.includes('set') ||
    lower.includes('palitan') ||
    lower.includes('create') ||
    lower.includes('gumawa') ||
    lower.includes('gawa') ||
    lower.includes('rehistro') ||
    lower.includes('register') ||
    lower.includes('new') ||
    lower.includes('bago') ||
    lower.includes('bagong');

  const isExcluded =
    lower.includes('goal') ||
    lower.includes('layunin') ||
    lower.includes('installment') ||
    lower.includes('hulugan') ||
    lower.includes('monthly') ||
    isQuestionOrTutorial;

  const isAccountIntent = (isCardKeyword || isBankKeyword) && isActionVerb && !isExcluded;

  if (isAccountIntent) {
    // Extract numbers (amount)
    const numMatches = text.match(/(\d+[\d,]*\.?\d*)/g);
    if (numMatches && numMatches.length > 0) {
      const numbers = numMatches.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0);
      const amount = numbers[0];

      // Extract bank keyword
      let rawBank = '';

      // Pattern 1: Explicit card/account phrase, e.g.:
      // "add new card maribank 500", "add card GoTyme 1000", "create new card Citibank 2000"
      const cardNamePattern = /(?:add|create|new|magdagdag|maglagay|dagdag|lagyan|gumawa)\s+(?:ng\s+)?(?:new\s+|bagong\s+)?(?:card|account|kard|wallet)\s+([A-Za-z0-9\s&-]+?)(?:\s+(?:with|na may|amount|balance|ng|sa)?\s*(?:₱|p)?\s*\d+|$)/i;
      const cardMatch = text.match(cardNamePattern);
      if (cardMatch && cardMatch[1]) {
        const candidate = cardMatch[1].trim();
        if (candidate.length > 0 && candidate.length <= 30) {
          rawBank = candidate;
        }
      }

      // Pattern 2: Scan known bank aliases (longest first so 'security bank' matches before 'security')
      if (!rawBank) {
        const sortedAliases = Object.keys(BANK_ALIASES).sort((a, b) => b.length - a.length);
        for (const alias of sortedAliases) {
          if (alias === 'cash') {
            if (/\bcash\b/i.test(lower) && !/\bgcash\b/i.test(lower)) {
              rawBank = 'Physical Cash';
              break;
            }
          } else {
            const escaped = alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            if (new RegExp(`\\b${escaped}\\b`, 'i').test(lower) || lower.includes(alias)) {
              rawBank = alias;
              break;
            }
          }
        }
      }

      // Pattern 3: Check if any existing card in DB matches
      if (!rawBank) {
        try {
          const existingCardsRes = await db.execute('SELECT bankName FROM cards');
          const existingCards = existingCardsRes.rows?._array || [];
          for (const ec of existingCards) {
            if (ec.bankName && lower.includes(ec.bankName.toLowerCase())) {
              rawBank = ec.bankName;
              break;
            }
          }
        } catch (e) { }
      }

      if (!rawBank) {
        rawBank = 'GCash';
      }

      const bankName = normalizeBankName(rawBank);
      const style = getBankStyle(bankName);

      try {
        const existingRes = await db.execute(
          'SELECT * FROM cards WHERE LOWER(bankName) = LOWER(?)',
          [bankName]
        );
        let existing = existingRes.rows?._array && existingRes.rows._array.length > 0 ? existingRes.rows._array[0] : null;

        if (!existing) {
          const allCardsRes = await db.execute('SELECT * FROM cards');
          const allCards = allCardsRes.rows?._array || [];
          const targetKey = getCanonicalBankKey(bankName);
          existing = allCards.find((c: any) => getCanonicalBankKey(c.bankName) === targetKey) || null;
        }

        const date = Date.now();
        const isSetOnly = lower.includes('set') || lower.includes('palitan to') || lower.includes('gawing');
        let finalBalance = amount;

        if (existing) {
          finalBalance = isSetOnly ? amount : Number(existing.balance || 0) + amount;
          await db.execute('UPDATE cards SET balance = ? WHERE id = ?', [finalBalance, existing.id]);
          await db.execute(
            'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), amount, date, 'Deposit', 'income', `Deposit to ${bankName}`, bankName]
          );
        } else {
          finalBalance = amount;
          const cardId = uuidv4();
          const cardNum = `**** ${Math.floor(1000 + Math.random() * 9000)}`;
          await db.execute(
            'INSERT INTO cards (id, bankName, balance, color1, color2, cardNumber, budget, type, paymentNetwork) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [cardId, bankName, amount, style.c1, style.c2, cardNum, 0, style.type, style.paymentNetwork || 'MASTERCARD']
          );
          await db.execute(
            'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), amount, date, 'Deposit', 'income', `Initial Deposit`, bankName]
          );
        }

        DeviceEventEmitter.emit('transactions_updated');

        return {
          executed: true,
          message: existing
            ? (tagalog
                ? `💳 Naidagdag na ang **${formatCurrency(amount)}** sa iyong **${bankName}** account! Ang kabuuang balance mo ngayon ay **${formatCurrency(finalBalance)}**.`
                : `💳 Added **${formatCurrency(amount)}** to your **${bankName}** account! Total balance is now **${formatCurrency(finalBalance)}**.`)
            : (tagalog
                ? `💳 Naisagawa na! Na-create ang **${bankName}** account na may panimulang balance na **${formatCurrency(finalBalance)}**.`
                : `💳 Success! Created **${bankName}** account with **${formatCurrency(finalBalance)}** balance.`),
        };
      } catch (e) {
        console.error('Failed to process account intent:', e);
      }
    }
  }

  // ── 2. GOAL INTENT ─────────────────────────────────────────────
  // Matches single or multiple goals:
  // "add a goal car i have starting 5000 savings and total of this car is 350000"
  // "Add a goal OneXplayer 40000 my savings na ako 10000 at add another goal Drone DJI neo 2 25000 price meron akong savings na 9000"
  // "Onexplayer price 40000 and savings 10000 done dji neo 2 price 25000 savings 9000"
  if (
    !isQuestionOrTutorial &&
    (lower.includes('goal') ||
      lower.includes('layunin') ||
      lower.includes('onexplayer') ||
      lower.includes('oneplayer') ||
      lower.includes('drone') ||
      (lower.includes('ipon') && (lower.includes('target') || lower.includes('kotse') || lower.includes('car') || lower.includes('bahay') || lower.includes('house'))))
  ) {
    // Helper to split text into distinct goal clauses
    const splitGoalClauses = (rawText: string): string[] => {
      const majorDelimiter = /\b(done|add another goal|another goal|add another|isa pang goal|next goal|mag add ka ulit ng goal|mag add ka ulit|dagdag ulit ng goal|dagdag panibagong goal|at mag add|and mag add|tapos mag add)\b/i;
      
      const clauses: string[] = [];
      let initialChunks: string[] = [];

      if (majorDelimiter.test(rawText)) {
        const parts = rawText.split(majorDelimiter);
        for (const p of parts) {
          if (!p.trim() || majorDelimiter.test(p)) continue;
          initialChunks.push(p.trim());
        }
      } else {
        initialChunks.push(rawText.trim());
      }

      for (const chunk of initialChunks) {
        const itemRegex = /\b(drone|dji|onexplayer|oneplayer|car|kotse|house|bahay|iphone|cellphone|macbook|laptop|ps5)\b/gi;
        const matches = Array.from(chunk.matchAll(itemRegex));

        if (matches.length > 1) {
          let lastIdx = 0;
          for (let i = 1; i < matches.length; i++) {
            const m = matches[i];
            if (m.index !== undefined) {
              const sub = chunk.substring(lastIdx, m.index);
              const splitMatch = sub.match(/\b(and|at|tapos|,)\b/i);
              if (splitMatch && splitMatch.index !== undefined) {
                clauses.push(chunk.substring(lastIdx, lastIdx + splitMatch.index).trim());
                lastIdx = lastIdx + splitMatch.index;
              } else {
                clauses.push(chunk.substring(lastIdx, m.index).trim());
                lastIdx = m.index;
              }
            }
          }
          if (lastIdx < chunk.length) {
            clauses.push(chunk.substring(lastIdx).trim());
          }
        } else {
          clauses.push(chunk);
        }
      }

      return clauses.filter(c => c.trim().length > 0);
    };

    const clauses = splitGoalClauses(text);
    const createdGoals: { title: string; target: number; current: number }[] = [];

    for (const clause of clauses) {
      const cLower = clause.toLowerCase();
      const numMatches = clause.match(/(\d+[\d,]*\.?\d*)/g);
      if (!numMatches || numMatches.length === 0) continue;

      const numbers = numMatches
        .map(n => parseFloat(n.replace(/,/g, '')))
        .filter(n => !isNaN(n) && n > 0);

      if (numbers.length === 0) continue;

      // Filter numbers >= 100 to ignore model numbers like '2' in 'DJI Neo 2', and ignore Year numbers (2024 - 2035)
      const isYear = (n: number) => n >= 2024 && n <= 2035;
      const pureFinNumbers = numbers.filter(n => n >= 100 && !isYear(n));
      const finNumbers = pureFinNumbers.length > 0 ? pureFinNumbers : numbers.filter(n => !isYear(n));

      let target = 0;
      let current = 0;

      if (finNumbers.length >= 2) {
        // Larger number is ALWAYS the target price; smaller is ALWAYS the current savings
        target = Math.max(...finNumbers);
        current = Math.min(...finNumbers);
      } else if (finNumbers.length === 1) {
        const val = finNumbers[0];
        const isSavingsCtx = cLower.includes('savings') || cLower.includes('ipon') || cLower.includes('meron') || cLower.includes('have') || cLower.includes('nako') || cLower.includes('starting');
        if (isSavingsCtx) {
          current = val;
          target = val;
        } else {
          target = val;
          current = 0;
        }
      }

      if (target <= 0) continue;

      // Clean title determination
      let title = 'New Goal';
      if (cLower.includes('onexplayer') || cLower.includes('one xplayer') || cLower.includes('oneplayer') || cLower.includes('one player') || cLower.includes('onex')) {
        title = 'OneXplayer';
      } else if (cLower.includes('drone') || cLower.includes('dji') || cLower.includes('neo') || cLower.includes('done dji')) {
        if (cLower.includes('dji') || cLower.includes('neo')) {
          title = 'Drone DJI Neo 2';
        } else {
          title = 'Drone';
        }
      } else if (cLower.includes('car') || cLower.includes('kotse')) {
        title = 'Car';
      } else if (cLower.includes('house') || cLower.includes('bahay')) {
        title = 'House';
      } else if (cLower.includes('iphone') || cLower.includes('cellphone') || cLower.includes('phone')) {
        if (cLower.includes('11')) title = 'iPhone 11';
        else if (cLower.includes('iphone')) title = 'iPhone';
        else title = 'Cellphone';
      } else if (cLower.includes('macbook') || cLower.includes('laptop')) {
        title = 'MacBook';
      } else if (cLower.includes('ps5') || cLower.includes('playstation')) {
        title = 'PS5';
      } else if (cLower.includes('emergency')) {
        title = 'Emergency Fund';
      } else {
        const cleanWords = clause
          .replace(/\b(mag|magadd|mag-add|ka|ng|mo|pa|isang|is|are|of|to|for|this|that|it|its|add|another|a|an|the|goal|layunin|i|have|savings|and|at|tapos|done|meron|akong|halaga|target|price|cost|worth|total|ipon|umpisang|my|na|ako)\b/gi, '')
          .trim();
        const candidate = cleanWords.split(/\s+/).find(w => w.length >= 3 && !/\d/.test(w));
        if (candidate) {
          title = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        }
      }

      const id = uuidv4();
      const imageUrl = getGoalImageUri({ title } as any);
      let iconName = 'Target';
      if (title.toLowerCase().includes('car') || title.toLowerCase().includes('kotse')) iconName = 'Car';
      else if (title.toLowerCase().includes('house') || title.toLowerCase().includes('bahay')) iconName = 'Home';
      else if (title.toLowerCase().includes('laptop') || title.toLowerCase().includes('macbook') || title.toLowerCase().includes('phone') || title.toLowerCase().includes('onexplayer') || title.toLowerCase().includes('iphone')) iconName = 'Laptop';
      else if (title.toLowerCase().includes('drone') || title.toLowerCase().includes('trip') || title.toLowerCase().includes('plane')) iconName = 'Plane';

      try {
        await db.execute(
          'INSERT INTO goals (id, title, current, target, targetDate, iconName, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, title, current, target, 'Dec 2026', iconName, imageUrl]
        );
        createdGoals.push({ title, target, current });
      } catch (e) {
        console.error('Failed to insert goal:', e);
      }
    }

    if (createdGoals.length > 0) {
      DeviceEventEmitter.emit('goals_updated');

      let replyMsg = '';
      if (createdGoals.length === 1) {
        const g = createdGoals[0];
        replyMsg = tagalog
          ? `🎯 Goal Created! Nalikha ang **${g.title}** goal (Target: **${formatCurrency(g.target)}**, Umpisang Ipon: **${formatCurrency(g.current)}**).`
          : `🎯 Goal Created! Added **${g.title}** (Target: **${formatCurrency(g.target)}**, Current Savings: **${formatCurrency(g.current)}**).`;
      } else {
        replyMsg = tagalog
          ? `🎯 Nalikha ang ${createdGoals.length} na mga Goal!\n` + createdGoals.map((g, i) => `${i + 1}. **${g.title}** (Target: **${formatCurrency(g.target)}**, Umpisang Ipon: **${formatCurrency(g.current)}**)`).join('\n')
          : `🎯 Created ${createdGoals.length} Savings Goals!\n` + createdGoals.map((g, i) => `${i + 1}. **${g.title}** (Target: **${formatCurrency(g.target)}**, Starting Savings: **${formatCurrency(g.current)}**)`).join('\n');
      }

      return {
        executed: true,
        message: replyMsg,
      };
    }
  }

  // ── 3. INSTALLMENT INTENT ──────────────────────────────────────
  // Matches:
  // "add a installment cellphone iphone 118000 ny current savings is 20000"
  // "magdagdag ng hulugan cellphone iphone 118000 tapos meron nako 20000"
  if (
    lower.includes('installment') ||
    lower.includes('hulugan') ||
    lower.includes('hulugang')
  ) {
    const numMatches = text.match(/(\d+[\d,]*\.?\d*)/g);
    if (numMatches && numMatches.length > 0) {
      const numbers = numMatches.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0);
      const pureFinNumbers = numbers.filter(n => n >= 100);
      const finNumbers = pureFinNumbers.length > 0 ? pureFinNumbers : numbers;

      if (finNumbers.length > 0) {
        const totalAmount = Math.max(...finNumbers);
        let currentSavings = 0;
        if (finNumbers.length >= 2) {
          currentSavings = Math.min(...finNumbers);
        }

        let totalMonths = 12; // default
        if (lower.includes('24 month') || lower.includes('24 buwan')) totalMonths = 24;
        else if (lower.includes('6 month') || lower.includes('6 buwan')) totalMonths = 6;
        else if (lower.includes('36 month')) totalMonths = 36;

        const monthlyAmount = Math.round((totalAmount / totalMonths) * 100) / 100;
        const paidMonths = Math.min(totalMonths, Math.floor((currentSavings / totalAmount) * totalMonths));

        let title = 'Installment Item';
        if (lower.includes('iphone') || lower.includes('cellphone') || lower.includes('phone')) {
          title = lower.includes('iphone') ? 'iPhone Cellphone' : 'Cellphone';
        } else if (lower.includes('motor') || lower.includes('motorcycle')) {
          title = 'Motorcycle';
        } else if (lower.includes('laptop') || lower.includes('macbook')) {
          title = 'Laptop';
        } else if (lower.includes('tv') || lower.includes('television')) {
          title = 'Smart TV';
        } else {
          // Extract words between installment and numbers
          const words = text.split(/\s+/);
          const instIdx = words.findIndex(w => w.toLowerCase().includes('installment') || w.toLowerCase().includes('hulugan'));
          if (instIdx >= 0 && instIdx + 1 < words.length) {
            const chunk = words.slice(instIdx + 1, instIdx + 3).join(' ').replace(/[^a-zA-Z0-9\s]/g, '');
            if (chunk && chunk.length > 2 && !/\d/.test(chunk)) {
              title = chunk;
            }
          }
        }

        try {
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

          const now = Date.now();
          const nextCutoff = now + 30 * 86400000;
          const id = uuidv4();
          const resolvedImage = getInstallmentImageUri({ title } as any);

          await db.execute(
            'INSERT INTO installments (id, title, totalAmount, monthlyAmount, totalMonths, paidMonths, startDate, nextCutoff, status, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, title, totalAmount, monthlyAmount, totalMonths, paidMonths, now, nextCutoff, 'active', resolvedImage]
          );

          DeviceEventEmitter.emit('installments_updated');

          return {
            executed: true,
            message: tagalog
              ? `📱 Na-add ang Hulugan! ${title} (Kabuuan: ${formatCurrency(totalAmount)}, Buwanan: ${formatCurrency(monthlyAmount)}/mo, Naka-ipon/Bayad: ${formatCurrency(currentSavings)}).`
              : `📱 Installment Added! ${title} (Total: ${formatCurrency(totalAmount)}, Monthly: ${formatCurrency(monthlyAmount)}/mo, Paid/Saved: ${formatCurrency(currentSavings)}).`,
          };
        } catch (e) {
          console.error('Failed to process installment intent:', e);
        }
      }
    }
  }

  // ── 3.5. DEBT / UTANG / LIABILITIES INTENT ──────────────────────
  // Matches:
  // "add debt to cham 1500", "utang kay cham 1500", "debt 1500 to cham", "add utang 1500 kay cham", "pautang kay cham 1500"
  const isDebtIntent =
    !isQuestionOrTutorial &&
    (/\b(?:debt|utang|loan|pautang|hiram|borrow|borrowed|owe|owed)\b/i.test(lower) ||
      lower.includes('add debt') ||
      lower.includes('add utang') ||
      lower.includes('may utang') ||
      lower.includes('nagka-utang') ||
      lower.includes('nagpautang'));

  if (isDebtIntent) {
    const numMatches = text.match(/(?:[p₱]\s*)?\b\d+(?:,\d{3})*(?:\.\d{1,2})?(?:k)?\b/gi);
    if (numMatches && numMatches.length > 0) {
      let amount = 0;
      for (const m of numMatches) {
        let cleanVal = m.replace(/[p₱,\s]/gi, '').toLowerCase();
        let val = 0;
        if (cleanVal.endsWith('k')) {
          val = parseFloat(cleanVal.slice(0, -1)) * 1000;
        } else {
          val = parseFloat(cleanVal);
        }
        if (val > amount) amount = val;
      }

      if (amount > 0) {
        // Extract counterparty / person name
        const targetMatch = text.match(/(?:to|kay|kina|from|galing\s+kay|galing\s+sa)\s+([a-zA-Z0-9_\-]+)/i);
        let person = targetMatch ? targetMatch[1].trim() : '';
        if (/^(?:my|the|a|an|ang|mga|sa|ko|mo|natin|namin|account|card|bank)$/i.test(person)) {
          person = '';
        }
        const formattedPerson = person ? person.charAt(0).toUpperCase() + person.slice(1) : '';

        const isLent = lower.includes('pautang') || lower.includes('nagpautang') || lower.includes('lent');
        let note = isLent
          ? (formattedPerson ? `Pautang kay ${formattedPerson}` : 'Pautang')
          : (formattedPerson ? `Debt to ${formattedPerson}` : 'Utang / Debt');

        // Check if user explicitly mentioned a bank / payment method
        let bankName = 'Personal Debt';
        const sortedAliases = Object.keys(BANK_ALIASES).sort((a, b) => b.length - a.length);
        for (const alias of sortedAliases) {
          if (alias === 'cash') {
            if (/\bcash\b/i.test(lower) && !/\bgcash\b/i.test(lower)) {
              bankName = 'Physical Cash';
              break;
            }
          } else {
            const escaped = alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            if (new RegExp(`\\b${escaped}\\b`, 'i').test(lower)) {
              bankName = normalizeBankName(alias);
              break;
            }
          }
        }

        try {
          const id = uuidv4();
          const now = Date.now();
          await db.execute(
            'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, amount, now, 'Debt', 'expense', note, bankName]
          );

          if (bankName !== 'Personal Debt') {
            await db.execute('UPDATE cards SET balance = balance - ? WHERE LOWER(bankName) = LOWER(?)', [amount, bankName]);
          }

          DeviceEventEmitter.emit('transactions_updated');

          const replyMsg = tagalog
            ? `📋 Naitala ang utang: **${note}** (**${formatCurrency(amount)}**). Naidagdag na ito sa iyong **Debt & Payoff Tracker** nang hindi binabawasan ang iyong mga bank card!`
            : `📋 Recorded debt: **${note}** (**${formatCurrency(amount)}**). Added to your **Debt & Payoff Tracker** without affecting your bank cards!`;

          return {
            executed: true,
            message: replyMsg,
          };
        } catch (e) {
          console.error('Failed to process debt intent:', e);
        }
      }
    }
  }

  // ── 4. EXPENSE / INCOME TRANSACTION INTENT ─────────────────────
  // Matches:
  // "bought coffee 150 from gcash", "bili ng coffee 190 sa gotyme", "tshirt 300 bdo", "sweldo 25000"
  if (
    lower.includes('bought') ||
    lower.includes('bili') ||
    lower.includes('gastos') ||
    lower.includes('spent') ||
    lower.includes('sweldo') ||
    lower.includes('salary') ||
    lower.includes('coffee') ||
    lower.includes('tshirt') ||
    lower.includes('food') ||
    lower.includes('dinner') ||
    lower.includes('lunch')
  ) {
    const numMatches = text.match(/(\d+[\d,]*\.?\d*)/g);
    if (numMatches && numMatches.length > 0) {
      const amount = parseFloat(numMatches[0].replace(/,/g, ''));
      if (amount > 0) {
        const isIncome = lower.includes('sweldo') || lower.includes('salary') || lower.includes('income') || lower.includes('deposit');
        
        let bankName = 'GCash';
        const sortedAliases = Object.keys(BANK_ALIASES).sort((a, b) => b.length - a.length);
        for (const alias of sortedAliases) {
          if (alias === 'cash') {
            if (/\bcash\b/i.test(lower) && !/\bgcash\b/i.test(lower)) {
              bankName = 'Physical Cash';
              break;
            }
          } else {
            const escaped = alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            if (new RegExp(`\\b${escaped}\\b`, 'i').test(lower) || lower.includes(alias)) {
              bankName = normalizeBankName(alias);
              break;
            }
          }
        }

        let categoryId = isIncome ? 'Salary' : 'Shopping';
        if (lower.includes('coffee') || lower.includes('food') || lower.includes('kape') || lower.includes('dinner') || lower.includes('lunch')) {
          categoryId = 'Food';
        }

        let note = categoryId;
        if (lower.includes('coffee') || lower.includes('kape')) note = 'Coffee';
        else if (lower.includes('tshirt') || lower.includes('t-shirt')) note = 'Tshirt';
        else if (lower.includes('sweldo') || lower.includes('salary')) note = 'Salary';

        try {
          const date = Date.now();
          await db.execute(
            'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), amount, date, categoryId, isIncome ? 'income' : 'expense', note, bankName]
          );

          if (isIncome) {
            await db.execute('UPDATE cards SET balance = balance + ? WHERE LOWER(bankName) = LOWER(?)', [amount, bankName]);
          } else {
            await db.execute('UPDATE cards SET balance = balance - ? WHERE LOWER(bankName) = LOWER(?)', [amount, bankName]);
          }

          const cardRes = await db.execute('SELECT balance FROM cards WHERE LOWER(bankName) = LOWER(?)', [bankName]);
          const newBal = cardRes.rows?._array?.[0]?.balance;
          const balSuffix = newBal !== undefined 
            ? (tagalog ? ` (Bagong balance sa **${bankName}**: **${formatCurrency(Number(newBal))}**)` : ` (New **${bankName}** balance: **${formatCurrency(Number(newBal))}**)`)
            : '';

          DeviceEventEmitter.emit('transactions_updated');

          return {
            executed: true,
            message: tagalog
              ? `💸 Na-record ang ${isIncome ? 'kikitain' : 'gastos'}: **${note}** (**${formatCurrency(amount)}**) sa **${bankName}**.${balSuffix}`
              : `💸 Recorded ${isIncome ? 'income' : 'expense'}: **${note}** (**${formatCurrency(amount)}**) via **${bankName}**.${balSuffix}`,
          };
        } catch (e) {
          console.error('Failed to process transaction intent:', e);
        }
      }
    }
  }

  return { executed: false };
};
