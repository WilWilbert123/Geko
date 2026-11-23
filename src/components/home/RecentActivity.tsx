import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Pressable,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useTransactions } from '../../hooks/useTransactions';
import { useCards } from '../../hooks/useCards';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { formatCurrency } from '../../utils/formatters';
import {
  Utensils,
  ShoppingBag,
  Zap,
  DollarSign,
  Car,
  HeartPulse,
  Tag,
  Wallet,
  Banknote,
  ChevronRight,
  ArrowRightLeft,
  Trash2,
  Check,
  X,
} from 'lucide-react-native';
import { isToday, isYesterday, format } from 'date-fns';
import { SkeletonTransactionItem } from '../common/Skeleton';
import * as Haptics from 'expo-haptics';

export const CATEGORY_STYLE_MAP: Record<string, { bg: string; color: string; icon: any }> = {
  food: { bg: 'rgba(245, 158, 11, 0.15)', color: '#D97706', icon: Utensils },
  dining: { bg: 'rgba(245, 158, 11, 0.15)', color: '#D97706', icon: Utensils },
  lunch: { bg: 'rgba(245, 158, 11, 0.15)', color: '#D97706', icon: Utensils },
  shopping: { bg: 'rgba(244, 63, 94, 0.15)', color: '#E11D48', icon: ShoppingBag },
  utilities: { bg: 'rgba(99, 102, 241, 0.15)', color: '#4F46E5', icon: Zap },
  electricity: { bg: 'rgba(99, 102, 241, 0.15)', color: '#4F46E5', icon: Zap },
  bills: { bg: 'rgba(99, 102, 241, 0.15)', color: '#4F46E5', icon: Zap },
  housing: { bg: 'rgba(139, 92, 246, 0.15)', color: '#7C3AED', icon: Zap },
  debt: { bg: 'rgba(239, 68, 68, 0.15)', color: '#DC2626', icon: Banknote },
  utang: { bg: 'rgba(239, 68, 68, 0.15)', color: '#DC2626', icon: Banknote },
  loan: { bg: 'rgba(239, 68, 68, 0.15)', color: '#DC2626', icon: Banknote },
  transfer: { bg: 'rgba(59, 130, 246, 0.15)', color: '#2563EB', icon: ArrowRightLeft },
  'cash in': { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  cashin: { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  deposit: { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  salary: { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  income: { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', icon: DollarSign },
  transport: { bg: 'rgba(14, 165, 233, 0.15)', color: '#0284C7', icon: Car },
  health: { bg: 'rgba(236, 72, 153, 0.15)', color: '#DB2777', icon: HeartPulse },
};

export const getCategoryConfig = (categoryName?: string) => {
  if (!categoryName) return { bg: 'rgba(100, 116, 139, 0.15)', color: '#475569', icon: Tag };
  const key = categoryName.toLowerCase();
  for (const [k, val] of Object.entries(CATEGORY_STYLE_MAP)) {
    if (key.includes(k)) return val;
  }
  return { bg: 'rgba(100, 116, 139, 0.15)', color: '#475569', icon: Tag };
};

export const BANK_COLOR_SCHEMES: Record<string, { text: string; cardBg: string; name: string; isCash?: boolean }> = {
  gotyme: { text: '#00D2C8', cardBg: '#00D2C8', name: 'GoTyme' },
  bpi: { text: '#991B1B', cardBg: '#6B0A14', name: 'BPI' },
  pnb: { text: '#B8860B', cardBg: '#D4AF37', name: 'PNB' },
  gcash: { text: '#2563EB', cardBg: '#0055FF', name: 'GCash' },
  maya: { text: '#EC4899', cardBg: '#AD1457', name: 'Maya' },
  unionbank: { text: '#EA580C', cardBg: '#E65100', name: 'UnionBank' },
  ub: { text: '#EA580C', cardBg: '#E65100', name: 'UnionBank' },
  bdo: { text: '#0284C7', cardBg: '#004080', name: 'BDO' },
  metrobank: { text: '#2563EB', cardBg: '#0044CC', name: 'Metrobank' },
  rcbc: { text: '#C8981A', cardBg: '#C8981A', name: 'RCBC' },
  maribank: { text: '#E11D48', cardBg: '#E64A19', name: 'MariBank' },
  seabank: { text: '#E11D48', cardBg: '#E64A19', name: 'MariBank' },
  wise: { text: '#64DD17', cardBg: '#64DD17', name: 'Wise' },
  cash: { text: '#059669', cardBg: '#059669', name: 'Physical Cash', isCash: true },
};

export const getBankScheme = (bankName?: string) => {
  if (!bankName) return BANK_COLOR_SCHEMES.gcash;
  const lower = bankName.toLowerCase();
  if (lower.includes('gotyme')) return BANK_COLOR_SCHEMES.gotyme;
  if (lower.includes('bpi')) return BANK_COLOR_SCHEMES.bpi;
  if (lower.includes('pnb')) return BANK_COLOR_SCHEMES.pnb;
  if (lower.includes('gcash')) return BANK_COLOR_SCHEMES.gcash;
  if (lower.includes('maya')) return BANK_COLOR_SCHEMES.maya;
  if (lower.includes('union') || lower.includes('ub')) return BANK_COLOR_SCHEMES.unionbank;
  if (lower.includes('bdo')) return BANK_COLOR_SCHEMES.bdo;
  if (lower.includes('metrobank')) return BANK_COLOR_SCHEMES.metrobank;
  if (lower.includes('rcbc')) return BANK_COLOR_SCHEMES.rcbc;
  if (lower.includes('maribank') || lower.includes('seabank')) return BANK_COLOR_SCHEMES.maribank;
  if (lower.includes('wise')) return BANK_COLOR_SCHEMES.wise;
  if (lower.includes('cash') || lower.includes('peso') || lower.includes('money')) return BANK_COLOR_SCHEMES.cash;

  return {
    text: '#64748B',
    cardBg: '#475569',
    name: bankName,
    isCash: false,
  };
};

export const CardMiniBadge = ({ bankName }: { bankName?: string }) => {
  const scheme = getBankScheme(bankName);

  return (
    <View style={styles.cardBadgePill}>
      {scheme.isCash ? (
        <Banknote size={12} color={scheme.text} style={{ marginRight: 3 }} />
      ) : (
        <View style={[styles.miniCardIcon, { backgroundColor: scheme.cardBg }]}>
          <View style={styles.miniCardChip} />
        </View>
      )}
      <Text style={[styles.cardBadgeText, { color: scheme.text }]}>
        {scheme.name}
      </Text>
    </View>
  );
};

export const formatCleanTitle = (categoryId?: string, note?: string) => {
  const cat = (categoryId || '').trim();
  const n = (note || '').trim();
  const combined = `${cat} ${n}`.toLowerCase();

  if (
    combined.includes('starting balance') ||
    combined.includes('cash-in') ||
    combined.includes('cash in') ||
    combined.includes('deposit') ||
    combined.includes('initial balance')
  ) {
    return 'Deposit';
  }

  if (combined.includes('utang') || combined.includes('bayad utang')) {
    return 'Utang';
  }

  if (n && n.toLowerCase() !== cat.toLowerCase()) {
    let cleanNote = n;
    if (cleanNote.includes('-')) {
      const parts = cleanNote.split('-');
      cleanNote = parts[parts.length - 1].trim();
    }
    if (cleanNote.length > 0) {
      return cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1);
    }
  }

  if (cat) {
    let cleanCat = cat;
    if (cleanCat.includes('-')) {
      const parts = cleanCat.split('-');
      cleanCat = parts[0].trim();
    }
    return cleanCat.charAt(0).toUpperCase() + cleanCat.slice(1);
  }

  return 'Deposit';
};

const EDIT_CATEGORIES = ['Food', 'Shopping', 'Transport', 'Utilities', 'Health', 'Housing', 'Deposit', 'Salary', 'Transfer'];
const DEFAULT_ACCOUNT_NAMES = ['GCash', 'Maya', 'GoTyme', 'BPI', 'BDO', 'Cash'];

export const TransactionItem = ({ item, index }: { item: any; index: number }) => {
  const { colors, isDark } = useTheme();
  const { updateTransaction, deleteTransaction } = useTransactions();
  const { cards } = useCards();

  const [editOpen, setEditOpen] = useState(false);
  const [editAmount, setEditAmount] = useState(String(item.amount || ''));
  const [editNote, setEditNote] = useState(item.note || '');
  const [editCategory, setEditCategory] = useState(item.categoryId || 'Food');
  const [editBank, setEditBank] = useState(item.bankName || 'GCash');
  const [editType, setEditType] = useState<'expense' | 'income'>(item.type === 'income' ? 'income' : 'expense');

  const isIncome = item.type === 'income';
  const targetBank = item.bankName || 'GCash';
  const isUtang = (item.note || '').toLowerCase().includes('utang') || (item.categoryId || '').toLowerCase().includes('utang');
  const catConfig = isUtang ? CATEGORY_STYLE_MAP.utang : getCategoryConfig(item.categoryId);
  const IconComp = catConfig.icon;

  const titleStr = formatCleanTitle(item.categoryId, item.note);

  const bankChoices = React.useMemo(() => {
    const fromCards = cards.map((c) => c.bankName).filter(Boolean);
    return Array.from(new Set([...fromCards, ...DEFAULT_ACCOUNT_NAMES]));
  }, [cards]);

  const handleOpenEdit = () => {
    Haptics.selectionAsync();
    setEditAmount(String(item.amount || ''));
    setEditNote(item.note || '');
    setEditCategory(item.categoryId || 'Food');
    setEditBank(item.bankName || 'GCash');
    setEditType(item.type === 'income' ? 'income' : 'expense');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const val = parseFloat(editAmount.replace(/,/g, ''));
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid transaction amount.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateTransaction(item.id, {
      amount: val,
      type: editType,
      categoryId: editCategory,
      note: editNote.trim(),
      bankName: editBank,
    });
    setEditOpen(false);
  };

  const handleConfirmDelete = () => {
    Alert.alert(
      'Delete Transaction?',
      `Remove "${titleStr}" (${formatCurrency(item.amount)}) and restore the balance on ${targetBank}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete & Refund',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteTransaction(item.id);
            setEditOpen(false);
          },
        },
      ]
    );
  };

  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(Math.min(index, 8) * 50).springify()}
        layout={Layout.springify()}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenEdit}
          style={[styles.itemContainer, { borderBottomColor: colors.border }]}
        >
          <View style={[styles.categoryIconBadge, { backgroundColor: catConfig.bg }]}>
            <IconComp size={20} color={catConfig.color} strokeWidth={2} />
          </View>

          <View style={styles.itemDetails}>
            <Text style={[styles.itemCategory, { color: colors.text }]} numberOfLines={1}>
              {titleStr}
            </Text>
            <CardMiniBadge bankName={targetBank} />
          </View>

          <Text style={[styles.itemAmount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Interactive Edit / Delete Transaction Modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditOpen(false)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Transaction Details</Text>
                <Text style={[styles.modalDateText, { color: colors.textMuted }]}>
                  {item.date ? format(new Date(Number(item.date)), 'MMM d, yyyy • h:mm a') : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeCircle, { backgroundColor: colors.surfaceHighlight }]}
                onPress={() => setEditOpen(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Type Switcher */}
            <View style={[styles.typeRow, { backgroundColor: colors.surfaceHighlight }]}>
              {(['expense', 'income'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typePill,
                    editType === t && {
                      backgroundColor: t === 'income' ? '#10B981' : '#EF4444',
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEditType(t);
                  }}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      { color: editType === t ? '#FFFFFF' : colors.textMuted },
                    ]}
                  >
                    {t === 'income' ? 'Income (+)' : 'Expense (-)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount & Note */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>AMOUNT (₱)</Text>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  color: editType === 'income' ? '#10B981' : '#EF4444',
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  fontSize: 22,
                  fontWeight: '800',
                },
              ]}
              keyboardType="decimal-pad"
              value={editAmount}
              onChangeText={setEditAmount}
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DESCRIPTION / NOTE</Text>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="Transaction note..."
              placeholderTextColor={colors.textMuted}
              value={editNote}
              onChangeText={setEditNote}
            />

            {/* Account Picker */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {bankChoices.map((b) => {
                const active = editBank.toLowerCase() === b.toLowerCase();
                return (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.chipBtn,
                      {
                        backgroundColor: active ? colors.primary : isDark ? '#1E293B' : '#F1F5F9',
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEditBank(b);
                    }}
                  >
                    <Text style={[styles.chipBtnText, { color: active ? '#FFFFFF' : colors.text }]}>{b}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Category Picker */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {EDIT_CATEGORIES.map((c) => {
                const active = editCategory.toLowerCase() === c.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.chipBtn,
                      {
                        backgroundColor: active ? colors.primary : isDark ? '#1E293B' : '#F1F5F9',
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEditCategory(c);
                    }}
                  >
                    <Text style={[styles.chipBtnText, { color: active ? '#FFFFFF' : colors.text }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleConfirmDelete}
              >
                <Trash2 size={16} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveEditBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.saveEditBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export const RecentActivity = () => {
  const { colors, isDark } = useTheme();
  const { transactions, isLoading } = useTransactions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const sorted = [...transactions].sort((a, b) => Number(b.date) - Number(a.date));
  const limited = sorted.slice(0, 5);

  const grouped: Record<string, any[]> = {};
  for (const t of limited) {
    let group = 'Earlier';
    if (isToday(t.date)) group = 'Today';
    else if (isYesterday(t.date)) group = 'Yesterday';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(t);
  }

  const GROUP_ORDER = ['Today', 'Yesterday', 'Earlier'];
  const orderedGroups = GROUP_ORDER.filter(g => grouped[g] && grouped[g].length > 0);

  const handleShowAll = () => {
    navigation.navigate('History');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Recent Activity</Text>
        {orderedGroups.length > 0 && (
          <Text style={[styles.tapHint, { color: colors.textMuted }]}>Tap item to edit</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.activityList}>
          <SkeletonTransactionItem />
          <SkeletonTransactionItem />
          <SkeletonTransactionItem />
          <SkeletonTransactionItem />
        </View>
      ) : orderedGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Wallet size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent activity</Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {orderedGroups.map(group => (
            <View key={group} style={styles.groupContainer}>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group}</Text>
              {grouped[group].map((item: any, index: number) => (
                <TransactionItem key={item.id} item={item} index={index} />
              ))}
            </View>
          ))}

          <TouchableOpacity
            style={[
              styles.showAllButton,
              {
                backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : '#F1F5F9',
                borderColor: colors.border,
              },
            ]}
            onPress={handleShowAll}
            activeOpacity={0.7}
          >
            <Text style={[styles.showAllText, { color: colors.primary }]}>Show All Records</Text>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  activityList: {},
  groupContainer: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  miniCardIcon: {
    width: 15,
    height: 10,
    borderRadius: 2,
    marginRight: 5,
    justifyContent: 'center',
    paddingLeft: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  miniCardChip: {
    width: 3,
    height: 2,
    borderRadius: 0.5,
    backgroundColor: '#FFD700',
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  showAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalDateText: {
    fontSize: 12,
    marginTop: 2,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 6,
  },
  fieldInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 6,
  },
  chipScroll: {
    marginBottom: 8,
  },
  chipBtn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 14,
    marginRight: 8,
  },
  chipBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    gap: 6,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  saveEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    gap: 6,
  },
  saveEditBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
