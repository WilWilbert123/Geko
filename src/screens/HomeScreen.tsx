import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useTransactions } from '../hooks/useTransactions';
import { BalanceCard } from '../components/home/BalanceCard';
import { ActionRow } from '../components/home/ActionRow';
import { BudgetMeters } from '../components/home/BudgetMeters';
import { RecentActivity } from '../components/home/RecentActivity';
import { useTodayStats } from '../hooks/useTodayStats';
import { useCurrency } from '../hooks/useCurrency';
import { Sun, Moon, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type Props = any;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { balance, refresh: refreshTransactions } = useTransactions();
  const { spentToday, refresh: refreshStats } = useTodayStats();
  const { currency, toggleCurrency, symbol } = useCurrency();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshTransactions(), refreshStats()]);
    require('react-native').DeviceEventEmitter.emit('transactions_updated');
    setRefreshing(false);
  }, [refreshTransactions, refreshStats]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Left: avatar + greeting */}
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: `${colors.primary}22`,
                  borderColor: `${colors.primary}44`,
                },
              ]}
            >
              <User size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>Hello, User 👋</Text>
              <Text style={[styles.subGreeting, { color: colors.textMuted }]}>
                Welcome back
              </Text>
            </View>
          </View>

          {/* Right: currency pill + theme toggle */}
          <View style={styles.headerRight}>
            {/* Currency pill */}
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleCurrency();
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, { color: colors.primary }]}>
                {symbol} {currency}
              </Text>
            </TouchableOpacity>

            {/* Sun / Moon theme toggle */}
            <TouchableOpacity
              style={[
                styles.themeBtn,
                {
                  backgroundColor: isDark ? colors.surface : '#F1F5F9',
                  borderColor: isDark ? colors.border : '#CBD5E1',
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleTheme();
              }}
              activeOpacity={0.75}
            >
              {isDark ? (
                <Sun size={16} color="#FBBF24" strokeWidth={2.2} />
              ) : (
                <Moon size={16} color="#6366F1" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3D Card ── */}
        <View style={{ marginHorizontal: -20 }}>
          <BalanceCard balance={balance} spentToday={spentToday} />
        </View>

        <ActionRow />
        <BudgetMeters />
        <RecentActivity />
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subGreeting: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  themeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
