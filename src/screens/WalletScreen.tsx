import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useCards, Card } from '../hooks/useCards';
import { useTransactions } from '../hooks/useTransactions';
import { formatCurrency } from '../utils/formatters';
import { Plus, Wallet, TrendingUp, X, Check, MoreHorizontal, Sparkles } from 'lucide-react-native';
import { GekoCard3D } from '../components/wallet/GekoCard3D';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const PRESET_COLORS: Record<string, { c1: string; c2: string }> = {
  GCash: { c1: '#0026B3', c2: '#0055FF' },
  GoTyme: { c1: '#0099B8', c2: '#00D1FF' },
  BPI: { c1: '#8B0000', c2: '#C8102E' },
  PNB: { c1: '#D4AF37', c2: '#E6CA65' },
  BDO: { c1: '#002B66', c2: '#004080' },
  MariBank: { c1: '#E64A19', c2: '#FF7043' },
  Metrobank: { c1: '#002277', c2: '#0044CC' },
  Maya: { c1: '#0B0E14', c2: '#00E676' },
  Landbank: { c1: '#004D25', c2: '#0A8A43' },
  UnionBank: { c1: '#E65100', c2: '#FF8800' },
  Visa: { c1: '#1A1F71', c2: '#0055FF' },
};

export const WalletScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, totalAssets, creditDebt, netWorth, addCard, refresh: refreshCards } = useCards();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Debit' | 'Credit'>('All');
  
  // Selected Card state for 60fps buttery smooth 3D viewer
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Add Account Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newAccountType, setNewAccountType] = useState<'EWALLET' | 'BANK' | 'CREDIT_CARD' | 'DEBIT' | 'CASH'>('BANK');
  const [newCreditLimit, setNewCreditLimit] = useState('50000');

  const { transactions } = useTransactions();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(6); // Default to today (index 6)

  // Compute accurate real-time daily spending for the past 7 days from SQLite transactions
  const dailyStats = useMemo(() => {
    const today = new Date();
    const dayInitials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime();
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

      const dayTx = transactions.filter(t => t.date >= startOfDay && t.date <= endOfDay);
      const expense = dayTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      result.push({
        date: d,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        label: dayInitials[d.getDay()],
        expense,
        isToday: i === 0,
      });
    }

    const maxExpense = Math.max(...result.map(r => r.expense), 500);
    return result.map(r => ({
      ...r,
      ratio: Math.max(0.18, Math.min(1.0, r.expense / maxExpense)),
    }));
  }, [transactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCards();
    require('react-native').DeviceEventEmitter.emit('transactions_updated');
    setRefreshing(false);
  }, [refreshCards]);

  const filteredCards = cards.filter(c => {
    if (filter === 'Debit') return c.type !== 'CREDIT_CARD';
    if (filter === 'Credit') return c.type === 'CREDIT_CARD';
    return true;
  });

  // Find currently active card or default to Net Worth card
  const activeCard = selectedCardId ? cards.find(c => c.id === selectedCardId) : null;

  const activeBankName = activeCard ? activeCard.bankName : undefined;
  const activeBalance = activeCard 
    ? (activeCard.type === 'CREDIT_CARD' ? (activeCard.outstandingBalance || 0) : activeCard.balance)
    : netWorth;
  const activeColor1 = activeCard ? activeCard.color1 : '#0F172A';
  const activeColor2 = activeCard ? activeCard.color2 : '#1E293B';
  const activeAccountType = activeCard 
    ? (activeCard.type === 'CREDIT_CARD' ? `${activeCard.bankName} CREDIT` : `${activeCard.bankName} DEBIT`)
    : 'TOTAL BALANCE';
  const activeCardNumber = activeCard ? (activeCard.cardNumber || '•••• 4289') : '4289 •••• •••• 9012';

  const handleCreateAccount = async () => {
    const name = newBankName.trim();
    if (!name) {
      Alert.alert('Missing Name', 'Please enter an account or bank name (e.g. Security Bank, GCash, BDO).');
      return;
    }

    const bal = parseFloat(newBalance.replace(/,/g, '')) || 0;
    const limit = parseFloat(newCreditLimit.replace(/,/g, '')) || 0;
    const preset = PRESET_COLORS[name] || { c1: '#1E293B', c2: '#334155' };

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addCard({
        bankName: name,
        balance: bal,
        type: newAccountType,
        creditLimit: limit,
        color1: preset.c1,
        color2: preset.c2,
      });

      setNewBankName('');
      setNewBalance('');
      setAddModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to create account in SQLite.');
    }
  };

  const renderAccountCard = (card: Card) => {
    const isSelected = card.id === selectedCardId;
    const isCredit = card.type === 'CREDIT_CARD';
    const displayBalance = isCredit ? (card.outstandingBalance || 0) : card.balance;

    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.accountCard,
          { backgroundColor: card.color1 },
          isSelected && styles.accountCardSelected,
        ]}
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedCardId(card.id);
        }}
      >
        <View style={styles.accountCardHeader}>
          <View style={styles.accountLogoContainer}>
            <Text style={styles.accountLogoText}>{card.bankName.charAt(0)}</Text>
          </View>
          <Text style={styles.accountName} numberOfLines={1}>{card.bankName}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => setSelectedCardId(card.id)}>
            <Sparkles size={16} color={isSelected ? '#FFD700' : '#ffffff88'} />
          </TouchableOpacity>
        </View>

        <Text style={styles.accountType}>{isCredit ? 'Credit Card • PHP' : 'Debit • PHP'}</Text>

        <View style={styles.accountCardFooter}>
          <Text style={styles.accountBalanceLabel}>{isCredit ? 'OUTSTANDING' : 'BALANCE'}</Text>
          <Text style={styles.accountBalanceText}>{formatCurrency(displayBalance)}</Text>
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
            <TouchableOpacity 
              style={styles.addAccountBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAddModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#4A7C59" />
              <Text style={styles.addAccountText}>Add Account</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {activeCard ? `3D View: ${activeCard.bankName}` : 'Tap any card below to view in 3D'}
          </Text>

          {/* Single Focused 3D Card (60 FPS Buttery Smooth WebGL Execution) */}
          <View style={styles.featuredCardContainer}>
            <GekoCard3D
              bankName={activeBankName}
              balance={activeBalance}
              spentToday={760}
              dailyLimit={150}
              cardNumber={activeCardNumber}
              cardholderName="GEKO MEMBER"
              accountType={activeAccountType}
              color1={activeColor1}
              color2={activeColor2}
              expiryDate="10/29"
              height={220}
            />
          </View>
        </View>

        {/* Accurate Real-Time SQLite Daily Balance Chart */}
        <View style={styles.fullChartContainer}>
          <View style={[styles.fullChartCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <View style={styles.chartCardHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>DAILY BALANCE</Text>
                <Text style={[styles.chartSub, { color: colors.textMuted }]}>
                  {dailyStats[selectedDayIdx]?.isToday
                    ? `Today's Outflow: ${formatCurrency(dailyStats[selectedDayIdx]?.expense || 0)}`
                    : `${dailyStats[selectedDayIdx]?.dayName}: ${formatCurrency(dailyStats[selectedDayIdx]?.expense || 0)} spent`}
                </Text>
              </View>

              <View style={[styles.liveBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.liveText, { color: colors.primary }]}>Real-Time SQLite</Text>
              </View>
            </View>

            {/* 7-Day Interactive Real-Time Bar Chart */}
            <View style={styles.fullChartBarsRow}>
              {dailyStats.map((item, index) => {
                const isSelected = selectedDayIdx === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.fullBarColumn}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDayIdx(index);
                    }}
                  >
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.fullBarFill,
                          {
                            height: `${Math.round(item.ratio * 100)}%`,
                            backgroundColor: item.isToday 
                              ? colors.primary 
                              : isSelected 
                                ? '#38BDF8' 
                                : 'rgba(255, 255, 255, 0.18)',
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.fullBarDayText,
                        {
                          color: item.isToday 
                            ? colors.primary 
                            : isSelected 
                              ? colors.text 
                              : colors.textMuted,
                          fontWeight: item.isToday || isSelected ? '800' : '600',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Accounts Grid (Tap any account to view 3D Card above!) */}
        <View style={styles.gridContainer}>
          <View style={styles.gridHeaderRow}>
            <Text style={[styles.gridInstruction, { color: colors.textMuted }]}>Accounts ({filteredCards.length}):</Text>

            {/* Filter Pills */}
            <View style={styles.inlineFiltersRow}>
              {(['All', 'Debit', 'Credit'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.inlineFilterBtn,
                    filter === f 
                      ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                      : { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFilter(f);
                  }}
                >
                  <Text style={[
                    styles.inlineFilterText,
                    { color: filter === f ? '#FFFFFF' : colors.textMuted }
                  ]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.grid}>
            {filteredCards.map((c) => renderAccountCard(c))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Real-Time Add Account Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Account</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Account / Bank Name</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. Security Bank, GCash, Maya, BDO"
              placeholderTextColor={colors.textMuted}
              value={newBankName}
              onChangeText={setNewBankName}
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Account Type</Text>
            <View style={styles.typeSelectorRow}>
              {(['BANK', 'EWALLET', 'CREDIT_CARD', 'DEBIT', 'CASH'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: newAccountType === t ? colors.primary : colors.surfaceHighlight,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setNewAccountType(t)}
                >
                  <Text style={[styles.typeChipText, { color: newAccountType === t ? '#fff' : colors.text }]}>
                    {t === 'CREDIT_CARD' ? 'Credit' : t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {newAccountType === 'CREDIT_CARD' ? 'Outstanding Debt (₱)' : 'Starting Balance (₱)'}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newBalance}
              onChangeText={setNewBalance}
            />

            {newAccountType === 'CREDIT_CARD' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Credit Limit (₱)</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="50000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={newCreditLimit}
                  onChangeText={setNewCreditLimit}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateAccount}
            >
              <Check size={18} color="#fff" />
              <Text style={styles.createBtnText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  subtitle: { color: '#666', fontSize: 15 },
  featuredCardContainer: { marginTop: 14 },

  fullChartContainer: { paddingHorizontal: 24, marginTop: 20 },
  fullChartCard: { borderRadius: 24, padding: 20, borderWidth: 1 },
  chartCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  chartTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  chartSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: '700' },
  fullChartBarsRow: { flexDirection: 'row', justifyContent: 'space-between', height: 90, alignItems: 'flex-end', paddingTop: 10 },
  fullBarColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 8 },
  barTrack: { width: 14, height: 60, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  fullBarFill: { width: '100%', borderRadius: 7 },
  fullBarDayText: { fontSize: 11 },

  gridContainer: { paddingHorizontal: 24, marginTop: 24 },
  gridHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  gridInstruction: { fontSize: 14, fontWeight: '700' },
  inlineFiltersRow: { flexDirection: 'row', gap: 6 },
  inlineFilterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  inlineFilterText: { fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },

  accountCard: { width: (width - 64) / 2, borderRadius: 24, padding: 20, minHeight: 180, justifyContent: 'space-between', borderWidth: 2, borderColor: 'transparent' },
  accountCardSelected: { borderColor: '#FFD700', transform: [{ scale: 1.02 }] },
  accountCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountLogoContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  accountLogoText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  accountName: { color: '#fff', fontWeight: '700', fontSize: 15, flexShrink: 1 },
  accountType: { color: '#fff', opacity: 0.8, fontSize: 12, marginTop: -20 },
  accountCardFooter: { marginTop: 16 },
  accountBalanceLabel: { color: '#fff', opacity: 0.8, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  accountBalanceText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  /* Modal Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { borderRadius: 24, borderWidth: 1, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  modalInput: { height: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  typeSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  typeChipText: { fontSize: 12, fontWeight: '700' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 16, marginTop: 24, gap: 8 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
