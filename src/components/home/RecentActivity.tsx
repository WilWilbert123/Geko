import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTransactions } from '../../hooks/useTransactions';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { formatCurrency } from '../../utils/formatters';
import {
  Utensils,
  ShoppingBag,
  Zap,
  DollarSign,
  Car,
  HeartPulse,
  Tag,
  Wallet,
} from 'lucide-react-native';
import { isToday, isYesterday } from 'date-fns';

const CATEGORY_STYLE_MAP: Record<string, { bg: string; color: string; icon: any }> = {
  food: { bg: 'rgba(245, 158, 11, 0.15)', color: '#D97706', icon: Utensils },
  dining: { bg: 'rgba(245, 158, 11, 0.15)', color: '#D97706', icon: Utensils },
  lunch: { bg: 'rgba(245, 158, 11, 0.15)', color: '#D97706', icon: Utensils },
  shopping: { bg: 'rgba(244, 63, 94, 0.15)', color: '#E11D48', icon: ShoppingBag },
  utilities: { bg: 'rgba(99, 102, 241, 0.15)', color: '#4F46E5', icon: Zap },
  electricity: { bg: 'rgba(99, 102, 241, 0.15)', color: '#4F46E5', icon: Zap },
  bills: { bg: 'rgba(99, 102, 241, 0.15)', color: '#4F46E5', icon: Zap },
  'cash in': { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  cashin: { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  deposit: { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  salary: { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  income: { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  transport: { bg: 'rgba(14, 165, 233, 0.15)', color: '#0284C7', icon: Car },
  health: { bg: 'rgba(236, 72, 153, 0.15)', color: '#DB2777', icon: HeartPulse },
};

const getCategoryConfig = (categoryName?: string) => {
  if (!categoryName) return { bg: 'rgba(100, 116, 139, 0.15)', color: '#475569', icon: Tag };
  const key = categoryName.toLowerCase();
  for (const [k, val] of Object.entries(CATEGORY_STYLE_MAP)) {
    if (key.includes(k)) return val;
  }
  return { bg: 'rgba(100, 116, 139, 0.15)', color: '#475569', icon: Tag };
};

const BANK_COLOR_SCHEMES: Record<string, { text: string; cardBg: string; name: string; isCash?: boolean }> = {
  gotyme: { text: '#00D2C8', cardBg: '#00D2C8', name: 'GoTyme' },
  bpi: { text: '#991B1B', cardBg: '#6B0A14', name: 'BPI' },
  pnb: { text: '#B8860B', cardBg: '#D4AF37', name: 'PNB' },
  gcash: { text: '#2563EB', cardBg: '#0055FF', name: 'GCash' },
  maya: { text: '#059669', cardBg: '#0B0E14', name: 'Maya' },
  unionbank: { text: '#EA580C', cardBg: '#E65100', name: 'UnionBank' },
  ub: { text: '#EA580C', cardBg: '#E65100', name: 'UnionBank' },
  bdo: { text: '#0284C7', cardBg: '#004080', name: 'BDO' },
  metrobank: { text: '#2563EB', cardBg: '#0044CC', name: 'Metrobank' },
  rcbc: { text: '#C8981A', cardBg: '#C8981A', name: 'RCBC' },
  maribank: { text: '#E11D48', cardBg: '#E64A19', name: 'MariBank' },
  seabank: { text: '#E11D48', cardBg: '#E64A19', name: 'MariBank' },
  wise: { text: '#64DD17', cardBg: '#64DD17', name: 'Wise' },
  cash: { text: '#059669', cardBg: '#059669', name: 'Physical Cash', isCash: true },
};

const getBankScheme = (bankName?: string) => {
  if (!bankName) return BANK_COLOR_SCHEMES.gcash;
  const lower = bankName.toLowerCase();
  if (lower.includes('gotyme')) return BANK_COLOR_SCHEMES.gotyme;
  if (lower.includes('bpi')) return BANK_COLOR_SCHEMES.bpi;
  if (lower.includes('pnb')) return BANK_COLOR_SCHEMES.pnb;
  if (lower.includes('gcash')) return BANK_COLOR_SCHEMES.gcash;
  if (lower.includes('maya')) return BANK_COLOR_SCHEMES.maya;
  if (lower.includes('union') || lower.includes('ub')) return BANK_COLOR_SCHEMES.unionbank;
  if (lower.includes('bdo')) return BANK_COLOR_SCHEMES.bdo;
  if (lower.includes('metrobank')) return BANK_COLOR_SCHEMES.metrobank;
  if (lower.includes('rcbc')) return BANK_COLOR_SCHEMES.rcbc;
  if (lower.includes('maribank') || lower.includes('seabank')) return BANK_COLOR_SCHEMES.maribank;
  if (lower.includes('wise')) return BANK_COLOR_SCHEMES.wise;
  if (lower.includes('cash') || lower.includes('peso') || lower.includes('money')) return BANK_COLOR_SCHEMES.cash;
  
  return {
    text: '#64748B',
    cardBg: '#475569',
    name: bankName,
    isCash: false,
  };
};

const CardMiniBadge = ({ bankName }: { bankName?: string }) => {
  const scheme = getBankScheme(bankName);
  
  return (
    <View style={styles.cardBadgePill}>
      {scheme.isCash ? (
        <Text style={styles.cashIconText}>💵</Text>
      ) : (
        <View style={[styles.miniCardIcon, { backgroundColor: scheme.cardBg }]}>
          <View style={styles.miniCardChip} />
        </View>
      )}
      <Text style={[styles.cardBadgeText, { color: scheme.text }]}>
        {scheme.name}
      </Text>
    </View>
  );
};

const formatCleanTitle = (categoryId?: string, note?: string) => {
  let cat = (categoryId || '').trim();
  let n = (note || '').trim();

  // Strip 'Salary' or 'Salary - Cash-In / Deposit'
  cat = cat.replace(/^Salary\s*(-\s*)?/i, '');
  cat = cat.replace(/Salary/gi, 'Cash In');
  cat = cat.replace(/Cash-In\s*\/\s*Deposit/gi, 'Cash In');

  n = n.replace(/^Salary\s*(-\s*)?/i, '');
  n = n.replace(/Salary/gi, 'Cash In');
  n = n.replace(/Cash-In\s*\/\s*Deposit/gi, 'Deposit');

  cat = cat.replace(/^[\s-]+|[\s-]+$/g, '').trim();
  n = n.replace(/^[\s-]+|[\s-]+$/g, '').trim();

  if (!cat) cat = 'Cash In';

  if (!n || n.toLowerCase() === cat.toLowerCase() || n.toLowerCase() === 'cash in' || n.toLowerCase() === 'deposit') {
    return cat;
  }

  return `${cat} - ${n}`;
};

const TransactionItem = ({ item, index }: { item: any; index: number }) => {
  const { colors } = useTheme();
  const isIncome = item.type === 'income';
  const targetBank = item.bankName || 'GCash';
  const catConfig = getCategoryConfig(item.categoryId);
  const IconComp = catConfig.icon;

  const titleStr = formatCleanTitle(item.categoryId, item.note);

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify()} 
      layout={Layout.springify()}
      style={[styles.itemContainer, { borderBottomColor: colors.border }]}
    >
      {/* Category Pastel Rounded Icon Container */}
      <View style={[styles.categoryIconBadge, { backgroundColor: catConfig.bg }]}>
        <IconComp size={20} color={catConfig.color} strokeWidth={2} />
      </View>

      <View style={styles.itemDetails}>
        <Text style={[styles.itemCategory, { color: colors.text }]} numberOfLines={1}>
          {titleStr}
        </Text>
        <CardMiniBadge bankName={targetBank} />
      </View>

      {/* Red text for deductions (-), Green text for added balance (+) */}
      <Text style={[styles.itemAmount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
        {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
    </Animated.View>
  );
};

export const RecentActivity = () => {
  const { colors } = useTheme();
  const { transactions } = useTransactions();

  // Sort newest-first, then group
  const sorted = [...transactions].sort((a, b) => Number(b.date) - Number(a.date));

  const grouped: Record<string, any[]> = {};
  for (const t of sorted) {
    let group = 'Earlier';
    if (isToday(t.date)) group = 'Today';
    else if (isYesterday(t.date)) group = 'Yesterday';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(t);
  }

  const GROUP_ORDER = ['Today', 'Yesterday', 'Earlier'];
  const orderedGroups = GROUP_ORDER.filter(g => grouped[g]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Recent Activity</Text>

      {orderedGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Wallet size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent activity</Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {orderedGroups.map(group => (
            <View key={group} style={styles.groupContainer}>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group}</Text>
              {grouped[group].map((item: any, index: number) => (
                <TransactionItem key={item.id} item={item} index={index} />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  activityList: {},
  groupContainer: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  miniChip: {
    width: 7,
    height: 5,
    borderRadius: 1.5,
    backgroundColor: '#FFD700',
  },
  miniBankText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
    alignSelf: 'flex-end',
    marginBottom: 1,
  },
  itemDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemCategory: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  miniCardIcon: {
    width: 15,
    height: 10,
    borderRadius: 2,
    marginRight: 5,
    justifyContent: 'center',
    paddingLeft: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  miniCardChip: {
    width: 3,
    height: 2,
    borderRadius: 0.5,
    backgroundColor: '#FFD700',
  },
  cashIconText: {
    fontSize: 11,
    marginRight: 4,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemNote: {
    fontSize: 13,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
});
