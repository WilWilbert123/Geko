import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  Layers,
  PieChart,
  Target,
  ShieldAlert,
  CalendarRange,
  MoreHorizontal,
  Plus,
  ScanLine,
  MessageSquare,
  X,
  CreditCard,
  TrendingDown,
  Banknote
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { InstallmentModal } from './InstallmentModal';
import { BudgetModal } from './BudgetModal';
import { ReceiptScannerModal } from '../receipt/ReceiptScannerModal';
import { useCards } from '../../hooks/useCards';
import { useInstallments } from '../../hooks/useInstallments';
import { useTransactions } from '../../hooks/useTransactions';
import { formatCurrency } from '../../utils/formatters';

export const ActionRow = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { cards, creditDebt, updateCardDetails } = useCards();
  const { installments } = useInstallments();
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const [modalVisible, setModalVisible] = useState(false);
  const [installmentModalVisible, setInstallmentModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [receiptScannerVisible, setReceiptScannerVisible] = useState(false);
  const [debtModalVisible, setDebtModalVisible] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const handlePress = (id: string, actionFn?: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (actionFn) {
      actionFn();
    } else if (id === 'installment') {
      setInstallmentModalVisible(true);
    } else if (id === 'budget') {
      setBudgetModalVisible(true);
    } else if (id === 'debt') {
      setDebtModalVisible(true);
    } else {
      setSelectedFeature(id);
      setModalVisible(true);
    }
  };

  const buttons = [
    {
      id: 'installment',
      icon: Layers,
      label: 'Installment',
      onPress: () => handlePress('installment'),
    },
    {
      id: 'budget',
      icon: PieChart,
      label: 'Budget',
      onPress: () => handlePress('budget'),
    },
    {
      id: 'goals',
      icon: Target,
      label: 'Goals',
      onPress: () => handlePress('goals', () => navigation.navigate('Plan')),
    },
    {
      id: 'debt',
      icon: ShieldAlert,
      label: 'Debt',
      onPress: () => handlePress('debt'),
    },
    {
      id: 'planned',
      icon: CalendarRange,
      label: 'Planned',
      onPress: () => handlePress('planned', () => navigation.navigate('Plan')),
    },
    {
      id: 'more',
      icon: MoreHorizontal,
      label: '... More',
      onPress: () => handlePress('more'),
    },
  ];

  const quickActions = [
    {
      id: 'add',
      title: 'Add Transaction',
      subtitle: 'Record expense or income',
      icon: Plus,
      color: '#10B981',
      onPress: () => {
        setModalVisible(false);
        navigation.navigate('AddTransaction');
      },
    },
    {
      id: 'ai',
      title: 'Ask AI Advisor',
      subtitle: 'Smart budget & spending insights',
      icon: MessageSquare,
      color: '#6366F1',
      onPress: () => {
        setModalVisible(false);
        navigation.navigate('AI');
      },
    },
    {
      id: 'scan',
      title: 'Scan Receipt',
      subtitle: 'AI-assisted optical receipt parser',
      icon: ScanLine,
      color: '#F59E0B',
      onPress: () => {
        setModalVisible(false);
        setReceiptScannerVisible(true);
      },
    },
    {
      id: 'installment_tool',
      title: 'Installment Plans',
      subtitle: 'Track BNPL and fixed monthly installments',
      icon: CreditCard,
      color: '#EC4899',
      onPress: () => {
        setModalVisible(false);
        setInstallmentModalVisible(true);
      },
    },
    {
      id: 'debt_tool',
      title: 'Debt Payoff Tracker',
      subtitle: 'Credit card debt & installment liabilities',
      icon: TrendingDown,
      color: '#EF4444',
      onPress: () => {
        setModalVisible(false);
        setDebtModalVisible(true);
      },
    },
  ];

  const creditCardsWithDebt = cards.filter((c) => c.type === 'CREDIT_CARD' && (c.outstandingBalance || 0) > 0);
  const totalInstallmentRemaining = installments.reduce(
    (sum, inst) => sum + Math.max(0, inst.totalMonths - inst.paidMonths) * inst.monthlyAmount,
    0
  );
  const utangTransactions = transactions.filter(
    (t) =>
      t.type === 'expense' &&
      ((t.note || '').toLowerCase().includes('utang') ||
        (t.categoryId || '').toLowerCase().includes('debt') ||
        (t.categoryId || '').toLowerCase().includes('loan') ||
        (t.note || '').toLowerCase().includes('debt'))
  );
  const totalUtang = utangTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalLiabilities = creditDebt + totalInstallmentRemaining + totalUtang;

  return (
    <>
      <View style={styles.container}>
        {buttons.map((btn) => {
          const Icon = btn.icon;
          return (
            <TouchableOpacity
              key={btn.id}
              style={styles.actionButton}
              activeOpacity={0.65}
              onPress={btn.onPress}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.06)',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Icon size={24} color={colors.text} strokeWidth={1.8} />
              </View>
              <Text
                style={[styles.label, { color: colors.textMuted }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Modern Action Sheet Modal for "... More" and feature actions */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.sheetContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {selectedFeature === 'installment'
                    ? 'Installments'
                    : selectedFeature === 'debt'
                    ? 'Debt Management'
                    : 'Quick Actions'}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                  Explore all financial tools and services
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight }]}
                onPress={() => setModalVisible(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <TouchableOpacity
                    key={action.id}
                    style={[
                      styles.actionCard,
                      {
                        backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.04)',
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={action.onPress}
                  >
                    <View
                      style={[
                        styles.actionIconBox,
                        { backgroundColor: `${action.color}1A` },
                      ]}
                    >
                      <ActionIcon size={20} color={action.color} />
                    </View>
                    <View style={styles.actionCardText}>
                      <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                        {action.title}
                      </Text>
                      <Text
                        style={[styles.actionCardSubtitle, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {action.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Real Installment Plan Manager Modal */}
      <InstallmentModal
        visible={installmentModalVisible}
        onClose={() => setInstallmentModalVisible(false)}
      />

      {/* Real Category Budget Manager Modal */}
      <BudgetModal
        visible={budgetModalVisible}
        onClose={() => setBudgetModalVisible(false)}
      />

      {/* Real Smart Receipt Scanner Modal */}
      <ReceiptScannerModal
        visible={receiptScannerVisible}
        onClose={() => setReceiptScannerVisible(false)}
      />

      {/* Real Debt & Liabilities Payoff Tracker Modal */}
      <Modal
        visible={debtModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDebtModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDebtModalVisible(false)}>
          <Pressable
            style={[
              styles.sheetContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Debt & Payoff Tracker</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                  Credit cards, BNPL installments & recorded utang
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight }]}
                onPress={() => setDebtModalVisible(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Total Liabilities Banner */}
            <View
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                borderWidth: 1,
                borderRadius: 18,
                padding: 16,
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444', letterSpacing: 0.8 }}>
                  TOTAL ACTIVE LIABILITIES
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 4 }}>
                  {formatCurrency(totalLiabilities)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  Credit Debt: {formatCurrency(creditDebt)}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Installments: {formatCurrency(totalInstallmentRemaining)}
                </Text>
                {totalUtang > 0 && (
                  <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 2, fontWeight: '700' }}>
                    Utang / Debts: {formatCurrency(totalUtang)}
                  </Text>
                )}
              </View>
            </View>

            {/* Credit Cards with Outstanding Debt */}
            <View style={{ gap: 10, marginBottom: 16 }}>
              {creditCardsWithDebt.length === 0 && installments.length === 0 && utangTransactions.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#10B981' }}>
                    🎉 Debt-Free! No active credit card debt or unpaid installments.
                  </Text>
                </View>
              ) : (
                <>
                  {creditCardsWithDebt.map((cc) => (
                    <View
                      key={cc.id}
                      style={[
                        styles.actionCard,
                        { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                      ]}
                    >
                      <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <CreditCard size={18} color="#EF4444" />
                      </View>
                      <View style={styles.actionCardText}>
                        <Text style={[styles.actionCardTitle, { color: colors.text }]}>{cc.bankName}</Text>
                        <Text style={[styles.actionCardSubtitle, { color: colors.textMuted }]}>
                          Outstanding: {formatCurrency(cc.outstandingBalance || 0)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#10B981',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 12,
                        }}
                        onPress={async () => {
                          const debtAmt = cc.outstandingBalance || 0;
                          if (debtAmt <= 0) return;
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          await addTransaction({
                            amount: debtAmt,
                            type: 'income',
                            categoryId: 'Deposit',
                            note: `Paid off ${cc.bankName} balance`,
                            bankName: cc.bankName,
                            date: Date.now(),
                          });
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Pay Full</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {installments.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.actionCard,
                        { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                      ]}
                      onPress={() => {
                        setDebtModalVisible(false);
                        setInstallmentModalVisible(true);
                      }}
                    >
                      <View style={[styles.actionIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                        <Layers size={18} color="#EC4899" />
                      </View>
                      <View style={styles.actionCardText}>
                        <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                          {installments.length} Active Installment {installments.length === 1 ? 'Plan' : 'Plans'}
                        </Text>
                        <Text style={[styles.actionCardSubtitle, { color: colors.textMuted }]}>
                          Remaining payoff: {formatCurrency(totalInstallmentRemaining)} • Tap to manage
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {utangTransactions.map((ut) => (
                    <View
                      key={ut.id}
                      style={[
                        styles.actionCard,
                        { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                      ]}
                    >
                      <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <Banknote size={18} color="#EF4444" />
                      </View>
                      <View style={styles.actionCardText}>
                        <Text style={[styles.actionCardTitle, { color: colors.text }]}>{ut.note || 'Personal Debt'}</Text>
                        <Text style={[styles.actionCardSubtitle, { color: colors.textMuted }]}>
                          Liability: {formatCurrency(ut.amount)} • {ut.bankName || 'Personal'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#10B981',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 12,
                        }}
                        onPress={async () => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          await deleteTransaction(ut.id);
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Settle</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 18,
    marginHorizontal: -12,
    paddingHorizontal: 4,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 68,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardText: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionCardSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
});
