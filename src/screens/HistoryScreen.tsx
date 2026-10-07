import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '../hooks/useTheme';
import { useTransactions } from '../hooks/useTransactions';
import { PieChart, Search, X } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TransactionItem } from '../components/home/RecentActivity';
import { subDays, subMonths } from 'date-fns';

const SEGMENTS = ['All', 'Weekly', 'Monthly'];

export const HistoryScreen = () => {
  const { colors, isDark } = useTheme();
  const { transactions } = useTransactions();
  const [segment, setSegment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = useMemo(() => {
    let list = [...transactions].sort((a, b) => Number(b.date) - Number(a.date));

    // Filter by date segment
    const now = new Date();
    if (segment === 'Weekly') {
      const oneWeekAgo = subDays(now, 7).getTime();
      list = list.filter(t => t.date >= oneWeekAgo);
    } else if (segment === 'Monthly') {
      const oneMonthAgo = subMonths(now, 30).getTime();
      list = list.filter(t => t.date >= oneMonthAgo);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => 
        (t.categoryId && t.categoryId.toLowerCase().includes(q)) ||
        (t.note && t.note.toLowerCase().includes(q)) ||
        (t.bankName && t.bankName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [transactions, segment, searchQuery]);

  const emptyState = (
    <Animated.View entering={FadeIn} style={styles.empty}>
      <View style={[styles.emptyIconBg, { backgroundColor: colors.surfaceHighlight }]}>
        <PieChart size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No History Found</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        {searchQuery ? 'No transactions match your search filter.' : 'No transactions recorded for this period.'}
      </Text>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {/* Search Input Bar */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : '#F1F5F9', borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search activity, bank, note..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Segment Filter Controls */}
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
        data={filteredTransactions}
        estimatedItemSize={76}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TransactionItem item={item} index={index} />
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
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
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
