import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { useTransactions } from '../hooks/useTransactions';
import { BalanceCard } from '../components/home/BalanceCard';
import { ActionRow } from '../components/home/ActionRow';
import { BudgetMeters } from '../components/home/BudgetMeters';
import { RecentActivity } from '../components/home/RecentActivity';
import { Plus } from 'lucide-react-native';
import { useTodayStats } from '../hooks/useTodayStats';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { balance, refresh: refreshTransactions } = useTransactions();
  const { spentToday, refresh: refreshStats } = useTodayStats();
  
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>Hello, User</Text>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceHighlight }]} />
        </View>

        <BalanceCard balance={balance} dailyLimit={150} spentToday={spentToday} />
        
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  }
});
