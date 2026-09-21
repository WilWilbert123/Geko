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
  const cardColor1 = activeCard ? activeCard.color1 : '#0F172A';
  const cardColor2 = activeCard ? activeCard.color2 : '#1E293B';
  const accountType = activeCard
    ? (activeCard.type === 'CREDIT_CARD' ? `CREDIT • ${activeCard.bankName.toUpperCase()}` : `DEBIT • ${activeCard.bankName.toUpperCase()}`)
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

      {/* ── 1-Line Squared Side-By-Side Action & Stat Row ── */}
      <View style={styles.actionRowGrid}>
        {/* Left Card: Active Account & Edit Action */}
        <TouchableOpacity
          style={[
            styles.gridCard,
            { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
          ]}
          onPress={() => openCardEditor(activeCard)}
          activeOpacity={0.8}
        >
          <View style={styles.gridCardContent}>
            <View style={[styles.bankLogoBadge, { backgroundColor: activeCard ? activeCard.color1 : '#10B981' }]}>
              <Text style={styles.bankLogoBadgeText}>{activeCard ? activeCard.bankName.charAt(0) : 'G'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={1}>
                {activeCard ? `${activeCard.bankName}` : 'Geko Total'}
              </Text>
              <Text style={[styles.gridSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {activeCard
                  ? cardBudget > 0
                    ? `${formatCurrency(budgetSpent)} / ${formatCurrency(cardBudget)}`
                    : 'Edit Budget'
                  : 'All Accounts'}
              </Text>
            </View>
            <Edit3 size={13} color={colors.primary} />
          </View>
          {activeCard && cardBudget > 0 && (
            <View style={styles.bottomAccentTrack}>
              <View
                style={[
                  styles.bottomAccentFill,
                  {
                    width: `${budgetPercent}%`,
                    backgroundColor: budgetPercent > 90 ? '#F43F5E' : activeCard.color1,
                  },
                ]}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Right Card: Spent Today */}
        <View
          style={[
            styles.gridCard,
            {
              backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.05)',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.gridCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}>
              <TrendingDown size={15} color={colors.expense || '#F43F5E'} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>SPENT TODAY</Text>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                {formatCurrency(spentToday)}
              </Text>
            </View>
          </View>
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

  actionRowGrid: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
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
});
