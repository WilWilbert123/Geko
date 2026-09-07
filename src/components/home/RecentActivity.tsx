import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTransactions } from '../../hooks/useTransactions';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { formatCurrency } from '../../utils/formatters';
import { Coffee, ShoppingCart, Train, DollarSign, Wallet } from 'lucide-react-native';
import { format, isToday, isYesterday } from 'date-fns';

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'food': return Coffee;
    case 'shopping': return ShoppingCart;
    case 'transport': return Train;
    case 'salary': return DollarSign;
    default: return Wallet;
  }
};

const TransactionItem = ({ item, index }: { item: any; index: number }) => {
  const { colors } = useTheme();
  const Icon = getCategoryIcon(item.categoryId);
  const isIncome = item.type === 'income';

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify()} 
      layout={Layout.springify()}
      style={[styles.itemContainer, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceHighlight }]}>
        <Icon size={20} color={isIncome ? colors.income : colors.text} />
      </View>
      <View style={styles.itemDetails}>
        <Text style={[styles.itemCategory, { color: colors.text }]}>{item.categoryId}</Text>
        <Text style={[styles.itemNote, { color: colors.textMuted }]}>{item.note || 'No note'}</Text>
      </View>
      <Text style={[styles.itemAmount, { color: isIncome ? colors.income : colors.text }]}>
        {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
    </Animated.View>
  );
};

export const RecentActivity = () => {
  const { colors } = useTheme();
  const { transactions } = useTransactions();

  // Sort and group transactions
  const sorted = [...transactions].sort((a, b) => b.date - a.date);
  
  const grouped = sorted.reduce((acc: any, t) => {
    let group = 'Earlier';
    if (isToday(t.date)) group = 'Today';
    else if (isYesterday(t.date)) group = 'Yesterday';
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(t);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Recent Activity</Text>
      
      {Object.keys(grouped).length === 0 ? (
        <View style={styles.emptyState}>
          <Wallet size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent activity</Text>
        </View>
      ) : (
        Object.entries(grouped).map(([group, items]: [string, any]) => (
          <View key={group} style={styles.groupContainer}>
            <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group}</Text>
            {items.map((item: any, index: number) => (
              <TransactionItem key={item.id} item={item} index={index} />
            ))}
          </View>
        ))
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
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemNote: {
    fontSize: 13,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  }
});
