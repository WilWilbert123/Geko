import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import { GekoCard3D } from '../wallet/GekoCard3D';
import { TrendingDown, ArrowDown, PieChart, Edit3, X, Check, Wifi, Plus, ChevronRight } from 'lucide-react-native';
import { useCards, Card } from '../../hooks/useCards';
import { getBankTheme } from '../../utils/bankThemes';
import * as Haptics from 'expo-haptics';

interface BalanceCardProps {
  balance: number; // Total net worth
  spentToday?: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  spentToday = 0,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { cards, totalAssets, updateCardBudget, updateCardDetails, resetAllCardBalances } = useCards();

  const [selectedBankId, setSelectedBankId] = useState<string>('ALL');

  // Edit Modal State (Balance & Budget)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [targetCard, setTargetCard] = useState<Card | null>(null);

  // Active selected card data
  const activeCard: Card | null =
    selectedBankId === 'ALL'
      ? null
      : cards.find((c) => c.id === selectedBankId) || null;

  // Active Card 3D Props
  const cardBalance = activeCard
    ? (activeCard.type === 'CREDIT_CARD' ? (activeCard.outstandingBalance || 0) : activeCard.balance)
    : (totalAssets || balance);
  const cardColor1 = activeCard ? (activeCard.color1 || getBankTheme(activeCard.bankName).bg1) : '#0F172A';
  const cardColor2 = activeCard ? (activeCard.color2 || getBankTheme(activeCard.bankName).bg2) : '#1E293B';
  const accountType = activeCard
    ? (activeCard.type === 'CREDIT_CARD' ? `CREDIT • ${activeCard.bankName.toUpperCase()}` : `DEBIT • ${activeCard.bankName.toUpperCase()}`)
    : (cards.length === 0 ? 'GEKO WALLET • PRIMARY' : 'ALL ACCOUNTS • GEKO PLATINUM');
  const cardNumber = activeCard ? activeCard.cardNumber : '4289 •••• •••• 9012';

  // Budget Left Calculation:
  // For individual cards: if custom budget limit is set (> 0), use (budget - spent); otherwise use actual card balance!
  // For ALL accounts: if total budget is set, use (totalBudget - spent); otherwise use totalAssets!
  const displayBudgetLeft = activeCard
    ? (activeCard.budget && activeCard.budget > 0
      ? Math.max(0, activeCard.budget - spentToday)
      : Math.max(0, cardBalance))
    : Math.max(0, totalAssets);

  const openCardEditor = (card: Card | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTargetCard(card);
    if (card) {
      setBalanceInput(String(card.balance));
      setBudgetInput(card.budget ? String(card.budget) : '');
    } else {
      setBalanceInput('0');
      setBudgetInput('0');
    }
    setIsEditModalOpen(true);
  };

  const handleSaveCardDetails = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newBal = parseFloat(balanceInput) || 0;
    const newBud = parseFloat(budgetInput) || 0;

    if (targetCard) {
      await updateCardDetails(targetCard.id, newBal, newBud);
    } else {
      await resetAllCardBalances(newBal);
    }
    setIsEditModalOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* ── Bank Category / Account Selector Bar (Sleek Mini Cards) ── */}
      {cards.length > 0 && (
        <View style={styles.tabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {/* ALL ACCOUNTS / GEKO TOTAL MINI 3D CARD */}
            <TouchableOpacity
              style={[
                styles.miniCardTab,
                selectedBankId === 'ALL'
                  ? styles.miniCardActive
                  : styles.miniCardInactive,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedBankId('ALL');
              }}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }} pointerEvents="none">
                <GekoCard3D
                  balance={totalAssets || balance}
                  bankName="GEKO"
                  accountType="ALL ACCOUNTS"
                  color1="#0F172A"
                  color2="#1E293B"
                  height={82}
                  cornerRadius={0.04}
                  interactive={false}
                  paymentNetwork="OTHER"
                />
              </View>
              {selectedBankId === 'ALL' && (
                <View style={styles.mini3DActiveGlowDot} />
              )}
            </TouchableOpacity>

            {/* INDIVIDUAL BANK MINI 3D CARDS */}
            {cards.map((c, idx) => {
              const isSelected = selectedBankId === c.id;
              const theme = getBankTheme(c.bankName, c.color1, c.color2);
              const cBalance = c.type === 'CREDIT_CARD' ? (c.outstandingBalance || 0) : c.balance;

              return (
                <TouchableOpacity
                  key={`mini-card-${c.id}-${idx}`}
                  style={[
                    styles.miniCardTab,
                    isSelected ? styles.miniCardActive : styles.miniCardInactive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedBankId(c.id);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }} pointerEvents="none">
                    <GekoCard3D
                      balance={cBalance}
                      bankName={c.bankName}
                      accountType={c.type}
                      color1={c.color1 || theme.bg1}
                      color2={c.color2 || theme.bg2}
                      height={82}
                      cornerRadius={0.04}
                      interactive={false}
                      paymentNetwork={c.paymentNetwork || theme.network}
                    />
                  </View>
                  {isSelected && (
                    <View style={styles.mini3DActiveGlowDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Dynamic 3D GEKO Bank Card ── */}
      <GekoCard3D
        balance={cardBalance}
        cardholderName="GEKO MEMBER"
        accountType={accountType}
        bankName={activeCard ? activeCard.bankName : 'GEKO'}
        cardNumber={cardNumber}
        color1={cardColor1}
        color2={cardColor2}
        expiryDate="10/29"
        height={260}
        cornerRadius={0.20}
        paymentNetwork={activeCard ? (activeCard.paymentNetwork || getBankTheme(activeCard.bankName).network) : 'OTHER'}
      />

      {/* ── Hint when no accounts are connected ── */}
      {cards.length === 0 && (
        <TouchableOpacity
          style={[styles.connectFirstCardHint, { backgroundColor: colors.surfaceHighlight || 'rgba(16, 185, 129, 0.06)' }]}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Wallet');
          }}
        >
          <View style={styles.connectHintLeft}>
            <View style={styles.connectHintIconWrap}>
              <Plus size={16} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.connectHintTitle, { color: colors.text }]}>No cards connected yet</Text>
              <Text style={[styles.connectHintSub, { color: colors.textMuted }]}>
                Tap here or open Wallet / Accounts to add your first card or e-wallet
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* ── 2 Side-By-Side Capsule Cards (Spent Today vs Budget Left) ── */}
      <View style={styles.actionRowGrid}>
        {/* Left Card: Spent Today (Red) */}
        <TouchableOpacity
          style={[
            styles.gridCard,
            {
              backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.05)',
              borderColor: colors.border,
            },
          ]}
          onPress={() => openCardEditor(activeCard)}
          activeOpacity={0.8}
        >
          <View style={styles.gridCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <ArrowDown size={17} color="#EF4444" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spent Today</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]} numberOfLines={1}>
                {formatCurrency(spentToday)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Right Card: Budget Left (Green) */}
        <TouchableOpacity
          style={[
            styles.gridCard,
            {
              backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.05)',
              borderColor: colors.border,
            },
          ]}
          onPress={() => openCardEditor(activeCard)}
          activeOpacity={0.8}
        >
          <View style={styles.gridCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <PieChart size={17} color="#10B981" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Budget Left</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]} numberOfLines={1}>
                {formatCurrency(displayBudgetLeft)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Edit Card Money Balance & Budget Modal ── */}
      <Modal
        visible={isEditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {targetCard ? `Edit ${targetCard.bankName}` : 'Manage All Cards'}
              </Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
              {targetCard
                ? `Set the current balance and monthly budget for ${targetCard.bankName}.`
                : 'Set starting balance for all cards or reset all cards to zero.'}
            </Text>

            {/* Field 1: Card Balance */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
              CARD BALANCE (₱)
            </Text>
            <View style={styles.inputRow}>
              <Text style={[styles.currencyPrefix, { color: colors.text }]}>₱</Text>
              <TextInput
                style={[styles.budgetInput, { color: colors.text, borderColor: colors.border }]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={balanceInput}
                onChangeText={setBalanceInput}
              />
              <TouchableOpacity
                style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}
                onPress={() => setBalanceInput('0')}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#F43F5E' }}>Set ₱0</Text>
              </TouchableOpacity>
            </View>

            {/* Field 2: Monthly Budget (if card selected) */}
            {targetCard && (
              <>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
                  MONTHLY BUDGET LIMIT (₱)
                </Text>
                <View style={styles.inputRow}>
                  <Text style={[styles.currencyPrefix, { color: colors.text }]}>₱</Text>
                  <TextInput
                    style={[styles.budgetInput, { color: colors.text, borderColor: colors.border }]}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={budgetInput}
                    onChangeText={setBudgetInput}
                  />
                </View>
              </>
            )}


            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.surfaceHighlight }]}
                onPress={() => setIsEditModalOpen(false)}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveModalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveCardDetails}
              >
                <Check size={16} color="#FFF" />
                <Text style={styles.saveModalBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  /* Mini 3D Card Category Bar */
  tabContainer: {
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  tabScrollContent: {
    gap: 10,
    paddingRight: 16,
    paddingVertical: 6,
  },
  miniCardTab: {
    width: 130,
    height: 82,
    borderRadius: 8,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  miniCardActive: {
    borderWidth: 2,
    borderColor: '#38BDF8',
    borderRadius: 8,
    opacity: 1,
    transform: [{ scale: 1.04 }],
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  miniCardInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    opacity: 0.85,
  },
  mini3DActiveGlowDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowRadius: 6,
    shadowOpacity: 1,
    zIndex: 10,
    elevation: 10,
  },
  /* Budget Bar Card */
  budgetBarCard: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  actionRowGrid: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    gap: 10,
  },
  gridCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  gridCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bankLogoBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLogoBadgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  bottomAccentTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bottomAccentFill: {
    height: '100%',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalDescription: {
    fontSize: 13,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '800',
  },
  budgetInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    borderBottomWidth: 2,
    paddingVertical: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  saveModalBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveModalBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  connectFirstCardHint: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectHintLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  connectHintIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectHintTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  connectHintSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
});
