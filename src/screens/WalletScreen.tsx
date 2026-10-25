import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  Platform,
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
  Search,
  Sparkles,
  RotateCcw,
  CreditCard,
  Smartphone,
  Zap,
  Ticket,
  Gem,
  Landmark,
  Globe,
  ChevronRight,
} from 'lucide-react-native';
import { GekoCard3D } from '../components/wallet/GekoCard3D';
import { MiniRealCard } from '../components/wallet/MiniRealCard';
import { SkeletonCardListItem, SkeletonCard3D } from '../components/common/Skeleton';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_HEIGHT = 126;

import { BANK_THEMES, getBankTheme } from '../utils/bankThemes';
import {
  ALL_CARD_PRESETS,
  CREDIT_CARD_PRESETS,
  EWALLET_PRESETS,
  PHILIPPINE_BANK_PRESETS,
  CardPreset,
  PresetCategory,
  searchPresets,
} from '../utils/cardPresets';

const POPULAR_QUICK_PRESETS: CardPreset[] = [
  ALL_CARD_PRESETS.find((p) => p.id === 'gcash-ewallet') || ALL_CARD_PRESETS[0],
  ALL_CARD_PRESETS.find((p) => p.id === 'maya-visa-card') || ALL_CARD_PRESETS[1],
  ALL_CARD_PRESETS.find((p) => p.id === 'gotyme-bank') || ALL_CARD_PRESETS[2],
  ALL_CARD_PRESETS.find((p) => p.id === 'bpi-rewards') || ALL_CARD_PRESETS[3],
  ALL_CARD_PRESETS.find((p) => p.id === 'bdo-shopmore-mastercard') || ALL_CARD_PRESETS[4],
  ALL_CARD_PRESETS.find((p) => p.id === 'unionbank-rewards-visa') || ALL_CARD_PRESETS[5],
  ALL_CARD_PRESETS.find((p) => p.id === 'maribank-ph') || ALL_CARD_PRESETS[6],
  ALL_CARD_PRESETS.find((p) => p.id === 'beep-card') || ALL_CARD_PRESETS[7],
].filter(Boolean);

export const WalletScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, isLoading, addCard, updateCardDetails, deleteCard, clearAllCards, refresh: refreshCards } = useCards();

  const [refreshing, setRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'CREDIT' | 'DIGITAL' | 'EWALLET' | 'PREPAID' | 'MEMBERSHIP' | 'BANK' | 'VISA'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'stack'>('grid');

  // Animation for view mode transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0.92);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [viewMode, filterCategory]);

  // ── Add Account Modal State ──
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [presetCategory, setPresetCategory] = useState<PresetCategory | 'CUSTOM'>('ALL');
  const [presetSearch, setPresetSearch] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<CardPreset | null>(null);

  const [newBankName, setNewBankName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newAccountType, setNewAccountType] = useState<'EWALLET' | 'BANK' | 'CREDIT_CARD' | 'DEBIT' | 'CASH'>('EWALLET');
  const [newCreditLimit, setNewCreditLimit] = useState('50000');
  const [newColor1, setNewColor1] = useState('#0026B3');
  const [newColor2, setNewColor2] = useState('#0055FF');
  const [newNetwork, setNewNetwork] = useState<'VISA' | 'MASTERCARD' | 'OTHER'>('OTHER');

  // ── Edit Modal State ──
  const [editModalCard, setEditModalCard] = useState<Card | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [editBudget, setEditBudget] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCards();
    require('react-native').DeviceEventEmitter.emit('transactions_updated');
    setRefreshing(false);
  }, [refreshCards]);

  // Card filter logic
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const name = (c.bankName || '').toLowerCase();
      const net = (c.paymentNetwork || '').toLowerCase();
      const isCredit = c.type === 'CREDIT_CARD' || name.includes('credit') || (name.includes('card') && !name.includes('beep') && !name.includes('rfid') && !name.includes('rewards') && !name.includes('perks') && !name.includes('suki') && !name.includes('smac'));
      const isPrepaid =
        name.includes('beep') ||
        name.includes('starbucks') ||
        name.includes('autosweep') ||
        name.includes('easytrip') ||
        name.includes('rfid');
      const isMembership =
        name.includes('7-eleven') ||
        name.includes('7eleven') ||
        name.includes('bistro') ||
        name.includes('landers') ||
        name.includes('mercury') ||
        name.includes('laking') ||
        name.includes('national book') ||
        name.includes('puregold') ||
        name.includes('robinsons') ||
        name.includes('smac') ||
        name.includes('advantage');
      const isDigital =
        name.includes('gotyme') ||
        name.includes('cimb') ||
        name.includes('maribank') ||
        name.includes('salmon') ||
        name.includes('komo') ||
        name.includes('tonik') ||
        name.includes('ownbank') ||
        name.includes('diskartech') ||
        name.includes('uno') ||
        name.includes('uniondigital') ||
        name.includes('ofbank') ||
        name.includes('netbank');
      const isEwallet =
        (c.type === 'EWALLET' ||
          name.includes('gcash') ||
          name.includes('maya') ||
          name.includes('zed') ||
          name.includes('grab') ||
          name.includes('shopee') ||
          name.includes('wise') ||
          name.includes('cliqq') ||
          name.includes('palawan') ||
          name.includes('paypal') ||
          name.includes('luvit') ||
          name.includes('payoneer')) && !isPrepaid && !isMembership && !isDigital;

      if (filterCategory === 'CREDIT') return isCredit;
      if (filterCategory === 'DIGITAL') return isDigital;
      if (filterCategory === 'PREPAID') return isPrepaid;
      if (filterCategory === 'MEMBERSHIP') return isMembership;
      if (filterCategory === 'EWALLET') return isEwallet && !isCredit;
      if (filterCategory === 'BANK') return !isCredit && !isEwallet && !isDigital && !isPrepaid && !isMembership && c.type !== 'CASH';
      if (filterCategory === 'VISA') return net.includes('visa') || name.includes('visa');
      return true;
    });
  }, [cards, filterCategory]);

  // Filtered preset cards inside Add Account Modal
  const modalPresets = useMemo(() => {
    if (presetCategory === 'CUSTOM') return [];
    return searchPresets(presetSearch, presetCategory);
  }, [presetCategory, presetSearch]);

  // Grouped sections for Stack / Grouped mode
  const groupedSections = useMemo(() => {
    const digitalCards: Card[] = [];
    const prepaidCards: Card[] = [];
    const membershipCards: Card[] = [];
    const ewalletCards: Card[] = [];
    const creditCards: Card[] = [];
    const bankCards: Card[] = [];
    const cashCards: Card[] = [];

    filteredCards.forEach((c) => {
      const name = (c.bankName || '').toLowerCase();
      const isCredit = c.type === 'CREDIT_CARD' || name.includes('credit') || (name.includes('card') && !name.includes('beep') && !name.includes('rfid') && !name.includes('rewards') && !name.includes('perks') && !name.includes('suki') && !name.includes('smac'));
      const isPrepaid =
        name.includes('beep') ||
        name.includes('starbucks') ||
        name.includes('autosweep') ||
        name.includes('easytrip') ||
        name.includes('rfid');
      const isMembership =
        name.includes('7-eleven') ||
        name.includes('7eleven') ||
        name.includes('bistro') ||
        name.includes('landers') ||
        name.includes('mercury') ||
        name.includes('laking') ||
        name.includes('national book') ||
        name.includes('puregold') ||
        name.includes('robinsons') ||
        name.includes('smac') ||
        name.includes('advantage');
      const isDigital =
        name.includes('gotyme') ||
        name.includes('cimb') ||
        name.includes('maribank') ||
        name.includes('salmon') ||
        name.includes('komo') ||
        name.includes('tonik') ||
        name.includes('ownbank') ||
        name.includes('diskartech') ||
        name.includes('uno') ||
        name.includes('uniondigital') ||
        name.includes('ofbank') ||
        name.includes('netbank');

      if (isCredit) {
        creditCards.push(c);
      } else if (isDigital) {
        digitalCards.push(c);
      } else if (isPrepaid) {
        prepaidCards.push(c);
      } else if (isMembership) {
        membershipCards.push(c);
      } else if (
        c.type === 'EWALLET' ||
        name.includes('gcash') ||
        name.includes('maya') ||
        name.includes('zed') ||
        name.includes('grab') ||
        name.includes('shopee') ||
        name.includes('wise') ||
        name.includes('cliqq') ||
        name.includes('palawan') ||
        name.includes('paypal') ||
        name.includes('luvit') ||
        name.includes('payoneer')
      ) {
        ewalletCards.push(c);
      } else if (c.type === 'CASH' || name.includes('cash')) {
        cashCards.push(c);
      } else {
        bankCards.push(c);
      }
    });

    const sumBal = (arr: Card[]) =>
      arr.reduce((acc, c) => acc + (c.type === 'CREDIT_CARD' ? (c.outstandingBalance || 0) : c.balance), 0);

    return [
      { title: 'Digital Banks', cards: digitalCards, totalBalance: sumBal(digitalCards) },
      { title: 'Credit Cards', cards: creditCards, totalBalance: sumBal(creditCards) },
      { title: 'E-Wallets', cards: ewalletCards, totalBalance: sumBal(ewalletCards) },
      { title: 'Prepaid & Transit', cards: prepaidCards, totalBalance: sumBal(prepaidCards) },
      { title: 'Membership & Loyalty', cards: membershipCards, totalBalance: sumBal(membershipCards) },
      { title: 'Universal & Commercial Banks', cards: bankCards, totalBalance: sumBal(bankCards) },
      { title: 'Cash Assets', cards: cashCards, totalBalance: sumBal(cashCards) },
    ];
  }, [filteredCards]);

  const handleSelectPreset = (preset: CardPreset) => {
    Haptics.selectionAsync();
    setSelectedPreset(preset);
    setNewBankName(preset.name);
    setNewAccountType(preset.type);
    setNewColor1(preset.color1);
    setNewColor2(preset.color2);
    setNewNetwork(preset.network);
    if (preset.type === 'CREDIT_CARD') {
      setNewCreditLimit(String(preset.defaultCreditLimit || 50000));
    }
  };

  const handleOpenAddWithPreset = (preset?: CardPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (preset) {
      setSelectedPreset(preset);
      setNewBankName(preset.name);
      setNewAccountType(preset.type);
      setNewColor1(preset.color1);
      setNewColor2(preset.color2);
      setNewNetwork(preset.network);
      if (preset.type === 'CREDIT_CARD') {
        setNewCreditLimit(String(preset.defaultCreditLimit || 50000));
      }
      const cat = preset.category === 'DEBIT' ? 'BANK' : preset.category;
      setPresetCategory(cat as PresetCategory);
    } else {
      setSelectedPreset(null);
      setNewBankName('');
      setNewBalance('');
      setPresetCategory('ALL');
    }
    setAddModalVisible(true);
  };

  const handleResetAllCards = () => {
    Alert.alert(
      'Reset All Accounts?',
      'This will remove all registered cards and bank accounts to return your wallet to a clean blank slate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to Blank',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllCards();
          },
        },
      ]
    );
  };

  const handleCreateAccount = async () => {
    const name = newBankName.trim();
    if (!name) {
      Alert.alert('Missing Name', 'Please select a card preset or enter an account name.');
      return;
    }

    const bal = parseFloat(newBalance.replace(/,/g, '')) || 0;
    const limit = parseFloat(newCreditLimit.replace(/,/g, '')) || 0;
    const theme = getBankTheme(name, newColor1, newColor2);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addCard({
        bankName: name,
        balance: bal,
        type: newAccountType,
        creditLimit: limit,
        outstandingBalance: newAccountType === 'CREDIT_CARD' ? bal : 0,
        color1: newColor1 || theme.bg1,
        color2: newColor2 || theme.bg2,
        paymentNetwork: newNetwork || theme.network,
      });

      require('react-native').DeviceEventEmitter.emit('transactions_updated');
      setNewBankName('');
      setNewBalance('');
      setSelectedPreset(null);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── Fixed Header Row ── */}
      <View style={styles.topHeaderBar}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Accounts</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
            {cards.length} {cards.length === 1 ? 'account' : 'accounts'} registered
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {cards.length > 0 && (
            <TouchableOpacity
              style={[styles.resetCardsBtn, { backgroundColor: colors.surfaceHighlight || '#F1F5F9' }]}
              onPress={handleResetAllCards}
              activeOpacity={0.8}
            >
              <RotateCcw size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.addAccountBtn, { backgroundColor: `${colors.primary}18` }]}
            onPress={() => handleOpenAddWithPreset()}
            activeOpacity={0.8}
          >
            <Plus size={15} color={colors.primary} />
            <Text style={[styles.addAccountText, { color: colors.primary }]}>Add Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Subtitle & View Controls Bar (Only when cards exist) ── */}
      {cards.length > 0 && (
        <View style={styles.controlsBar}>
          <Text style={[styles.subtitleText, { color: colors.textMuted }]}>
            {viewMode === 'stack' ? 'Grouped by category.' : viewMode === 'list' ? 'List view of all cards.' : 'Hold card to inspect & edit.'}
          </Text>

          {/* View Switcher Capsule Toolbar */}
          <View style={[styles.viewToolbarCapsule, { backgroundColor: colors.surfaceHighlight || '#F1F5F9' }]}>
            <TouchableOpacity
              style={[styles.viewToolBtn, filterCategory !== 'ALL' && styles.viewToolBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterCategory((prev) =>
                  prev === 'ALL'
                    ? 'CREDIT'
                    : prev === 'CREDIT'
                      ? 'DIGITAL'
                      : prev === 'DIGITAL'
                        ? 'EWALLET'
                        : prev === 'EWALLET'
                          ? 'PREPAID'
                          : prev === 'PREPAID'
                            ? 'MEMBERSHIP'
                            : prev === 'MEMBERSHIP'
                              ? 'BANK'
                              : prev === 'BANK'
                                ? 'VISA'
                                : 'ALL'
                );
              }}
            >
              <Filter size={15} color={filterCategory !== 'ALL' ? '#FFFFFF' : colors.textMuted} />
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
      )}

      {/* ── Category Filter Pills Bar (Only when cards exist) ── */}
      {cards.length > 0 && (
        <View style={styles.categoryFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterScroll}
          >
            {[
              { key: 'ALL', label: 'All Accounts', icon: LayoutGrid },
              { key: 'CREDIT', label: 'Credit Cards', icon: CreditCard },
              { key: 'DIGITAL', label: 'Digital Banks', icon: Smartphone },
              { key: 'EWALLET', label: 'E-Wallets', icon: Zap },
              { key: 'PREPAID', label: 'Prepaid & Transit', icon: Ticket },
              { key: 'MEMBERSHIP', label: 'Memberships', icon: Gem },
              { key: 'BANK', label: 'Banks', icon: Landmark },
              { key: 'VISA', label: 'Visa', icon: Globe },
            ].map((cat) => {
              const isActive = filterCategory === cat.key;
              const IconComp = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryPill,
                    { flexDirection: 'row', alignItems: 'center', gap: 6 },
                    isActive
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surfaceHighlight || '#F1F5F9', borderColor: colors.border },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFilterCategory(cat.key as any);
                  }}
                >
                  <IconComp size={14} color={isActive ? '#FFFFFF' : colors.textMuted} />
                  <Text style={[styles.categoryPillText, { color: isActive ? '#FFFFFF' : colors.text }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Main Content Scroll Area with Animation ── */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* ── Skeleton Loading State ── */}
          {isLoading && (
            <View style={{ gap: 12 }}>
              {viewMode === 'list' ? (
                <>
                  <SkeletonCardListItem />
                  <SkeletonCardListItem />
                  <SkeletonCardListItem />
                  <SkeletonCardListItem />
                </>
              ) : (
                <>
                  <SkeletonCard3D />
                  <SkeletonCard3D />
                </>
              )}
            </View>
          )}

          {/* ── Blank Slate Empty State (When no cards connected) ── */}
          {!isLoading && cards.length === 0 && (
            <View style={styles.blankSlateContainer}>
              {/* Sleek card silhouette preview */}
              <View style={[styles.blankCardFrame, { borderColor: `${colors.primary}44`, backgroundColor: colors.surfaceHighlight || '#111827' }]}>
                <View style={styles.blankCardGlow} />
                <View style={styles.blankCardInner}>
                  <View style={styles.blankCardTop}>
                    <View style={styles.blankChipSim} />
                    <Sparkles size={20} color={colors.primary} />
                  </View>
                  <View style={styles.blankCardBottom}>
                    <Text style={[styles.blankCardNumber, { color: colors.textMuted }]}>•••• •••• •••• ••••</Text>
                    <View style={styles.blankCardRow}>
                      <Text style={[styles.blankCardHolder, { color: colors.textMuted }]}>NO CARDS YET</Text>
                      <Text style={[styles.blankCardExpiry, { color: colors.textMuted }]}>MM/YY</Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={[styles.blankSlateTitle, { color: colors.text }]}>No Cards Connected</Text>
              <Text style={[styles.blankSlateSubtitle, { color: colors.textMuted }]}>
                Your wallet is currently blank. Tap below to connect your first bank account, e-wallet, or credit card with realistic 3D textures.
              </Text>

              {/* Primary Connect Button */}
              <TouchableOpacity
                style={[styles.blankSlateCta, { backgroundColor: colors.primary }]}
                onPress={() => handleOpenAddWithPreset()}
                activeOpacity={0.85}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.blankSlateCtaText}>Connect Your First Card</Text>
              </TouchableOpacity>

              {/* Quick Pick Presets */}
              <View style={styles.quickPickSection}>
                <Text style={[styles.quickPickHeader, { color: colors.textMuted }]}>
                  POPULAR PHILIPPINE CARDS & WALLETS
                </Text>
                <View style={styles.quickPickChipsWrap}>
                  {POPULAR_QUICK_PRESETS.map((preset, idx) => (
                    <TouchableOpacity
                      key={`quick-pick-${preset.id}-${idx}`}
                      style={[
                        styles.quickPickChip,
                        { backgroundColor: colors.surfaceHighlight || '#1E293B', borderColor: colors.border },
                      ]}
                      onPress={() => handleOpenAddWithPreset(preset)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.quickPickDot, { backgroundColor: preset.color1 }]} />
                      <Text style={[styles.quickPickText, { color: colors.text }]}>{preset.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* 1. Grid Mode View */}
          {cards.length > 0 && viewMode === 'grid' && (
            <View style={styles.cardsGrid}>
              {filteredCards.map((card, idx) => {
                const theme = getBankTheme(card.bankName, card.color1, card.color2);
                const isCredit = card.type === 'CREDIT_CARD';
                const displayBal = isCredit ? (card.outstandingBalance || 0) : card.balance;

                return (
                  <TouchableOpacity
                    key={`card-grid-${card.id}-${idx}`}
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
                      paymentNetwork={card.paymentNetwork || theme.network}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 2. Stacked / Grouped Mode View */}
          {cards.length > 0 && viewMode === 'stack' && (
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
                      {section.cards.map((card, idx) => {
                        const theme = getBankTheme(card.bankName, card.color1, card.color2);
                        const isCredit = card.type === 'CREDIT_CARD';
                        const displayBal = isCredit ? (card.outstandingBalance || 0) : card.balance;

                        return (
                          <TouchableOpacity
                            key={`card-stack-${card.id}-${idx}`}
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
                              paymentNetwork={card.paymentNetwork || theme.network}
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
          {cards.length > 0 && viewMode === 'list' && (
            <View style={styles.listViewContainer}>
              {/* Summary Stats Strip for List View */}
              {filteredCards.length > 0 && (
                <View style={[styles.listStatsBar, { backgroundColor: colors.surfaceHighlight || '#1E293B', borderColor: colors.border }]}>
                  <View style={styles.listStatsLeft}>
                    <Text style={[styles.listStatsLabel, { color: colors.textMuted }]}>
                      {filterCategory === 'ALL'
                        ? 'TOTAL ASSETS'
                        : `${filterCategory} ACCOUNTS`}
                    </Text>
                    <Text style={[styles.listStatsValue, { color: colors.text }]}>
                      {formatCurrency(
                        filteredCards.reduce((acc, c) => acc + (c.type === 'CREDIT_CARD' ? 0 : c.balance), 0)
                      )}
                    </Text>
                  </View>

                  <View style={styles.listStatsRight}>
                    {filteredCards.some((c) => c.type === 'CREDIT_CARD' && (c.outstandingBalance || 0) > 0) ? (
                      <View style={styles.listStatsDebtBadge}>
                        <Text style={styles.listStatsDebtLabel}>DEBT</Text>
                        <Text style={styles.listStatsDebtValue}>
                          {formatCurrency(
                            filteredCards.reduce((acc, c) => acc + (c.type === 'CREDIT_CARD' ? (c.outstandingBalance || 0) : 0), 0)
                          )}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.listCountPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.listCountPillText, { color: colors.textMuted }]}>
                          {filteredCards.length} {filteredCards.length === 1 ? 'account' : 'accounts'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Empty state when category filter returns 0 cards */}
              {filteredCards.length === 0 && (
                <View style={[styles.listEmptyFilterState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <CreditCard size={28} color={colors.textMuted} />
                  <Text style={[styles.listEmptyFilterTitle, { color: colors.text }]}>
                    No {filterCategory.toLowerCase()} accounts
                  </Text>
                  <Text style={[styles.listEmptyFilterSub, { color: colors.textMuted }]}>
                    You don't have any accounts registered under this category yet.
                  </Text>
                  <TouchableOpacity
                    style={[styles.listEmptyFilterBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setFilterCategory('ALL')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.listEmptyFilterBtnText}>View All Accounts</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Cards List */}
              {filteredCards.map((card, idx) => {
                const theme = getBankTheme(card.bankName, card.color1, card.color2);
                const isCredit = card.type === 'CREDIT_CARD';
                const displayBal = isCredit ? (card.outstandingBalance || 0) : card.balance;
                const isCash = card.type === 'CASH' || card.bankName.toLowerCase().includes('cash');
                const isDigital = card.bankName.toLowerCase().includes('gotyme') || card.bankName.toLowerCase().includes('cimb') || card.bankName.toLowerCase().includes('tonik') || card.bankName.toLowerCase().includes('seabank') || card.bankName.toLowerCase().includes('maribank');
                const isEwallet = !isCredit && !isCash && (card.type === 'EWALLET' || card.bankName.toLowerCase().includes('gcash') || card.bankName.toLowerCase().includes('maya') || card.bankName.toLowerCase().includes('wallet'));

                const categoryLabel = isCredit
                  ? 'Credit'
                  : isCash
                    ? 'Cash'
                    : isDigital
                      ? 'Digital Bank'
                      : isEwallet
                        ? 'E-Wallet'
                        : 'Bank';

                const badgeBg = isCredit
                  ? 'rgba(239, 68, 68, 0.12)'
                  : isCash
                    ? 'rgba(16, 185, 129, 0.12)'
                    : isDigital
                      ? 'rgba(168, 85, 247, 0.12)'
                      : isEwallet
                        ? 'rgba(59, 130, 246, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)';

                const badgeTextColor = isCredit
                  ? '#F87171'
                  : isCash
                    ? '#34D399'
                    : isDigital
                      ? '#C084FC'
                      : isEwallet
                        ? '#60A5FA'
                        : '#FBBF24';

                const networkLabel = (card.paymentNetwork || theme.network) === 'OTHER'
                  ? (card.type === 'CASH' ? 'Cash Wallet' : theme.network !== 'OTHER' ? theme.network : 'Account')
                  : (card.paymentNetwork || theme.network);

                return (
                  <TouchableOpacity
                    key={`card-list-${card.id}-${idx}`}
                    style={[
                      styles.listItemRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleOpenEditModal(card);
                    }}
                  >
                    {/* Realistic Miniature Credit/Bank Card */}
                    <View style={styles.miniCardWrapper}>
                      <MiniRealCard
                        bankName={card.bankName}
                        color1={card.color1 || theme.bg1}
                        color2={card.color2 || theme.bg2}
                        type={card.type}
                        paymentNetwork={card.paymentNetwork || theme.network}
                        cardNumber={card.cardNumber}
                        balance={card.balance}
                        width={74}
                        height={46}
                      />
                    </View>

                    {/* Middle Info Column */}
                    <View style={styles.listMidInfo}>
                      <Text style={[styles.listBankTitle, { color: colors.text }]} numberOfLines={1}>
                        {card.bankName}
                      </Text>

                      <View style={styles.listBadgesRow}>
                        <View style={[styles.listCategoryBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.listCategoryBadgeText, { color: badgeTextColor }]}>
                            {categoryLabel}
                          </Text>
                        </View>
                        <Text style={[styles.listNetworkText, { color: colors.textMuted }]}>
                          • {networkLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Right Balance Column with Chevron */}
                    <View style={styles.listRightBal}>
                      <Text
                        style={[
                          styles.listBalText,
                          { color: isCredit && displayBal > 0 ? '#F87171' : colors.text },
                        ]}
                      >
                        {formatCurrency(displayBal)}
                      </Text>

                      <View style={styles.listSubBalRow}>
                        {isCredit ? (
                          <View style={styles.debtIndicatorRow}>
                            <View style={styles.debtDot} />
                            <Text style={styles.debtLabelText}>Debt</Text>
                          </View>
                        ) : (
                          <Text style={[styles.listSubBal, { color: colors.textMuted }]}>Available</Text>
                        )}
                        <ChevronRight size={13} color={colors.textMuted} style={{ marginLeft: 4 }} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {/* ── Comprehensive Add Account / Card Preset Modal ── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Card / Account</Text>
                <Text style={[styles.modalSubHeader, { color: colors.textMuted }]}>
                  Choose from 100+ cards with bespoke 3D styles
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAddModalVisible(false)}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScrollBody}>
              {/* Interactive Live 3D Card Preview */}
              {newBankName ? (
                <View style={styles.modalPreviewContainer}>
                  <GekoCard3D
                    balance={
                      parseFloat(newBalance.replace(/,/g, '')) || 0
                    }
                    cardholderName="GEKO MEMBER"
                    expiryDate="10/29"
                    accountType={newAccountType}
                    bankName={newBankName}
                    color1={newColor1}
                    color2={newColor2}
                    height={150}
                    interactive={true}
                    paymentNetwork={newNetwork}
                  />
                  <Text style={[styles.previewHint, { color: colors.textMuted }]}>
                    Interactive 3D preview • Tap & drag to rotate
                  </Text>
                </View>
              ) : (
                <View style={[styles.modalEmptyPreview, { backgroundColor: colors.surfaceHighlight || '#1E293B', borderColor: colors.border }]}>
                  <Sparkles size={22} color={colors.primary} />
                  <Text style={[styles.modalEmptyPreviewTitle, { color: colors.text }]}>Select a Card Preset Below</Text>
                  <Text style={[styles.modalEmptyPreviewSub, { color: colors.textMuted }]}>
                    Tap any Philippine card or e-wallet preset to instantly style your 3D card
                  </Text>
                </View>
              )}

              {/* Category Selector Tabs */}
              <View style={[styles.modalCatTabs, { backgroundColor: colors.surfaceHighlight || '#F1F5F9' }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2, gap: 4 }}>
                  {[
                    { key: 'ALL', label: 'All', icon: LayoutGrid },
                    { key: 'CREDIT', label: 'Credit', icon: CreditCard },
                    { key: 'DIGITAL', label: 'Digital', icon: Smartphone },
                    { key: 'EWALLET', label: 'E-Wallet', icon: Zap },
                    { key: 'PREPAID', label: 'Prepaid', icon: Ticket },
                    { key: 'MEMBERSHIP', label: 'Loyalty', icon: Gem },
                    { key: 'BANK', label: 'Banks', icon: Landmark },
                    { key: 'CUSTOM', label: 'Custom', icon: Edit3 },
                  ].map((tab) => {
                    const isTabActive = presetCategory === tab.key;
                    const IconComp = tab.icon;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[
                          styles.modalCatTabBtn,
                          { paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
                          isTabActive && {
                            backgroundColor: colors.surface,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.12,
                            shadowRadius: 2,
                            elevation: 2,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setPresetCategory(tab.key as any);
                        }}
                      >
                        <IconComp size={13} color={isTabActive ? colors.primary : colors.textMuted} />
                        <Text
                          style={[
                            styles.modalCatTabText,
                            { color: isTabActive ? colors.primary : colors.textMuted, fontWeight: isTabActive ? '700' : '500' },
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Search Bar for Presets (when not in Custom) */}
              {presetCategory !== 'CUSTOM' && (
                <View style={[styles.presetSearchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Search size={16} color={colors.textMuted} />
                  <TextInput
                    style={[styles.presetSearchInput, { color: colors.text }]}
                    placeholder="Search 100+ cards (e.g. BPI Platinum, GCash, GrabPay)..."
                    placeholderTextColor={colors.textMuted}
                    value={presetSearch}
                    onChangeText={setPresetSearch}
                  />
                  {presetSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setPresetSearch('')}>
                      <X size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Preset Cards Horizontal Carousel */}
              {presetCategory !== 'CUSTOM' && (
                <View style={styles.presetsWrapper}>
                  <View style={styles.presetSectionHeaderRow}>
                    <Text style={[styles.presetSectionHeader, { color: colors.textMuted }]}>
                      {presetCategory === 'CREDIT'
                        ? 'Philippine Credit Cards (32)'
                        : presetCategory === 'DIGITAL'
                          ? 'Philippine Digital Banks (12)'
                          : presetCategory === 'EWALLET'
                            ? 'E-Wallets (13)'
                            : presetCategory === 'PREPAID'
                              ? 'Prepaid & RFID Toll Cards (4)'
                              : presetCategory === 'MEMBERSHIP'
                                ? 'Membership & Loyalty Cards (8)'
                                : presetCategory === 'BANK'
                                  ? 'Universal & Commercial Banks (54)'
                                  : `Matching Presets (${modalPresets.length})`}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                      Tap to apply
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsListHorizontal}
                  >
                    {modalPresets.map((preset, idx) => {
                      const isSelected = selectedPreset?.id === preset.id || newBankName === preset.name;
                      return (
                        <TouchableOpacity
                          key={`modal-preset-${preset.id}-${idx}`}
                          style={[
                            styles.presetCardItem,
                            {
                              backgroundColor: colors.background,
                              borderColor: isSelected ? colors.primary : colors.border,
                              borderWidth: isSelected ? 2 : 1,
                            },
                          ]}
                          activeOpacity={0.82}
                          onPress={() => handleSelectPreset(preset)}
                        >
                          <View style={{ width: '100%', height: 78, borderRadius: 10, overflow: 'hidden', marginBottom: 4 }} pointerEvents="none">
                            <GekoCard3D
                              balance={0}
                              bankName={preset.name}
                              accountType={preset.type}
                              color1={preset.color1}
                              color2={preset.color2}
                              height={78}
                              cornerRadius={0.06}
                              interactive={false}
                              paymentNetwork={preset.network}
                            />
                          </View>

                          <Text style={[styles.presetItemName, { color: colors.text }]} numberOfLines={2}>
                            {preset.name}
                          </Text>

                          <View style={styles.presetItemMetaRow}>
                            <View style={[styles.presetBadgePill, { backgroundColor: `${colors.primary}18` }]}>
                              <Text style={[styles.presetBadgeText, { color: colors.primary }]}>
                                {preset.badgeText || (preset.category === 'CREDIT' ? 'Credit' : preset.category === 'EWALLET' ? 'E-Wallet' : 'Bank')}
                              </Text>
                            </View>
                            <Text style={[styles.presetNetworkTag, { color: colors.textMuted }]}>
                              {preset.network}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Form Input Fields */}
              <View style={styles.formFieldsBlock}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Card / Bank Name</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="e.g. BPI Platinum Rewards Card, GCash, GrabPay"
                  placeholderTextColor={colors.textMuted}
                  value={newBankName}
                  onChangeText={(val) => {
                    setNewBankName(val);
                    const theme = getBankTheme(val);
                    setNewColor1(theme.bg1);
                    setNewColor2(theme.bg2);
                    setNewNetwork(theme.network);
                  }}
                />

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Account Category</Text>
                <View style={styles.typeSelectorRow}>
                  {(['CREDIT_CARD', 'EWALLET', 'BANK', 'DEBIT', 'CASH'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: newAccountType === t ? colors.primary : colors.surfaceHighlight,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setNewAccountType(t);
                      }}
                    >
                      <Text style={[styles.typeChipText, { color: newAccountType === t ? '#fff' : colors.text }]}>
                        {t === 'CREDIT_CARD' ? 'Credit Card' : t === 'EWALLET' ? 'E-Wallet' : t === 'BANK' ? 'Bank' : t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Payment Network</Text>
                <View style={styles.typeSelectorRow}>
                  {(['VISA', 'MASTERCARD', 'OTHER'] as const).map((net) => (
                    <TouchableOpacity
                      key={net}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: newNetwork === net ? colors.primary : colors.surfaceHighlight,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setNewNetwork(net);
                      }}
                    >
                      <Text style={[styles.typeChipText, { color: newNetwork === net ? '#fff' : colors.text }]}>
                        {net}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  {newAccountType === 'CREDIT_CARD' ? 'Current Outstanding Debt (₱)' : 'Starting Balance (₱)'}
                </Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder={newAccountType === 'CREDIT_CARD' ? '0.00 (e.g. 5000)' : '0.00 (e.g. 150)'}
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
                  activeOpacity={0.85}
                >
                  <Check size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.createBtnText}>
                    {newBankName ? `Save & Connect ${newBankName}` : 'Save Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  {editModalCard.bankName}
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
  container: {
    flex: 1,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  screenSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
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
    paddingVertical: 8,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  viewToolbarCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 3,
    gap: 2,
  },
  viewToolBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToolBtnActive: {
    backgroundColor: '#0F172A',
  },

  /* Category Filter Bar */
  categoryFilterContainer: {
    paddingVertical: 4,
  },
  categoryFilterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* Grid Layout Mode */
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardItem3D: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    height: GRID_CARD_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },

  /* Stack / Grouped Layout Mode */
  stackedContainer: {
    gap: 24,
  },
  sectionGroupBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  horizontalCardCarousel: {
    gap: 14,
    paddingVertical: 4,
  },
  stackedCardItem3D: {
    width: 226,
    height: 142,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },

  /* List Layout Mode */
  listViewContainer: {
    gap: 10,
  },
  listStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  listStatsLeft: {
    gap: 2,
  },
  listStatsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  listStatsValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  listStatsRight: {
    alignItems: 'flex-end',
  },
  listStatsDebtBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'flex-end',
  },
  listStatsDebtLabel: {
    color: '#F87171',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listStatsDebtValue: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '800',
  },
  listCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  listCountPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  miniCardWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  listMidInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listBankTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  listBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  listCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  listNetworkText: {
    fontSize: 11,
    fontWeight: '500',
  },
  listRightBal: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  listBalText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  listSubBalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  listSubBal: {
    fontSize: 11,
    fontWeight: '500',
  },
  debtIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  debtDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F87171',
  },
  debtLabelText: {
    color: '#F87171',
    fontSize: 10.5,
    fontWeight: '700',
  },
  listEmptyFilterState: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  listEmptyFilterTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  listEmptyFilterSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  listEmptyFilterBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  listEmptyFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  modalSubHeader: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScrollBody: {
    flexGrow: 0,
  },

  modalPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  previewHint: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },

  modalCatTabs: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
  },
  modalCatTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCatTabText: {
    fontSize: 11,
  },

  presetSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  presetSearchInput: {
    flex: 1,
    fontSize: 13,
  },

  presetsWrapper: {
    marginBottom: 14,
  },
  presetSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  presetSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  presetsListHorizontal: {
    gap: 10,
    paddingVertical: 2,
  },
  presetCardItem: {
    width: 148,
    borderRadius: 16,
    padding: 8,
    gap: 6,
  },
  presetColorPreview: {
    width: '100%',
    height: 38,
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetColorPreviewInner: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '45%',
    opacity: 0.7,
  },
  presetColorInitials: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  presetItemName: {
    fontSize: 12,
    fontWeight: '700',
    height: 32,
    lineHeight: 16,
  },
  presetItemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  presetBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  presetBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  presetNetworkTag: {
    fontSize: 9.5,
    fontWeight: '600',
  },

  formFieldsBlock: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 8,
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
  blankSlateContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  blankCardFrame: {
    width: '100%',
    height: 190,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 24,
  },
  blankCardGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  blankCardInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  blankCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blankChipSim: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(234, 179, 8, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.55)',
  },
  blankCardBottom: {
    gap: 8,
  },
  blankCardNumber: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
    opacity: 0.6,
  },
  blankCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blankCardHolder: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  blankCardExpiry: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  blankSlateTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  blankSlateSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  blankSlateCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 18,
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 28,
  },
  blankSlateCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickPickSection: {
    width: '100%',
  },
  quickPickHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  quickPickChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickPickDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickPickText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resetCardsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyPreview: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  modalEmptyPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalEmptyPreviewSub: {
    fontSize: 11,
    textAlign: 'center',
  },
});
