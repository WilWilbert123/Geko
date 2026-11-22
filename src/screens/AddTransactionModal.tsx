import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Keyboard, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTransactions } from '../hooks/useTransactions';
import { useCards } from '../hooks/useCards';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Coffee,
  ShoppingCart,
  Train,
  DollarSign,
  ArrowRightLeft,
  Zap,
  Gift,
  ScanLine,
  HeartPulse,
  Home,
  Briefcase,
  TrendingUp,
  Plus,
} from 'lucide-react-native';
import { ReceiptScannerModal } from '../components/receipt/ReceiptScannerModal';
import { ParsedReceipt } from '../services/receipt/receiptParser';
import { getBankTheme } from '../utils/bankThemes';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

const EXPENSE_CATEGORIES = [
  { id: 'Food', icon: Coffee },
  { id: 'Shopping', icon: ShoppingCart },
  { id: 'Transport', icon: Train },
  { id: 'Utilities', icon: Zap },
  { id: 'Health', icon: HeartPulse },
  { id: 'Housing', icon: Home },
];

const INCOME_CATEGORIES = [
  { id: 'Salary', icon: Briefcase },
  { id: 'Deposit', icon: DollarSign },
  { id: 'Bonus', icon: Gift },
  { id: 'Cash In', icon: Plus },
  { id: 'Freelance', icon: Zap },
  { id: 'Investment', icon: TrendingUp },
];

const TRANSFER_CATEGORIES = [
  { id: 'Transfer', icon: ArrowRightLeft },
];

export const AddTransactionModal: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const { addTransaction, transferBetweenAccounts } = useTransactions();
  const { cards } = useCards();

  // Show ONLY user's actual cards that are registered in their wallet!
  const bankOptions = useMemo(() => {
    if (cards && cards.length > 0) {
      return cards.map((c) => {
        const theme = getBankTheme(c.bankName, c.color1, c.color2);
        const displayBal = c.type === 'CREDIT_CARD' ? (c.outstandingBalance || 0) : c.balance;
        return {
          id: c.id,
          name: c.bankName,
          color: c.color1 || theme.bg1,
          color2: c.color2 || theme.bg2,
          type: c.type,
          balance: displayBal,
          isCredit: c.type === 'CREDIT_CARD',
        };
      });
    }
    // Only if user has zero cards in their wallet, default to Physical Cash
    return [{ id: 'cash-default', name: 'Physical Cash', color: '#059669', color2: '#10B981', type: 'CASH' as const, balance: 0, isCredit: false }];
  }, [cards]);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [category, setCategory] = useState('Food');
  const [selectedBank, setSelectedBank] = useState(() => {
    if (cards && cards.length > 0) return cards[0].bankName;
    return 'Physical Cash';
  });
  const [destinationBank, setDestinationBank] = useState(() => {
    if (cards && cards.length > 1) return cards[1].bankName;
    if (cards && cards.length === 1) return cards[0].bankName;
    return 'Physical Cash';
  });
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (cards && cards.length > 0) {
      const exists = cards.some((c) => c.bankName.toLowerCase() === selectedBank.toLowerCase());
      if (!exists) {
        setSelectedBank(cards[0].bankName);
      }
    }
  }, [cards, selectedBank]);

  const handleReceiptScanned = (parsed: ParsedReceipt) => {
    setAmount(parsed.total > 0 ? parsed.total.toString() : '');
    let itemNote = parsed.merchant;
    if (parsed.items && parsed.items.length > 0) {
      itemNote += `: ${parsed.items.map((it) => `${it.qty}x ${it.name}`).slice(0, 3).join(', ')}`;
    }
    setNote(itemNote);
    setType('expense');
    if (parsed.category) setCategory(parsed.category);
    if (parsed.suggestedBank) {
      const matchedCard = bankOptions.find(b => b.name.toLowerCase() === parsed.suggestedBank?.toLowerCase());
      if (matchedCard) {
        setSelectedBank(matchedCard.name);
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const dismiss = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const handleTypeChange = (newType: 'expense' | 'income' | 'transfer') => {
    Haptics.selectionAsync();
    setType(newType);
    if (newType === 'income') {
      setCategory('Salary');
    } else if (newType === 'expense') {
      setCategory('Food');
    } else if (newType === 'transfer') {
      setCategory('Transfer');
      if (destinationBank.toLowerCase() === selectedBank.toLowerCase()) {
        const alt = bankOptions.find((b) => b.name.toLowerCase() !== selectedBank.toLowerCase());
        if (alt) setDestinationBank(alt.name);
      }
    }
  };

  const handleSave = async () => {
    const val = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(val) || val <= 0) return;

    if (type === 'transfer') {
      if (selectedBank.toLowerCase() === destinationBank.toLowerCase()) {
        Alert.alert('Same Account', 'Please choose different source and destination accounts for a transfer.');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await transferBetweenAccounts({
        fromBank: selectedBank,
        toBank: destinationBank,
        amount: val,
        note,
        date: Date.now(),
      });
      dismiss();
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let finalCategory = category;
    if (type === 'income' && !['Cash In', 'Deposit', 'Bonus', 'Salary'].includes(finalCategory)) {
      finalCategory = 'Deposit';
    }
    await addTransaction({
      amount: val,
      type,
      categoryId: finalCategory,
      date: Date.now(),
      note,
      bankName: selectedBank,
    });
    dismiss();
  };

  const activeColor = type === 'income' ? colors.income : type === 'expense' ? colors.expense : colors.primary;
  const categoriesList = type === 'income' ? INCOME_CATEGORIES : type === 'transfer' ? TRANSFER_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdropTouchable}
        activeOpacity={1}
        onPress={dismiss}
      />
      <PanGestureHandler
        activeOffsetY={[-10, 100]}
        failOffsetX={[-15, 15]}
        onGestureEvent={(e: any) => {
          if (e.nativeEvent.translationY > 0) {
            translateY.value = e.nativeEvent.translationY;
          }
        }}
        onEnded={(e: any) => {
          if (e.nativeEvent.translationY > 100) {
            runOnJS(dismiss)();
          } else {
            translateY.value = withSpring(0);
          }
        }}
      >
        <Animated.View style={[styles.container, { backgroundColor: colors.surface }, animatedStyle]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.typeSelector}>
            {(['expense', 'income', 'transfer'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeButton,
                  type === t ? { backgroundColor: t === 'income' ? colors.income : t === 'expense' ? colors.expense : colors.primary } : { backgroundColor: colors.surfaceHighlight }
                ]}
                onPress={() => handleTypeChange(t)}
              >
                <Text style={[styles.typeText, { color: type === t ? '#FFFFFF' : colors.text }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Receipt Auto-Fill Bar */}
          {type === 'expense' && (
            <TouchableOpacity
              style={styles.scanReceiptBar}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setScannerOpen(true);
              }}
              activeOpacity={0.8}
            >
              <ScanLine size={15} color="#D97706" />
              <Text style={styles.scanReceiptBarText}>Scan Receipt / Bill to Auto-Fill</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={[styles.input, { color: activeColor, borderBottomColor: colors.border }]}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />

          {/* Account / Bank Selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>
              {type === 'transfer' ? 'FROM ACCOUNT' : type === 'income' ? 'DEPOSIT TO ACCOUNT' : 'PAY FROM ACCOUNT'}
            </Text>
            {cards.length > 0 && (
              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                {cards.length} {cards.length === 1 ? 'card available' : 'cards available'}
              </Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContentContainer}
            style={styles.categoriesScroll}
          >
            {bankOptions.map(b => {
              const isSelected = selectedBank.toLowerCase() === b.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={b.name}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? b.color : colors.surfaceHighlight,
                      borderColor: isSelected ? b.color : colors.border,
                      borderWidth: 1,
                    }
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedBank(b.name);
                  }}
                >
                  <View style={[styles.bankDot, { backgroundColor: isSelected ? '#FFFFFF' : b.color }]} />
                  <View>
                    <Text style={[styles.categoryText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {b.name}
                    </Text>
                    {b.balance !== undefined && (
                      <Text style={[styles.bankBalanceSub, { color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textMuted }]}>
                        ₱{Number(b.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Quick Add Card Shortcut Pill */}
            <TouchableOpacity
              style={[styles.addCardQuickChip, { borderColor: colors.border, backgroundColor: colors.surfaceHighlight }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Main', { screen: 'Wallet' });
              }}
            >
              <Plus size={14} color={colors.primary} />
              <Text style={[styles.addCardQuickText, { color: colors.primary }]}>+ Add Card</Text>
            </TouchableOpacity>
          </ScrollView>

          {type === 'transfer' ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TO ACCOUNT</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContentContainer}
                style={styles.categoriesScroll}
              >
                {bankOptions.map(b => {
                  const isSelected = destinationBank.toLowerCase() === b.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={`dest-${b.name}`}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected ? b.color : colors.surfaceHighlight,
                          borderColor: isSelected ? b.color : colors.border,
                          borderWidth: 1,
                        }
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setDestinationBank(b.name);
                      }}
                    >
                      <View style={[styles.bankDot, { backgroundColor: isSelected ? '#FFFFFF' : b.color }]} />
                      <View>
                        <Text style={[styles.categoryText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                          {b.name}
                        </Text>
                        {b.balance !== undefined && (
                          <Text style={[styles.bankBalanceSub, { color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textMuted }]}>
                            ₱{Number(b.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <>
              {/* Category Selector */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CATEGORY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContentContainer}
                style={styles.categoriesScroll}
              >
                {categoriesList.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: isSelected ? activeColor : colors.surfaceHighlight }
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCategory(cat.id);
                      }}
                    >
                      <Icon size={16} color={isSelected ? '#FFFFFF' : colors.text} />
                      <Text style={[styles.categoryText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                        {cat.id}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <TextInput
            style={[styles.noteInput, { color: colors.text, backgroundColor: colors.background }]}
            placeholder={
              type === 'transfer'
                ? 'Transfer note (optional)...'
                : type === 'income'
                  ? 'e.g. November Cut-off Salary, Client Project...'
                  : 'Add a note...'
            }
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: activeColor, opacity: amount ? 1 : 0.5 }]}
            disabled={!amount}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>
              {type === 'transfer'
                ? `Transfer ${selectedBank} → ${destinationBank}`
                : type === 'income'
                  ? `Save +₱${amount || '0'} Income to ${selectedBank}`
                  : `Save -₱${amount || '0'} Expense from ${selectedBank}`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>

      <ReceiptScannerModal
        visible={scannerOpen}
        autoSave={false}
        onClose={() => setScannerOpen(false)}
        onSuccess={handleReceiptScanned}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdropTouchable: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  typeText: {
    fontWeight: '700',
    fontSize: 14,
  },
  input: {
    fontSize: 52,
    fontWeight: '700',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  categoriesScroll: {
    marginBottom: 18,
    minHeight: 44,
  },
  scrollContentContainer: {
    paddingRight: 24,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryText: {
    fontWeight: '600',
    fontSize: 14,
  },
  noteInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bankDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  saveBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  scanReceiptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  scanReceiptBarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  bankBalanceSub: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  addCardQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginRight: 8,
  },
  addCardQuickText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
