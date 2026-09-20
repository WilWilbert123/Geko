import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTransactions } from '../../hooks/useTransactions';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { formatCurrency } from '../../utils/formatters';
import { Wallet } from 'lucide-react-native';
import { isToday, isYesterday } from 'date-fns';

const BANK_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  gcash: { bg: '#0055FF', border: '#3B82F6', text: 'GCash' },
  gotyme: { bg: '#0D1117', border: '#00D2C8', text: 'GoTyme' },
  bpi: { bg: '#8B0000', border: '#C8102E', text: 'BPI' },
  pnb: { bg: '#B8860B', border: '#E6CA65', text: 'PNB' },
  bdo: { bg: '#002B66', border: '#0055FF', text: 'BDO' },
  maribank: { bg: '#E64A19', border: '#FF7043', text: 'Mari' },
  metrobank: { bg: '#002277', border: '#0044CC', text: 'Metro' },
  maya: { bg: '#0B0E14', border: '#00E676', text: 'Maya' },
  landbank: { bg: '#004D25', border: '#0A8A43', text: 'Landbank' },
  unionbank: { bg: '#111115', border: '#FF6B00', text: 'Union' },
  visa: { bg: '#1A1F71', border: '#0055FF', text: 'VISA' },
};

const getBankStyle = (bankName?: string) => {
  if (!bankName) return BANK_COLOR_MAP.gcash;
  const key = bankName.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, val] of Object.entries(BANK_COLOR_MAP)) {
    if (key.includes(k)) return val;
  }
  return { bg: '#1E293B', border: '#475569', text: bankName.slice(0, 5) };
};

const MiniCardView = ({ bankName }: { bankName?: string }) => {
  const bankStyle = getBankStyle(bankName);

  return (
    <View style={[styles.miniCard, { backgroundColor: bankStyle.bg, borderColor: bankStyle.border }]}>
      {/* Micro Gold EMV Chip */}
      <View style={styles.miniChip} />

      {/* Mini Bank Logo Text */}
      <Text style={styles.miniBankText} numberOfLines={1}>
        {bankStyle.text}
      </Text>
    </View>
  );
};

const TransactionItem = ({ item, index }: { item: any; index: number }) => {
  const { colors } = useTheme();
  const isIncome = item.type === 'income';
  const targetBank = item.bankName || 'GCash';

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify()} 
      layout={Layout.springify()}
      style={[styles.itemContainer, { borderBottomColor: colors.border }]}
    >
      {/* Sleek Miniature Bank Card View */}
      <MiniCardView bankName={targetBank} />

      <View style={styles.itemDetails}>
        <View style={styles.titleRow}>
          <Text style={[styles.itemCategory, { color: colors.text }]}>{item.categoryId}</Text>
          <Text style={[styles.bankTag, { color: colors.textMuted }]}>• {targetBank}</Text>
        </View>
        <Text style={[styles.itemNote, { color: colors.textMuted }]}>{item.note || 'No note'}</Text>
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
        <View style={styles.scrollWrapper}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            {orderedGroups.map(group => (
              <View key={group} style={styles.groupContainer}>
                <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group}</Text>
                {grouped[group].map((item: any, index: number) => (
                  <TransactionItem key={item.id} item={item} index={index} />
                ))}
              </View>
            ))}
          </ScrollView>
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
  scrollWrapper: {
    height: 320,
    overflow: 'hidden',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
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
  /* Miniature Card View Styles */
  miniCard: {
    width: 52,
    height: 34,
    borderRadius: 7,
    borderWidth: 1.2,
    marginRight: 14,
    padding: 3,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
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
  bankTag: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
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
