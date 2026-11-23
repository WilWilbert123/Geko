import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Pressable, ScrollView, TextInput } from 'react-native';
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
  Banknote,
  ArrowDownLeft,
  Check
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
  const [debtTab, setDebtTab] = useState<'owe' | 'lent'>('owe');
  const [showAddForm, setShowAddForm] = useState(false);
  const [counterpartyName, setCounterpartyName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('Personal');

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

  const isLentTx = (t: any) => {
    const note = (t.note || '').toLowerCase();
    const cat = (t.categoryId || '').toLowerCase();
    const bank = (t.bankName || '').toLowerCase();
    return (
      cat === 'lent' ||
      cat === 'pautang' ||
      cat === 'receivable' ||
      note.includes('pautang') ||
      note.includes('owes me') ||
      note.includes('own me') ||
      note.includes('pinautang') ||
      bank.includes('receivable')
    );
  };

  const creditCardsWithDebt = cards.filter((c) => c.type === 'CREDIT_CARD' && (c.outstandingBalance || 0) > 0);
  const totalInstallmentRemaining = installments.reduce(
    (sum, inst) => sum + Math.max(0, inst.totalMonths - inst.paidMonths) * inst.monthlyAmount,
    0
  );

  // Debts I owe
  const utangTransactions = transactions.filter(
    (t) =>
      t.type === 'expense' &&
      !isLentTx(t) &&
      ((t.note || '').toLowerCase().includes('utang') ||
        (t.categoryId || '').toLowerCase().includes('debt') ||
        (t.categoryId || '').toLowerCase().includes('loan') ||
        (t.note || '').toLowerCase().includes('debt'))
  );

  // Money owed to me (Pautang / Receivables)
  const lentTransactions = transactions.filter((t) => isLentTx(t));

  const totalUtang = utangTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalLiabilities = creditDebt + totalInstallmentRemaining + totalUtang;
  const totalLent = lentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

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
        onRequestClose={() => {
          setDebtModalVisible(false);
          setShowAddForm(false);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setDebtModalVisible(false);
            setShowAddForm(false);
          }}
        >
          <Pressable
            style={[
              styles.sheetContainer,
              { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '88%' },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Debt & Payoff Tracker</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                  Liabilities you owe & money lent to others
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight }]}
                onPress={() => {
                  setDebtModalVisible(false);
                  setShowAddForm(false);
                }}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Segmented Control Tabs */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.surfaceHighlight || 'rgba(0,0,0,0.04)',
                borderRadius: 14,
                padding: 4,
                marginBottom: 16,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 11,
                  backgroundColor: debtTab === 'owe' ? (colors.surface || '#FFFFFF') : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: debtTab === 'owe' ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: debtTab === 'owe' ? 2 : 0,
                }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDebtTab('owe');
                  setShowAddForm(false);
                }}
              >
                <TrendingDown size={15} color={debtTab === 'owe' ? '#EF4444' : colors.textMuted} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: debtTab === 'owe' ? '700' : '600',
                    color: debtTab === 'owe' ? colors.text : colors.textMuted,
                  }}
                >
                  I Owe (Utang Ko)
                </Text>
                {creditCardsWithDebt.length + installments.length + utangTransactions.length > 0 && (
                  <View
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>
                      {creditCardsWithDebt.length + installments.length + utangTransactions.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 11,
                  backgroundColor: debtTab === 'lent' ? (colors.surface || '#FFFFFF') : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: debtTab === 'lent' ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: debtTab === 'lent' ? 2 : 0,
                }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDebtTab('lent');
                  setShowAddForm(false);
                }}
              >
                <ArrowDownLeft size={15} color={debtTab === 'lent' ? '#10B981' : colors.textMuted} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: debtTab === 'lent' ? '700' : '600',
                    color: debtTab === 'lent' ? colors.text : colors.textMuted,
                  }}
                >
                  Owed to Me (Pautang)
                </Text>
                {lentTransactions.length > 0 && (
                  <View
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>
                      {lentTransactions.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {debtTab === 'owe' ? (
                /* ── TAB 1: I OWE (UTANG KO) ── */
                <>
                  {/* Total Liabilities Banner */}
                  <View
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.22)',
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
                          Personal Utang: {formatCurrency(totalUtang)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* List of Liabilities */}
                  <View style={{ gap: 10, marginBottom: 16 }}>
                    {creditCardsWithDebt.length === 0 && installments.length === 0 && utangTransactions.length === 0 ? (
                      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#10B981', marginBottom: 4 }}>
                          🎉 Debt-Free!
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
                          No active credit card debt, unpaid installments, or personal utang.
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
                              <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                                {ut.note || 'Personal Debt'}
                              </Text>
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
                </>
              ) : (
                /* ── TAB 2: OWED TO ME (PAUTANG / RECEIVABLES) ── */
                <>
                  {/* Total to Collect Banner */}
                  <View
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderColor: 'rgba(16, 185, 129, 0.25)',
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
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', letterSpacing: 0.8 }}>
                        TOTAL TO COLLECT (PAUTANG)
                      </Text>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 4 }}>
                        {formatCurrency(totalLent)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        {lentTransactions.length} {lentTransactions.length === 1 ? 'person owes you' : 'people owe you'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#10B981', marginTop: 2, fontWeight: '700' }}>
                        Tap Collect when paid
                      </Text>
                    </View>
                  </View>

                  {/* List of Lent Receivables */}
                  <View style={{ gap: 10, marginBottom: 16 }}>
                    {lentTransactions.length === 0 ? (
                      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#10B981', marginBottom: 4 }}>
                          ✨ All Clear! No Pending Collectibles
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textMuted,
                            textAlign: 'center',
                            paddingHorizontal: 16,
                            lineHeight: 18,
                          }}
                        >
                          When friends, family, or colleagues borrow money from you, log it here or in Chat Geko so you
                          always know who owes you.
                        </Text>
                      </View>
                    ) : (
                      lentTransactions.map((lt) => (
                        <View
                          key={lt.id}
                          style={[
                            styles.actionCard,
                            { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                          ]}
                        >
                          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <ArrowDownLeft size={18} color="#10B981" />
                          </View>
                          <View style={styles.actionCardText}>
                            <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                              {lt.note || 'Pautang'}
                            </Text>
                            <Text style={[styles.actionCardSubtitle, { color: colors.textMuted }]}>
                              Collect: {formatCurrency(lt.amount)} • {lt.bankName || 'Personal'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#10B981',
                              paddingHorizontal: 13,
                              paddingVertical: 7,
                              borderRadius: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onPress={async () => {
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              const borrower = (lt.note || '')
                                .replace(/(?:owes?\s+me|pautang(?:\s+kay)?)\s*/gi, '')
                                .trim();
                              await addTransaction({
                                amount: lt.amount,
                                type: 'income',
                                categoryId: 'Debt Repayment',
                                note: `Collected payment from ${borrower || 'borrower'}`,
                                bankName:
                                  lt.bankName && lt.bankName !== 'Personal Receivable' ? lt.bankName : 'Cash',
                                date: Date.now(),
                              });
                              await deleteTransaction(lt.id);
                            }}
                          >
                            <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Collect</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                </>
              )}

              {/* Quick Add Form Section */}
              {showAddForm ? (
                <View
                  style={{
                    backgroundColor: colors.surfaceHighlight || 'rgba(0,0,0,0.03)',
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                    {debtTab === 'owe' ? 'Record New Utang (I Owe)' : 'Record Money Lent (Pautang)'}
                  </Text>
                  <TextInput
                    style={{
                      height: 42,
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      fontSize: 13,
                      color: colors.text,
                      marginBottom: 8,
                    }}
                    placeholder={debtTab === 'owe' ? 'Lender Name (e.g. Cham)' : 'Borrower Name (e.g. Cham)'}
                    placeholderTextColor={colors.textMuted}
                    value={counterpartyName}
                    onChangeText={setCounterpartyName}
                  />
                  <TextInput
                    style={{
                      height: 42,
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      fontSize: 13,
                      color: colors.text,
                      marginBottom: 12,
                    }}
                    placeholder="Amount (₱) (e.g. 500)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={customAmount}
                    onChangeText={setCustomAmount}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        backgroundColor: colors.surfaceHighlight,
                        borderRadius: 10,
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setShowAddForm(false);
                        setCounterpartyName('');
                        setCustomAmount('');
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        backgroundColor: debtTab === 'owe' ? '#EF4444' : '#10B981',
                        borderRadius: 10,
                        alignItems: 'center',
                      }}
                      onPress={async () => {
                        const parsedAmt = parseFloat(customAmount.replace(/[^0-9.]/g, ''));
                        if (!parsedAmt || parsedAmt <= 0) return;
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        const cName = counterpartyName.trim();
                        if (debtTab === 'owe') {
                          await addTransaction({
                            amount: parsedAmt,
                            type: 'expense',
                            categoryId: 'Debt',
                            note: cName ? `Debt to ${cName}` : 'Utang / Debt',
                            bankName: 'Personal Debt',
                            date: Date.now(),
                          });
                        } else {
                          await addTransaction({
                            amount: parsedAmt,
                            type: 'expense',
                            categoryId: 'Lent',
                            note: cName ? `${cName} owes me` : 'Pautang (Owed to Me)',
                            bankName: 'Personal Receivable',
                            date: Date.now(),
                          });
                        }
                        setShowAddForm(false);
                        setCounterpartyName('');
                        setCustomAmount('');
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Save Record</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: debtTab === 'owe' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                    backgroundColor: debtTab === 'owe' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                    marginBottom: 10,
                  }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAddForm(true);
                  }}
                >
                  <Plus size={16} color={debtTab === 'owe' ? '#EF4444' : '#10B981'} strokeWidth={2.5} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: debtTab === 'owe' ? '#EF4444' : '#10B981',
                    }}
                  >
                    {debtTab === 'owe' ? 'Add Utang / Debt I Owe' : 'Record Money Lent (Pautang)'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
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
