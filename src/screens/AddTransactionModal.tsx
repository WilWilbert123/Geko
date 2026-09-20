import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Keyboard, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTransactions } from '../hooks/useTransactions';
import { Button } from '../components/common/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Coffee, ShoppingCart, Train, DollarSign, ArrowRightLeft } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

const CATEGORIES = [
  { id: 'Food', icon: Coffee },
  { id: 'Shopping', icon: ShoppingCart },
  { id: 'Transport', icon: Train },
  { id: 'Salary', icon: DollarSign },
  { id: 'Transfer', icon: ArrowRightLeft },
];

const BANKS = [
  { name: 'GCash', color: '#0047FF' },
  { name: 'GoTyme', color: '#0099B8' },
  { name: 'BPI', color: '#B30000' },
  { name: 'Maya', color: '#006B4D' },
  { name: 'Landbank', color: '#004D25' },
];

export const AddTransactionModal: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const { addTransaction } = useTransactions();
  
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [category, setCategory] = useState('Food');
  const [selectedBank, setSelectedBank] = useState('GCash');

  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const dismiss = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      await addTransaction({
        amount: val,
        type: type === 'transfer' ? 'expense' : type,
        categoryId: category,
        date: Date.now(),
        note,
        bankName: selectedBank,
      });
      dismiss();
    }
  };

  const activeColor = type === 'income' ? colors.income : type === 'expense' ? colors.expense : colors.neutral;

  return (
    <View style={styles.overlay}>
      <PanGestureHandler
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
                  type === t ? { backgroundColor: t === 'income' ? colors.income : t === 'expense' ? colors.expense : colors.neutral } : { backgroundColor: colors.surfaceHighlight }
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setType(t);
                }}
              >
                <Text style={[styles.typeText, { color: type === t ? colors.background : colors.text }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACCOUNT / CARD</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {BANKS.map(b => {
              const isSelected = selectedBank === b.name;
              return (
                <TouchableOpacity
                  key={b.name}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: isSelected ? b.color : colors.surfaceHighlight }
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedBank(b.name);
                  }}
                >
                  <View style={[styles.bankDot, { backgroundColor: isSelected ? '#fff' : b.color }]} />
                  <Text style={[styles.categoryText, { color: isSelected ? '#fff' : colors.text }]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Category Selector */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {CATEGORIES.map(cat => {
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
                  <Icon size={16} color={isSelected ? colors.background : colors.text} />
                  <Text style={[styles.categoryText, { color: isSelected ? colors.background : colors.text }]}>
                    {cat.id}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TextInput
            style={[styles.noteInput, { color: colors.text, backgroundColor: colors.background }]}
            placeholder="Add a note..."
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
            <Text style={styles.saveBtnText}>Save Transaction</Text>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    marginBottom: 24,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  typeText: {
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    fontSize: 56,
    fontWeight: '700',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  categoriesScroll: {
    marginBottom: 24,
    maxHeight: 40,
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
    fontWeight: '500',
    fontSize: 14,
  },
  noteInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
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
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
