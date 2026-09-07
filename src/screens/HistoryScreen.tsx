import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '../hooks/useTheme';
import { useTransactions } from '../hooks/useTransactions';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';
import { PieChart } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const SEGMENTS = ['Weekly', 'Monthly', 'Custom'];

export const HistoryScreen = () => {
  const { colors } = useTheme();
  const { transactions } = useTransactions();
  const [segment, setSegment] = useState('Weekly');

  const emptyState = (
    <Animated.View entering={FadeIn} style={styles.empty}>
      <View style={[styles.emptyIconBg, { backgroundColor: colors.surfaceHighlight }]}>
        <PieChart size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Data Available</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        Add some transactions to see your {segment.toLowerCase()} analytics and breakdowns.
      </Text>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.segmentControl, { backgroundColor: colors.surfaceHighlight }]}>
          {SEGMENTS.map(s => (
            <TouchableOpacity 
              key={s}
              style={[
                styles.segmentBtn, 
                segment === s && { backgroundColor: colors.surface, shadowColor: '#000', elevation: 2 }
              ]}
              onPress={() => setSegment(s)}
            >
              <Text style={[
                styles.segmentText, 
                { color: segment === s ? colors.text : colors.textMuted }
              ]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlashList
        data={transactions}
        estimatedItemSize={76}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.item, { borderBottomColor: colors.border }]}>
            <View style={styles.left}>
              <Text style={[styles.category, { color: colors.text }]}>{item.categoryId}</Text>
              <Text style={[styles.date, { color: colors.textMuted }]}>{formatRelativeTime(item.date)}</Text>
              {item.note ? <Text style={[styles.note, { color: colors.textMuted }]}>{item.note}</Text> : null}
            </View>
            <Text style={[
              styles.amount, 
              { color: item.type === 'income' ? colors.income : colors.text }
            ]}>
              {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
            </Text>
          </View>
        )}
        ListEmptyComponent={emptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  segmentControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: { flex: 1 },
  category: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  date: { fontSize: 12 },
  note: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  amount: { fontSize: 16, fontWeight: '700' },
  empty: { 
    padding: 40, 
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  }
});
