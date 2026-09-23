import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useCards, Card } from '../hooks/useCards';
import { formatCurrency } from '../utils/formatters';
import {
  Plus,
  X,
  Check,
  Filter,
  LayoutGrid,
  List,
  Layers,
  Edit3,
  Trash2,
} from 'lucide-react-native';
import { GekoCard3D } from '../components/wallet/GekoCard3D';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 24 - 8) / 2;
const GRID_CARD_HEIGHT = 126;

import { BANK_THEMES, getBankTheme } from '../utils/bankThemes';

export const WalletScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, addCard, updateCardDetails, deleteCard, refresh: refreshCards } = useCards();

  const [refreshing, setRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState<'All' | 'Debit' | 'Credit'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'stack'>('grid');

  // Animation for pre-loaded 2nd tab cards
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0.9);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [viewMode, filterMode]);

  // Add Account Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newAccountType, setNewAccountType] = useState<'EWALLET' | 'BANK' | 'CREDIT_CARD' | 'DEBIT' | 'CASH'>('BANK');
  const [newCreditLimit, setNewCreditLimit] = useState('50000');

  // Edit / Action Modal for individual card
  const [editModalCard, setEditModalCard] = useState<Card | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [editBudget, setEditBudget] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCards();
    require('react-native').DeviceEventEmitter.emit('transactions_updated');
    setRefreshing(false);
  }, [refreshCards]);

  const filteredCards = cards.filter((c) => {
    if (filterMode === 'Debit') return c.type !== 'CREDIT_CARD';
    if (filterMode === 'Credit') return c.type === 'CREDIT_CARD';
    return true;
  });

  // Grouped sections for Stack / Grouped mode matching reference UI
  const groupedSections = React.useMemo(() => {
    const bankCards: Card[] = [];
    const ewalletCards: Card[] = [];
    const creditCards: Card[] = [];
    const cashCards: Card[] = [];

    filteredCards.forEach((c) => {
      const name = (c.bankName || '').toLowerCase();
      if (c.type === 'CREDIT_CARD') {
        creditCards.push(c);
      } else if (c.type === 'EWALLET' || name.includes('gcash') || name.includes('maya') || name.includes('gotyme') || name.includes('maribank') || name.includes('seabank') || name.includes('wise')) {
        ewalletCards.push(c);
      } else if (c.type === 'CASH' || name.includes('cash')) {
        cashCards.push(c);
      } else {
        bankCards.push(c);
      }
    });

    const sumBal = (arr: Card[]) => arr.reduce((acc, c) => acc + (c.type === 'CREDIT_CARD' ? (c.outstandingBalance || 0) : c.balance), 0);

    return [
      { title: 'Bank Accounts', cards: bankCards, totalBalance: sumBal(bankCards) },
      { title: 'E-Wallets', cards: ewalletCards, totalBalance: sumBal(ewalletCards) },
      { title: 'Credit Cards', cards: creditCards, totalBalance: sumBal(creditCards) },
      { title: 'Cash Assets', cards: cashCards, totalBalance: sumBal(cashCards) },
    ];
  }, [filteredCards]);

  const handleCreateAccount = async () => {
    const name = newBankName.trim();
    if (!name) {
      Alert.alert('Missing Name', 'Please enter an account or bank name (e.g. GCash, BPI, Maya).');
      return;
    }

    const bal = parseFloat(newBalance.replace(/,/g, '')) || 0;
    const limit = parseFloat(newCreditLimit.replace(/,/g, '')) || 0;
    const theme = getBankTheme(name);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addCard({
        bankName: name,
        balance: bal,
        type: newAccountType,
        creditLimit: limit,
        color1: theme.bg1,
        color2: theme.bg2,
        paymentNetwork: theme.network,
      });

      require('react-native').DeviceEventEmitter.emit('transactions_updated');
      setNewBankName('');
      setNewBalance('');
      setAddModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to create account.');
    }
  };

  const handleOpenEditModal = (card: Card) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditModalCard(card);
    setEditBalance(String(card.type === 'CREDIT_CARD' ? (card.outstandingBalance || 0) : card.balance));
    setEditBudget(card.budget ? String(card.budget) : '');
  };

  const handleSaveEdit = async () => {
    if (!editModalCard) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newBal = parseFloat(editBalance.replace(/,/g, '')) || 0;
    const newBud = parseFloat(editBudget.replace(/,/g, '')) || 0;
    await updateCardDetails(editModalCard.id, newBal, newBud);
    require('react-native').DeviceEventEmitter.emit('transactions_updated');
    setEditModalCard(null);
  };

  const handleDeleteCard = async (card: Card) => {
    Alert.alert('Delete Account', `Are you sure you want to remove ${card.bankName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await deleteCard(card.id);
          setEditModalCard(null);
        },
      },
    ]);
  };

  // EMV Chip Component
  const EMVChip = () => (
    <View style={styles.chipOuter}>
      <View style={styles.chipInnerHoriz} />
      <View style={styles.chipInnerVert} />
    </View>
  );

  // Mastercard Interlocking Circles Logo
  const MastercardLogo = () => (
    <View style={styles.mcContainer}>
      <View style={[styles.mcCircle, { backgroundColor: '#EB001B' }]} />
      <View style={[styles.mcCircle, { backgroundColor: '#F79E1B', marginLeft: -6, opacity: 0.95 }]} />
    </View>
  );

  // Visa Logo
  const VisaLogo = ({ color = '#FFFFFF' }: { color?: string }) => (
    <Text style={[styles.visaText, { color }]}>VISA</Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── Fixed Header Row ── */}
      <View style={styles.topHeaderBar}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Accounts</Text>
        <TouchableOpacity
          style={[styles.addAccountBtn, { backgroundColor: `${colors.primary}18` }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAddModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Plus size={15} color={colors.primary} />
          <Text style={[styles.addAccountText, { color: colors.primary }]}>Add Account</Text>
        </TouchableOpacity>
      </View>

      {/* ── Subtitle & View Controls Bar ── */}
      <View style={styles.controlsBar}>
        <Text style={[styles.subtitleText, { color: colors.textMuted }]}>
          {viewMode === 'stack' ? 'Grouped by wallet type.' : viewMode === 'list' ? 'List view of all wallets.' : 'Hold wallet to rearrange.'}
        </Text>

        {/* View Switcher Capsule Toolbar (Matching Reference Images 1 & 2) */}
        <View style={[styles.viewToolbarCapsule, { backgroundColor: colors.surfaceHighlight || '#F1F5F9' }]}>
          <TouchableOpacity
            style={[styles.viewToolBtn, filterMode !== 'All' && styles.viewToolBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilterMode(filterMode === 'All' ? 'Debit' : filterMode === 'Debit' ? 'Credit' : 'All');
            }}
          >
            <Filter size={15} color={filterMode !== 'All' ? '#FFFFFF' : colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewToolBtn, viewMode === 'grid' && styles.viewToolBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('grid');
            }}
          >
            <LayoutGrid size={15} color={viewMode === 'grid' ? '#FFFFFF' : colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewToolBtn, viewMode === 'list' && styles.viewToolBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('list');
            }}
          >
            <List size={15} color={viewMode === 'list' ? '#FFFFFF' : colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewToolBtn, viewMode === 'stack' && styles.viewToolBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('stack');
            }}
          >
            <Layers size={15} color={viewMode === 'stack' ? '#FFFFFF' : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main Content Scroll Area with Slide-Down Spring Bounce ── */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
        {/* 1. Grid Mode View */}
        {viewMode === 'grid' && (
          <View style={styles.cardsGrid}>
            {filteredCards.map((card) => {
              const theme = getBankTheme(card.bankName, card.color1, card.color2);
              const isCredit = card.type === 'CREDIT_CARD';
              const displayBal = isCredit ? (card.outstandingBalance || 0) : card.balance;

              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.cardItem3D, { backgroundColor: card.color1 || theme.bg1 }]}
                  activeOpacity={0.92}
                  onPress={() => handleOpenEditModal(card)}
                >
                  <GekoCard3D
                    balance={displayBal}
                    cardholderName="GEKO MEMBER"
                    expiryDate="10/29"
                    accountType={card.type}
                    bankName={card.bankName}
                    color1={card.color1 || theme.bg1}
                    color2={card.color2 || theme.bg2}
                    height={GRID_CARD_HEIGHT}
                    interactive={false}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 2. Stacked / Grouped Mode View (Matching 2nd Reference Image) */}
        {viewMode === 'stack' && (
          <View style={styles.stackedContainer}>
            {groupedSections.map((section) => {
              if (section.cards.length === 0) return null;
              return (
                <View key={section.title} style={styles.sectionGroupBlock}>
                  {/* Group Section Header */}
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={[styles.sectionTitleText, { color: colors.text }]}>{section.title}</Text>
                      <Text style={[styles.sectionCountText, { color: colors.textMuted }]}>
                        {section.cards.length} {section.cards.length === 1 ? 'wallet' : 'wallets'}
                      </Text>
                    </View>
                    <Text style={[styles.sectionTotalVal, { color: colors.text }]}>
                      {formatCurrency(section.totalBalance)}
                    </Text>
                  </View>

                  {/* Horizontal Card Deck Carousel */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalCardCarousel}
                  >
                    {section.cards.map((card) => {
                      const theme = getBankTheme(card.bankName, card.color1, card.color2);
                      const isCredit = card.type === 'CREDIT_CARD';
                      const displayBal = isCredit ? (card.outstandingBalance || 0) : card.balance;

                      return (
                        <TouchableOpacity
                          key={card.id}
                          style={[styles.stackedCardItem3D, { backgroundColor: card.color1 || theme.bg1 }]}
                          activeOpacity={0.92}
                          onPress={() => handleOpenEditModal(card)}
                        >
                          <GekoCard3D
                            balance={displayBal}
                            cardholderName="GEKO MEMBER"
                            expiryDate="10/29"
                            accountType={card.type}
                            bankName={card.bankName}
                            color1={card.color1 || theme.bg1}
                            color2={card.color2 || theme.bg2}
                            height={142}
                            interactive={false}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        )}

        {/* 3. List Mode View */}
        {viewMode === 'list' && (
          <View style={styles.listViewContainer}>
            {filteredCards.map((card) => {
              const theme = getBankTheme(card.bankName, card.color1, card.color2);
              const isCredit = card.type === 'CREDIT_CARD';
              const displayBal = isCredit ? (card.outstandingBalance || 0) : card.balance;

              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.listItemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => handleOpenEditModal(card)}
                >
                  <View style={[styles.listIconBadge, { backgroundColor: theme.bg1 }]}>
                    <Text style={styles.listIconText}>{card.bankName.charAt(0).toUpperCase()}</Text>
                  </View>

                  <View style={styles.listMidInfo}>
                    <Text style={[styles.listBankTitle, { color: colors.text }]}>{card.bankName}</Text>
                    <Text style={[styles.listAccountType, { color: colors.textMuted }]}>
                      {isCredit ? 'Credit Card' : card.type === 'EWALLET' ? 'E-Wallet' : card.type === 'CASH' ? 'Cash Wallet' : 'Bank Account'}
                    </Text>
                  </View>

                  <View style={styles.listRightBal}>
                    <Text style={[styles.listBalText, { color: colors.text }]}>
                      {formatCurrency(displayBal)}
                    </Text>
                    {isCredit && (
                      <Text style={[styles.listSubBal, { color: colors.textMuted }]}>Outstanding Debt</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {/* ── Add Account Modal ── */}
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
              placeholder="e.g. GCash, GoTyme, BPI, Maya, BDO"
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

      {/* ── Edit Card Options Modal ── */}
      {editModalCard && (
        <Modal
          visible={!!editModalCard}
          transparent
          animationType="fade"
          onRequestClose={() => setEditModalCard(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editModalCard.bankName} Account
                </Text>
                <TouchableOpacity onPress={() => setEditModalCard(null)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                {editModalCard.type === 'CREDIT_CARD' ? 'Outstanding Credit Debt (₱)' : 'Current Balance (₱)'}
              </Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                keyboardType="numeric"
                value={editBalance}
                onChangeText={setEditBalance}
              />

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Monthly Budget Limit (₱)</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={editBudget}
                onChangeText={setEditBudget}
              />

              <View style={styles.editModalBtnRow}>
                <TouchableOpacity
                  style={[styles.saveEditBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Edit3 size={16} color="#fff" />
                  <Text style={styles.createBtnText}>Save Changes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteCardBtn}
                  onPress={() => handleDeleteCard(editModalCard)}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
  },
  addAccountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  viewToolbarCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 3,
    gap: 3,
  },
  viewToolBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToolBtnActive: {
    backgroundColor: '#1E293B',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardItem3D: {
    width: CARD_WIDTH,
    height: GRID_CARD_HEIGHT,
    borderRadius: 16,
    position: 'relative',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  // Stacked Grouped Mode Styles
  stackedContainer: {
    gap: 20,
  },
  sectionGroupBlock: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionTotalVal: {
    fontSize: 16,
    fontWeight: '700',
  },
  horizontalCardCarousel: {
    gap: 12,
    paddingRight: 16,
  },
  stackedCardItem3D: {
    width: 226,
    height: 142,
    borderRadius: 16,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  // List Mode View Styles
  listViewContainer: {
    gap: 10,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  listIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listIconText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  listMidInfo: {
    flex: 1,
  },
  listBankTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  listAccountType: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  listRightBal: {
    alignItems: 'flex-end',
  },
  listBalText: {
    fontSize: 15,
    fontWeight: '700',
  },
  listSubBal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 2,
  },
  optionsDotBtnOverlay: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cardItem: {
    width: CARD_WIDTH,
    height: 125,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrandLogo: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  optionsDotBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMidRow: {
    marginVertical: 4,
  },
  chipOuter: {
    width: 24,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#E5C158',
    borderWidth: 1,
    borderColor: '#B8972E',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  chipInnerHoriz: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginVertical: 2,
  },
  chipInnerVert: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    position: 'absolute',
    left: 11,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardBalanceLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    opacity: 0.85,
  },
  cardBalanceVal: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 1,
  },
  creditProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  creditProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  mcContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  visaText: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  otherNetworkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 16,
    marginTop: 24,
    gap: 8,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  editModalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  saveEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    gap: 8,
  },
  deleteCardBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
