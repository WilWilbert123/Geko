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
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import { GekoCard3D } from '../wallet/GekoCard3D';
import { TrendingDown, Edit3, X, Check } from 'lucide-react-native';
import { useCards, Card } from '../../hooks/useCards';
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
  const { cards, updateCardBudget, updateCardDetails, resetAllCardBalances } = useCards();

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
  const cardBalance = activeCard ? activeCard.balance : balance;
  const cardColor1 = activeCard ? activeCard.color1 : '#0F172A';
  const cardColor2 = activeCard ? activeCard.color2 : '#1E293B';
  const accountType = activeCard
    ? `DEBIT • ${activeCard.bankName.toUpperCase()}`
    : 'ALL ACCOUNTS • GEKO PLATINUM';
  const cardNumber = activeCard ? activeCard.cardNumber : '4289 •••• •••• 9012';

  // Budget Calculation
  const cardBudget = activeCard ? activeCard.budget || 0 : 0;
  const budgetSpent = spentToday;
  const budgetRatio = cardBudget > 0 ? Math.min(1, budgetSpent / cardBudget) : 0;
  const budgetPercent = Math.round(budgetRatio * 100);

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

  const handleResetAllToZero = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await resetAllCardBalances(0);
    setIsEditModalOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* ── Bank Category / Account Selector Pill Bar ── */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {/* ALL ACCOUNTS / GEKO TOTAL TAB */}
          <TouchableOpacity
            style={[
              styles.bankTab,
              selectedBankId === 'ALL'
                ? { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.3)' }
                : { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedBankId('ALL');
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.tabDot,
                { backgroundColor: selectedBankId === 'ALL' ? '#10B981' : '#64748B' },
              ]}
            />
            <Text
              style={[
                styles.tabText,
                { color: selectedBankId === 'ALL' ? '#FFFFFF' : colors.textMuted },
              ]}
            >
              Geko (Total)
            </Text>
          </TouchableOpacity>

          {/* INDIVIDUAL BANK TABS */}
          {cards.map((c) => {
            const isSelected = selectedBankId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.bankTab,
                  isSelected
                    ? { backgroundColor: c.color1, borderColor: 'rgba(255,255,255,0.4)' }
                    : { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedBankId(c.id);
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.tabDot,
                    { backgroundColor: isSelected ? '#FFFFFF' : c.color1 },
                  ]}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {c.bankName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
        height={340}
      />

      {/* ── Bank Balance & Budget Manager Action Bar ── */}
      <View style={[styles.budgetBarCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
        <View style={styles.budgetHeader}>
          <View style={styles.budgetHeaderLeft}>
            <View style={[styles.bankLogoBadge, { backgroundColor: activeCard ? activeCard.color1 : '#10B981' }]}>
              <Text style={styles.bankLogoBadgeText}>{activeCard ? activeCard.bankName.charAt(0) : 'G'}</Text>
            </View>
            <View>
              <Text style={[styles.budgetTitle, { color: colors.text }]}>
                {activeCard ? `${activeCard.bankName} Account` : 'All Accounts (Geko Total)'}
              </Text>
              <Text style={[styles.budgetSubtitle, { color: colors.textMuted }]}>
                {activeCard
                  ? cardBudget > 0
                    ? `${formatCurrency(budgetSpent)} spent of ${formatCurrency(cardBudget)}`
                    : 'No monthly budget limit'
                  : 'Total balance across all bank cards'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.editBudgetBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
            onPress={() => openCardEditor(activeCard)}
          >
            <Edit3 size={14} color={colors.primary} />
            <Text style={[styles.editBudgetBtnText, { color: colors.primary }]}>
              Edit Money / Budget
            </Text>
          </TouchableOpacity>
        </View>

        {activeCard && cardBudget > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.trackBar, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <View
                style={[
                  styles.fillBar,
                  {
                    width: `${budgetPercent}%`,
                    backgroundColor: budgetPercent > 90 ? '#F43F5E' : activeCard.color1,
                  },
                ]}
              />
            </View>
            <Text style={[styles.percentText, { color: budgetPercent > 90 ? '#F43F5E' : colors.textMuted }]}>
              {budgetPercent}%
            </Text>
          </View>
        )}
      </View>

      {/* ── Spent Today Hero Widget ── */}
      <View
        style={[
          styles.spentCard,
          {
            backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.05)',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}>
            <TrendingDown size={18} color={colors.expense || '#F43F5E'} strokeWidth={2.2} />
          </View>
          <View style={styles.textGroup}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>SPENT TODAY</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(spentToday)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.liveDot, { backgroundColor: colors.primary || '#10B981' }]} />
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>Today's Outflow</Text>
        </View>
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

            {/* Quick Action: Reset All Cards to 0 */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(244, 63, 94, 0.12)',
                paddingVertical: 10,
                borderRadius: 14,
                marginBottom: 16,
                gap: 6,
              }}
              onPress={handleResetAllToZero}
            >
              <X size={14} color="#F43F5E" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#F43F5E' }}>
                Reset All Cards Balance to ₱0.00
              </Text>
            </TouchableOpacity>

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
  /* Tab Bar */
  tabContainer: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  tabScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  bankTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
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
  bankLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLogoBadgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  budgetTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  budgetSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  editBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  editBudgetBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  trackBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 3,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
    width: 34,
    textAlign: 'right',
  },
  /* Spent Today */
  spentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
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
});
