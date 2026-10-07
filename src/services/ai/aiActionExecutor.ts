import { DeviceEventEmitter } from 'react-native';
import { getDb } from '../../database/sqlite';
import { uuidv4 } from '../../utils/uuid';
import { formatCurrency } from '../../utils/formatters';
import { getInstallmentImageUri } from '../../utils/installmentExtractor';
import { getGoalImageUri } from '../../utils/goalExtractor';

const BANK_ALIASES: Record<string, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  gotyme: 'GoTyme',
  cash: 'Physical Cash',
  'physical cash': 'Physical Cash',
  bdo: 'BDO',
  bpi: 'BPI',
  pnb: 'PNB',
  unionbank: 'UnionBank',
  ub: 'UnionBank',
  metrobank: 'Metrobank',
  rcbc: 'RCBC',
  maribank: 'MariBank',
  seabank: 'MariBank',
  wise: 'Wise',
};

const BANK_DEFAULT_STYLES: Record<string, { c1: string; c2: string; type: 'EWALLET' | 'BANK' | 'CASH' }> = {
  GCash: { c1: '#0055FF', c2: '#0088FF', type: 'EWALLET' },
  Maya: { c1: '#059669', c2: '#10B981', type: 'EWALLET' },
  GoTyme: { c1: '#00D2C8', c2: '#00A8A0', type: 'BANK' },
  'Physical Cash': { c1: '#059669', c2: '#34D399', type: 'CASH' },
  BDO: { c1: '#004080', c2: '#0066CC', type: 'BANK' },
  BPI: { c1: '#6B0A14', c2: '#991B1B', type: 'BANK' },
  PNB: { c1: '#D4AF37', c2: '#B8860B', type: 'BANK' },
  UnionBank: { c1: '#E65100', c2: '#EA580C', type: 'BANK' },
  Metrobank: { c1: '#0044CC', c2: '#2563EB', type: 'BANK' },
  RCBC: { c1: '#C8981A', c2: '#EAB308', type: 'BANK' },
  MariBank: { c1: '#E64A19', c2: '#F97316', type: 'BANK' },
  Wise: { c1: '#64DD17', c2: '#84CC16', type: 'EWALLET' },
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
    lower.includes('ng')
  );
};

const normalizeBankName = (rawName: string): string => {
  const clean = rawName.trim().toLowerCase();
  if (BANK_ALIASES[clean]) return BANK_ALIASES[clean];
  for (const [key, val] of Object.entries(BANK_ALIASES)) {
    if (clean.includes(key)) return val;
  }
  return rawName.charAt(0).toUpperCase() + rawName.slice(1);
};

const getBankStyle = (bankName: string) => {
  return BANK_DEFAULT_STYLES[bankName] || { c1: '#475569', c2: '#64748B', type: 'BANK' as const };
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
  // "add account 2000 gcash", "add 3000 to my maya", "add 5000 to my gotyme", "add 980 to my cash"
  // "magdagdag ng 2000 sa gcash", "dagdag 3000 sa maya ko", "lagyan ng 5000 ang gotyme"
  const isAccountIntent =
    lower.includes('account') ||
    lower.includes('gcash') ||
    lower.includes('maya') ||
    lower.includes('gotyme') ||
    lower.includes('cash') ||
    lower.includes('bdo') ||
    lower.includes('bpi') ||
    lower.includes('pnb') ||
    lower.includes('unionbank') ||
    lower.includes('metrobank');

  if (
    isAccountIntent &&
    (lower.includes('add') ||
      lower.includes('magdagdag') ||
      lower.includes('dagdag') ||
      lower.includes('maglagay') ||
      lower.includes('lagyan') ||
      lower.includes('set') ||
      lower.includes('create')) &&
    !lower.includes('goal') &&
    !lower.includes('installment') &&
    !lower.includes('hulugan')
  ) {
    // Extract numbers
    const numMatches = text.match(/(\d+[\d,]*\.?\d*)/g);
    if (numMatches && numMatches.length > 0) {
      const amount = parseFloat(numMatches[0].replace(/,/g, ''));

      // Find bank keyword
      let rawBank = 'GCash';
      const banks = ['gcash', 'maya', 'gotyme', 'physical cash', 'cash', 'bdo', 'bpi', 'pnb', 'unionbank', 'ub', 'metrobank', 'rcbc', 'maribank', 'seabank', 'wise'];
      for (const b of banks) {
        if (lower.includes(b)) {
          rawBank = b;
          break;
        }
      }

      const bankName = normalizeBankName(rawBank);
      const style = getBankStyle(bankName);

      try {
        const existingRes = await db.execute(
          'SELECT * FROM cards WHERE LOWER(bankName) = LOWER(?)',
          [bankName]
        );
        const existing = existingRes.rows?._array && existingRes.rows._array.length > 0 ? existingRes.rows._array[0] : null;

        const date = Date.now();

        if (existing) {
          const newBalance = Number(existing.balance || 0) + amount;
          await db.execute('UPDATE cards SET balance = ? WHERE id = ?', [newBalance, existing.id]);
          await db.execute(
            'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), amount, date, 'Deposit', 'income', `Deposit to ${bankName}`, bankName]
          );
        } else {
          const cardId = uuidv4();
          const cardNum = `**** ${Math.floor(1000 + Math.random() * 9000)}`;
          await db.execute(
            'INSERT INTO cards (id, bankName, balance, color1, color2, cardNumber, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [cardId, bankName, amount, style.c1, style.c2, cardNum, style.type]
          );
          await db.execute(
            'INSERT INTO transactions (id, amount, date, categoryId, type, note, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), amount, date, 'Deposit', 'income', `Initial Deposit`, bankName]
          );
        }

        DeviceEventEmitter.emit('transactions_updated');

        return {
          executed: true,
          message: tagalog
            ? `💳 Naisagawa na! Na-add/update ang **${bankName}** account na may **${formatCurrency(amount)}** balance.`
            : `💳 Success! Added/updated **${bankName}** account with **${formatCurrency(amount)}** balance.`,
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
    lower.includes('goal') ||
    lower.includes('layunin') ||
    lower.includes('onexplayer') ||
    lower.includes('oneplayer') ||
    lower.includes('drone') ||
    (lower.includes('ipon') && (lower.includes('target') || lower.includes('kotse') || lower.includes('car') || lower.includes('bahay') || lower.includes('house')))
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
        const banks = ['gcash', 'maya', 'gotyme', 'cash', 'bdo', 'bpi', 'pnb', 'unionbank', 'metrobank'];
        for (const b of banks) {
          if (lower.includes(b)) {
            bankName = normalizeBankName(b);
            break;
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

          DeviceEventEmitter.emit('transactions_updated');

          return {
            executed: true,
            message: tagalog
              ? `💸 Na-record ang ${isIncome ? 'kikitain' : 'gastos'}: **${note}** (**${formatCurrency(amount)}**) sa **${bankName}**.`
              : `💸 Recorded ${isIncome ? 'income' : 'expense'}: **${note}** (**${formatCurrency(amount)}**) via **${bankName}**.`,
          };
        } catch (e) {
          console.error('Failed to process transaction intent:', e);
        }
      }
    }
  }

  return { executed: false };
};
