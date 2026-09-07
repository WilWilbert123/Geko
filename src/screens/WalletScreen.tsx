import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useCards, Card } from '../hooks/useCards';
import { formatCurrency } from '../utils/formatters';
import { Plus, MoreHorizontal, Wallet, TrendingUp } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const WalletScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, netWorth, refresh: refreshCards } = useCards();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Debit' | 'Credit'>('All');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCards();
    require('react-native').DeviceEventEmitter.emit('transactions_updated');
    setRefreshing(false);
  }, [refreshCards]);

  const renderCard = (card: Card, index: number) => {
    // We treat all seeded cards as Debit right now, can be adjusted later
    const accountType = 'Debit • PHP';
    
    return (
      <TouchableOpacity 
        key={card.id} 
        style={[styles.accountCard, { backgroundColor: card.color1 }]}
        activeOpacity={0.9}
      >
        <View style={styles.accountCardHeader}>
          <View style={styles.accountLogoContainer}>
            <Text style={styles.accountLogoText}>{card.bankName.charAt(0)}</Text>
          </View>
          <Text style={styles.accountName} numberOfLines={1}>{card.bankName}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity>
            <MoreHorizontal size={20} color="#fff" opacity={0.8} />
          </TouchableOpacity>
        </View>

        <Text style={styles.accountType}>{accountType}</Text>

        <View style={styles.accountCardFooter}>
          <Text style={styles.accountBalanceLabel}>BALANCE</Text>
          <Text style={styles.accountBalanceText}>{formatCurrency(card.balance)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header Area */}
        <View style={styles.headerArea}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Accounts</Text>
            <TouchableOpacity style={styles.addAccountBtn}>
              <Plus size={16} color="#4A7C59" />
              <Text style={styles.addAccountText}>Add Account</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Manage your wallets and balances</Text>
        </View>

        {/* Green Section & Net Worth */}
        <View style={styles.greenSection}>
          <View style={styles.netWorthCard}>
            <View style={styles.netWorthHeader}>
              <Text style={styles.netWorthLabel}>NET WORTH</Text>
              <View style={styles.growthBadge}>
                <TrendingUp size={12} color="#4A7C59" />
                <Text style={styles.growthText}>5.8%</Text>
              </View>
            </View>
            <Text style={styles.netWorthValue}>{formatCurrency(netWorth)}</Text>
            <View style={styles.netWorthFooter}>
              <Text style={styles.netWorthDesc}>Debit balances and investments</Text>
              <Wallet size={24} color="#f0f0f0" />
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            {(['All', 'Debit', 'Credit'] as const).map(f => (
              <TouchableOpacity 
                key={f}
                style={[
                  styles.filterBtn, 
                  filter === f ? styles.filterBtnActive : styles.filterBtnInactive
                ]}
                onPress={() => setFilter(f)}
              >
                <Text style={[
                  styles.filterText,
                  filter === f ? styles.filterTextActive : styles.filterTextInactive
                ]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Insights & Daily Balance */}
        <View style={styles.insightsRow}>
          {/* Quote Panel */}
          <View style={styles.insightPanel}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightLabel}>INSIGHT</Text>
              <Text style={styles.insightLink}>Forecast cashflow {'>'}</Text>
            </View>
            <Text style={styles.insightQuote}>
              That's a solid amount of liquidity. <Text style={{fontWeight: 'bold'}}>Very adult</Text>, in the best boring and financially useful way.
            </Text>
          </View>

          {/* Bar Chart Panel */}
          <View style={styles.chartPanel}>
            <Text style={styles.chartLabel}>DAILY BALANCE</Text>
            <View style={styles.chartBars}>
              {[0.6, 0.4, 0.3, 0.4, 0.3, 0.4, 0.7].map((height, i) => (
                <View key={i} style={styles.barColumn}>
                  <View style={[styles.barFill, { flex: height, backgroundColor: i === 6 ? '#4A7C59' : '#A9C9B4' }]} />
                  <Text style={[styles.barDay, { fontWeight: i === 6 ? 'bold' : 'normal', color: i === 6 ? '#000' : '#888' }]}>
                    {['T','W','T','F','S','S','M'][i]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Accounts Grid */}
        <View style={styles.gridContainer}>
          <Text style={styles.gridInstruction}>Press and hold an account card to rearrange it.</Text>
          <View style={styles.grid}>
            {cards.map((c, i) => renderCard(c, i))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerArea: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  addAccountBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F3EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
  addAccountText: { color: '#4A7C59', fontWeight: '700', fontSize: 14 },
  subtitle: { color: '#666', fontSize: 16 },
  
  greenSection: { backgroundColor: '#4A7C59', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, marginTop: 40 },
  netWorthCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, marginTop: -60, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  netWorthHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  netWorthLabel: { fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 1 },
  growthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  growthText: { color: '#4A7C59', fontWeight: '700', fontSize: 12 },
  netWorthValue: { fontSize: 36, fontWeight: '800', color: '#111', letterSpacing: -1, marginBottom: 12 },
  netWorthFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netWorthDesc: { color: '#888', fontSize: 14 },
  
  filtersContainer: { flexDirection: 'row', gap: 12, marginTop: 24, justifyContent: 'center' },
  filterBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  filterBtnActive: { backgroundColor: '#fff' },
  filterBtnInactive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterText: { fontWeight: '700', fontSize: 14 },
  filterTextActive: { color: '#4A7C59' },
  filterTextInactive: { color: '#fff' },

  insightsRow: { flexDirection: 'row', paddingHorizontal: 24, marginTop: 24, gap: 16 },
  insightPanel: { flex: 1.5, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  insightLabel: { fontSize: 12, fontWeight: '800', color: '#4A7C59', letterSpacing: 1 },
  insightLink: { fontSize: 12, color: '#888' },
  insightQuote: { fontSize: 14, color: '#444', lineHeight: 22 },
  
  chartPanel: { flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  chartLabel: { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', height: 60, alignItems: 'flex-end' },
  barColumn: { alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 8 },
  barFill: { width: 6, borderRadius: 3 },
  barDay: { fontSize: 10 },

  gridContainer: { paddingHorizontal: 24, marginTop: 32 },
  gridInstruction: { color: '#888', fontSize: 14, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  
  accountCard: { width: (width - 64) / 2, borderRadius: 24, padding: 20, minHeight: 180, justifyContent: 'space-between' },
  accountCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountLogoContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  accountLogoText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  accountName: { color: '#fff', fontWeight: '700', fontSize: 15, flexShrink: 1 },
  accountType: { color: '#fff', opacity: 0.8, fontSize: 12, marginTop: -20 },
  accountCardFooter: { marginTop: 16 },
  accountBalanceLabel: { color: '#fff', opacity: 0.8, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  accountBalanceText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
});
