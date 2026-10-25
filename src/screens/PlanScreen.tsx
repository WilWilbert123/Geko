import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { NativeModules } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

// Safe lazy initialization to prevent Hermes startup crash when native module isn't compiled into dev APK
let ImagePickerModule: typeof import('expo-image-picker') | null = null;
try {
  if (NativeModules.ExponentImagePicker || NativeModules.ExpoImagePicker) {
    ImagePickerModule = require('expo-image-picker');
  }
} catch (e) {
  ImagePickerModule = null;
}

import {
  Plus,
  Car,
  ShieldAlert,
  Laptop,
  Plane,
  Target,
  Heart,
  ShoppingBag,
  Trash2,
  X,
  Check,
  PiggyBank,
  Edit3,
  Wallet,
  Camera,
  Image as ImageIcon,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  RotateCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Banknote,
  LayoutDashboard,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
} from 'lucide-react-native';

import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

import { formatCurrency } from '../utils/formatters';
import { useGoals, Goal } from '../hooks/useGoals';
import { useCutoffIncome, setCutoffIncome } from '../store/userStore';
import { useTransactions } from '../hooks/useTransactions';
import { Transaction } from '../types/transaction';
import { getCategoryConfig } from '../components/home/RecentActivity';
import {
  exportBackupJSON,
  exportTransactionsCSV,
  importBackupJSON,
  syncAIKnowledgeBase,
} from '../services/data/backupService';
import { SkeletonCalendar, SkeletonGoalCard } from '../components/common/Skeleton';
import { MiniRealCard } from '../components/wallet/MiniRealCard';
import { useCards } from '../hooks/useCards';
import { getBankTheme } from '../utils/bankThemes';
import * as Haptics from 'expo-haptics';

type DashboardTab = 'calendar' | 'goals' | 'data';

const ICON_OPTIONS = [
  { name: 'Target', Icon: Target, color: '#10B981' },
  { name: 'Car', Icon: Car, color: '#10B981' },
  { name: 'ShieldAlert', Icon: ShieldAlert, color: '#3B82F6' },
  { name: 'Laptop', Icon: Laptop, color: '#8B5CF6' },
  { name: 'Plane', Icon: Plane, color: '#F59E0B' },
  { name: 'Heart', Icon: Heart, color: '#EC4899' },
  { name: 'ShoppingBag', Icon: ShoppingBag, color: '#06B6D4' },
];

const PRESET_GOAL_IMAGES = [
  { name: 'Drone', label: '🚁 Drone', uri: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=800' },
  { name: 'Gaming', label: '🎮 OneXPlayer', uri: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=800' },
  { name: 'Car', label: '🚗 Car', uri: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800' },
  { name: 'Laptop', label: '💻 Laptop', uri: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800' },
  { name: 'Travel', label: '✈️ Travel', uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800' },
  { name: 'House', label: '🏠 House', uri: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800' },
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getIconComponent = (name: string) => {
  const item = ICON_OPTIONS.find(i => i.name === name);
  return item ? item.Icon : Target;
};

const getIconColor = (name: string) => {
  const item = ICON_OPTIONS.find(i => i.name === name);
  return item ? item.color : '#10B981';
};

export const PlanScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Tab State
  const [activeTab, setActiveTab] = useState<DashboardTab>('calendar');

  // Transactions & Cards State
  const { transactions, isLoading: isTransactionsLoading } = useTransactions();
  const { cards } = useCards();

  // Goals State
  const { goals, isLoading: isGoalsLoading, addGoal, updateGoalProgress, updateGoalImage, deleteGoal, clearAllGoals } = useGoals();
  const cutoffIncome = useCutoffIncome();

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Salary Cutoff Income Modal State
  const [isCutoffModalOpen, setIsCutoffModalOpen] = useState(false);
  const [cutoffInput, setCutoffInput] = useState('');

  // Add Goal Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [targetDateInput, setTargetDateInput] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Target');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // Goal Details / Deposit Modal State
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState('');

  // Backup & AI Sync State
  const [isSyncingAI, setIsSyncingAI] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);

  // ==========================================
  // Calendar Calculations & Mappings
  // ==========================================
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Map transactions by YYYY-MM-DD
    const dateMap: Record<
      string,
      {
        expenses: number;
        income: number;
        items: Transaction[];
      }
    > = {};

    let totalMonthExpense = 0;
    let totalMonthIncome = 0;

    transactions.forEach(t => {
      const d = new Date(Number(t.date));
      const key = format(d, 'yyyy-MM-dd');

      if (!dateMap[key]) {
        dateMap[key] = { expenses: 0, income: 0, items: [] };
      }

      dateMap[key].items.push(t);

      if (t.type === 'expense') {
        dateMap[key].expenses += Number(t.amount);
        if (isSameMonth(d, currentMonth)) {
          totalMonthExpense += Number(t.amount);
        }
      } else {
        dateMap[key].income += Number(t.amount);
        if (isSameMonth(d, currentMonth)) {
          totalMonthIncome += Number(t.amount);
        }
      }
    });

    const netMonth = totalMonthIncome - totalMonthExpense;
    const selectedKey = format(selectedDate, 'yyyy-MM-dd');
    const selectedDayData = dateMap[selectedKey] || { expenses: 0, income: 0, items: [] };

    return {
      days,
      dateMap,
      totalMonthExpense,
      totalMonthIncome,
      netMonth,
      selectedDayData,
      selectedKey,
    };
  }, [transactions, currentMonth, selectedDate]);

  // ==========================================
  // Image Picker Logic (Safe Fallback)
  // ==========================================
  const pickImage = async (): Promise<string | null> => {
    try {
      if (!ImagePickerModule && (NativeModules.ExponentImagePicker || NativeModules.ExpoImagePicker)) {
        try {
          ImagePickerModule = require('expo-image-picker');
        } catch (e) {
          ImagePickerModule = null;
        }
      }

      if (!ImagePickerModule || typeof ImagePickerModule.requestMediaLibraryPermissionsAsync !== 'function') {
        Alert.alert(
          'Photo Gallery Notice',
          'Camera roll gallery access requires building native binary (`npx expo run:android`). In the meantime, tap any of our HD Sample Photos below to set goal images instantly!',
          [{ text: 'OK' }]
        );
        return null;
      }

      const permissionResult = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access gallery is required to pick a goal cover photo.');
        return null;
      }

      const result = await ImagePickerModule.launchImageLibraryAsync({
        mediaTypes: ImagePickerModule.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      return null;
    } catch (err: any) {
      console.warn('ImagePicker error handled safely:', err?.message || err);
      Alert.alert(
        'Photo Gallery Notice',
        'Tap any of our quick HD sample photos below to use custom goal images right away!',
        [{ text: 'OK' }]
      );
      return null;
    }
  };

  const handlePickImageForNewGoal = async () => {
    const uri = await pickImage();
    if (uri) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedImageUri(uri);
    }
  };

  const handlePickImageForExistingGoal = async (goalId: string) => {
    const uri = await pickImage();
    if (uri) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateGoalImage(goalId, uri);
      setSelectedGoal(prev => (prev ? { ...prev, imageUrl: uri } : null));
    }
  };

  // ==========================================
  // Goals Handlers
  // ==========================================
  const handleSaveCutoffIncome = () => {
    const newAmount = parseFloat(cutoffInput.replace(/,/g, '')) || 0;
    if (newAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid cutoff income amount.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCutoffIncome(newAmount);
    setIsCutoffModalOpen(false);
  };

  const openAddModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTitleInput('');
    setTargetInput('');
    setCurrentInput('');
    setTargetDateInput('Dec 2026');
    setSelectedIcon('Target');
    setSelectedImageUri(null);
    setIsAddModalOpen(true);
  };

  const handleCreateGoal = async () => {
    const title = titleInput.trim();
    if (!title) {
      Alert.alert('Missing Title', 'Please enter a goal title (e.g. Car Downpayment).');
      return;
    }

    const target = parseFloat(targetInput.replace(/,/g, '')) || 0;
    if (target <= 0) {
      Alert.alert('Invalid Target', 'Please enter a target amount greater than ₱0.');
      return;
    }

    const current = parseFloat(currentInput.replace(/,/g, '')) || 0;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addGoal({
        title,
        target,
        current,
        targetDate: targetDateInput.trim() || 'Dec 2026',
        iconName: selectedIcon,
        imageUrl: selectedImageUri || undefined,
      });

      setIsAddModalOpen(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save goal to SQLite database.');
    }
  };

  const handleDepositToGoal = async () => {
    if (!selectedGoal) return;
    const addAmt = parseFloat(depositAmountInput.replace(/,/g, '')) || 0;
    if (addAmt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount to deposit.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newCurrent = selectedGoal.current + addAmt;
      await updateGoalProgress(selectedGoal.id, newCurrent);
      setSelectedGoal(null);
      setDepositAmountInput('');
    } catch (e) {
      Alert.alert('Error', 'Failed to update goal progress.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this savings goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteGoal(id);
          setSelectedGoal(null);
        },
      },
    ]);
  };

  const handleClearAllGoals = () => {
    Alert.alert('Clear All Goals', 'Remove all demo/savings goals to start 100% fresh?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await clearAllGoals();
        },
      },
    ]);
  };

  // ==========================================
  // Data Backup & AI Sync Handlers
  // ==========================================
  const handleExportJSON = async () => {
    try {
      setIsExportingJSON(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await exportBackupJSON();
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export JSON.');
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExportingCSV(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await exportTransactionsCSV();
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export CSV.');
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleSyncAI = async () => {
    try {
      setIsSyncingAI(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await syncAIKnowledgeBase();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Offline AI Synchronized! 🧠',
        `Geko AI (LangChain RAG) now has 100% vector memory of all ${res.totalCount} transactions and financial records in local SQLite!`
      );
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message || 'Failed to sync AI knowledge base.');
    } finally {
      setIsSyncingAI(false);
    }
  };

  // Parse import JSON preview
  const importPreview = useMemo(() => {
    if (!importJsonText.trim()) return null;
    try {
      const parsed = JSON.parse(importJsonText);
      const data = parsed.data || parsed;
      const transCount = Array.isArray(data.transactions) ? data.transactions.length : 0;
      const cardsCount = Array.isArray(data.cards) ? data.cards.length : 0;
      const goalsCount = Array.isArray(data.goals) ? data.goals.length : 0;
      const cutoff = typeof data.cutoffIncome === 'number' ? data.cutoffIncome : null;

      if (transCount === 0 && cardsCount === 0 && goalsCount === 0) {
        return { valid: false, message: 'JSON parsed but contains no recognizable financial records.' };
      }
      return {
        valid: true,
        transCount,
        cardsCount,
        goalsCount,
        cutoff,
        appName: parsed.app || 'Geko Data Backup',
      };
    } catch (e) {
      return { valid: false, message: 'Invalid JSON syntax. Please check formatting.' };
    }
  }, [importJsonText]);

  const handleExecuteRestore = async () => {
    if (!importPreview?.valid) {
      Alert.alert('Invalid Backup', 'Please paste a valid JSON backup text.');
      return;
    }

    const actionText =
      importMode === 'replace'
        ? 'This will OVERWRITE your current transactions and cards with the backup. Continue?'
        : 'This will MERGE imported records into your existing data. Continue?';

    Alert.alert('Confirm Restore', actionText, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Proceed',
        style: importMode === 'replace' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setIsRestoring(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const res = await importBackupJSON(importJsonText, importMode);
            setIsImportModalOpen(false);
            setImportJsonText('');
            Alert.alert(
              'Restore Complete! 🎉',
              `Restored ${res.restored.transactions} transactions, ${res.restored.cards} cards, and ${res.restored.goals} goals. Geko AI has also re-indexed the records.`
            );
          } catch (e: any) {
            Alert.alert('Restore Failed', e?.message || 'Error executing restore.');
          } finally {
            setIsRestoring(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── Screen Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {activeTab === 'calendar'
              ? 'Expense Calendar & Deductions Explorer'
              : activeTab === 'goals'
                ? `${goals.length} active savings targets & salary plan`
                : 'Backup, Export & Offline RAG Brain'}
          </Text>
        </View>

        {activeTab === 'goals' && (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {goals.length > 0 && (
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}
                onPress={handleClearAllGoals}
              >
                <Trash2 size={16} color="#F43F5E" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.primary }]}
              onPress={openAddModal}
            >
              <Plus color="#FFF" size={20} />
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'calendar' && (
          <TouchableOpacity
            style={[styles.todayJumpBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const now = new Date();
              setCurrentMonth(now);
              setSelectedDate(now);
            }}
          >
            <CalendarIcon size={14} color={colors.primary} />
            <Text style={[styles.todayJumpBtnText, { color: colors.primary }]}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Segmented Control Bar ── */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'calendar' && [styles.segmentBtnActive, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('calendar');
          }}
        >
          <CalendarIcon size={16} color={activeTab === 'calendar' ? colors.primary : colors.textMuted} />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'calendar' ? colors.text : colors.textMuted, fontWeight: activeTab === 'calendar' ? '700' : '500' },
            ]}
          >
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'goals' && [styles.segmentBtnActive, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('goals');
          }}
        >
          <Target size={16} color={activeTab === 'goals' ? colors.primary : colors.textMuted} />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'goals' ? colors.text : colors.textMuted, fontWeight: activeTab === 'goals' ? '700' : '500' },
            ]}
          >
            Goals & Plan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'data' && [styles.segmentBtnActive, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('data');
          }}
        >
          <Sparkles size={16} color={activeTab === 'data' ? colors.primary : colors.textMuted} />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'data' ? colors.text : colors.textMuted, fontWeight: activeTab === 'data' ? '700' : '500' },
            ]}
          >
            Data & AI
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================= */}
        {/* TAB 1: EXPENSE & CASHFLOW CALENDAR                        */}
        {/* ========================================================= */}
        {activeTab === 'calendar' && (
          isTransactionsLoading ? (
            <SkeletonCalendar />
          ) : (
            <View style={{ gap: 16 }}>
              {/* Month Navigation & Summary Row */}
              <View style={[styles.calendarMonthCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                <View style={styles.monthHeaderRow}>
                  <TouchableOpacity
                    style={[styles.monthNavBtn, { backgroundColor: colors.background }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCurrentMonth(prev => subMonths(prev, 1));
                    }}
                  >
                    <ChevronLeft size={20} color={colors.text} />
                  </TouchableOpacity>

                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.monthTitleText, { color: colors.text }]}>
                      {format(currentMonth, 'MMMM yyyy')}
                    </Text>
                    <Text style={[styles.monthSubText, { color: colors.textMuted }]}>
                      Tap any date to inspect spend & deductions
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.monthNavBtn, { backgroundColor: colors.background }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCurrentMonth(prev => addMonths(prev, 1));
                    }}
                  >
                    <ChevronRight size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Monthly Overview Badges */}
                <View style={styles.monthStatsRow}>
                  <View style={[styles.miniStatBox, { backgroundColor: 'rgba(244, 63, 94, 0.08)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TrendingDown size={13} color="#F43F5E" />
                      <Text style={styles.miniStatLabel}>SPENT</Text>
                    </View>
                    <Text style={[styles.miniStatValue, { color: '#F43F5E' }]}>
                      {formatCurrency(calendarData.totalMonthExpense)}
                    </Text>
                  </View>

                  <View style={[styles.miniStatBox, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TrendingUp size={13} color="#10B981" />
                      <Text style={styles.miniStatLabel}>INFLOW</Text>
                    </View>
                    <Text style={[styles.miniStatValue, { color: '#10B981' }]}>
                      {formatCurrency(calendarData.totalMonthIncome)}
                    </Text>
                  </View>

                  <View style={[styles.miniStatBox, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Banknote size={13} color="#3B82F6" />
                      <Text style={styles.miniStatLabel}>NET</Text>
                    </View>
                    <Text
                      style={[
                        styles.miniStatValue,
                        { color: calendarData.netMonth >= 0 ? '#10B981' : '#F43F5E' },
                      ]}
                    >
                      {calendarData.netMonth >= 0 ? '+' : ''}
                      {formatCurrency(calendarData.netMonth)}
                    </Text>
                  </View>
                </View>

                {/* Weekday Labels */}
                <View style={styles.weekdayRow}>
                  {WEEKDAY_NAMES.map((name, i) => (
                    <Text
                      key={name}
                      style={[
                        styles.weekdayText,
                        { color: i === 0 ? '#F43F5E' : colors.textMuted },
                      ]}
                    >
                      {name}
                    </Text>
                  ))}
                </View>

                {/* Calendar Days 7-column Grid */}
                <View style={styles.calendarGrid}>
                  {calendarData.days.map((day, idx) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayInfo = calendarData.dateMap[dayKey];
                    const inCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = isSameDay(day, selectedDate);
                    const isDayToday = isToday(day);

                    const hasExpense = dayInfo && dayInfo.expenses > 0;
                    const hasIncome = dayInfo && dayInfo.income > 0;

                    return (
                      <TouchableOpacity
                        key={dayKey + idx}
                        style={[
                          styles.calendarCell,
                          isSelected && [
                            styles.calendarCellSelected,
                            {
                              backgroundColor: `${colors.primary}22`,
                              borderColor: colors.primary,
                            },
                          ],
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedDate(day);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dayNumberContainer}>
                          <Text
                            style={[
                              styles.dayNumberText,
                              {
                                color: isSelected
                                  ? colors.primary
                                  : inCurrentMonth
                                    ? colors.text
                                    : `${colors.textMuted}60`,
                                fontWeight: isSelected || isDayToday ? '800' : '500',
                              },
                            ]}
                          >
                            {format(day, 'd')}
                          </Text>
                          {isDayToday && !isSelected && <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />}
                        </View>

                        {/* Spend / Income indicator dots */}
                        <View style={styles.dayIndicatorsRow}>
                          {hasExpense && (
                            <View
                              style={[
                                styles.indicatorDot,
                                { backgroundColor: '#F43F5E' },
                              ]}
                            />
                          )}
                          {hasIncome && (
                            <View
                              style={[
                                styles.indicatorDot,
                                { backgroundColor: '#10B981' },
                              ]}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Selected Date Inspector Breakdown */}
              <View style={[styles.inspectorCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                <View style={styles.inspectorHeaderRow}>
                  <View>
                    <Text style={[styles.inspectorDateTitle, { color: colors.text }]}>
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </Text>
                    <Text style={[styles.inspectorDateSub, { color: colors.textMuted }]}>
                      {calendarData.selectedDayData.items.length === 0
                        ? 'No transactions on this date'
                        : `${calendarData.selectedDayData.items.length} transaction${calendarData.selectedDayData.items.length > 1 ? 's' : ''
                        }`}
                    </Text>
                  </View>

                  {calendarData.selectedDayData.items.length > 0 && (
                    <View style={styles.inspectorDailyTotals}>
                      {calendarData.selectedDayData.expenses > 0 && (
                        <Text style={[styles.inspectorExpenseTotal, { color: '#F43F5E' }]}>
                          -{formatCurrency(calendarData.selectedDayData.expenses)}
                        </Text>
                      )}
                      {calendarData.selectedDayData.income > 0 && (
                        <Text style={[styles.inspectorIncomeTotal, { color: '#10B981' }]}>
                          +{formatCurrency(calendarData.selectedDayData.income)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Transaction list for selected date */}
                {calendarData.selectedDayData.items.length === 0 ? (
                  <View style={styles.noTransactionsDayBox}>
                    <CalendarIcon size={28} color={colors.textMuted} />
                    <Text style={[styles.noTransactionsDayText, { color: colors.textMuted }]}>
                      No money spent or received on this day.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dayTransactionsList}>
                    {calendarData.selectedDayData.items.map((t, idx) => {
                      const catConfig = getCategoryConfig(t.categoryId);
                      const isExpense = t.type === 'expense';
                      const isDebt =
                        t.categoryId?.toLowerCase().includes('debt') ||
                        t.categoryId?.toLowerCase().includes('utang') ||
                        t.note?.toLowerCase().includes('utang');

                      const timeStr = format(new Date(Number(t.date)), 'h:mm a');
                      const targetBankName = t.bankName || 'GCash';
                      const matchingCard = cards.find(
                        c => (c.bankName || '').toLowerCase() === targetBankName.toLowerCase()
                      );
                      const cardTheme = getBankTheme(targetBankName, matchingCard?.color1, matchingCard?.color2);

                      return (
                        <View
                          key={t.id || idx}
                          style={[
                            styles.dayTransactionRow,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          {/* Real Miniature Bank / E-Wallet Card */}
                          <View style={styles.miniCardWrapper}>
                            <MiniRealCard
                              bankName={targetBankName}
                              color1={matchingCard?.color1 || cardTheme.bg1}
                              color2={matchingCard?.color2 || cardTheme.bg2}
                              type={matchingCard?.type}
                              paymentNetwork={matchingCard?.paymentNetwork || cardTheme.network}
                              cardNumber={matchingCard?.cardNumber}
                              balance={matchingCard?.balance}
                              width={58}
                              height={36}
                            />
                          </View>

                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.dayTransTitle, { color: colors.text }]}>
                                {isDebt ? 'Utang Payment' : t.categoryId || 'Expense'}
                              </Text>
                              {isDebt && (
                                <View style={[styles.utangBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                  <Text style={styles.utangBadgeText}>UTANG</Text>
                                </View>
                              )}
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.dayTransNote, { color: colors.textMuted }]} numberOfLines={1}>
                                {t.note || 'No note'}
                              </Text>
                              <Text style={[styles.dayTransDot, { color: colors.textMuted }]}>•</Text>
                              <Text style={[styles.dayTransTime, { color: colors.textMuted }]}>{timeStr}</Text>
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            <Text
                              style={[
                                styles.dayTransAmount,
                                { color: isExpense ? '#F43F5E' : '#10B981' },
                              ]}
                            >
                              {isExpense ? '-' : '+'}
                              {formatCurrency(t.amount)}
                            </Text>
                            <View style={[styles.dayBankBadge, { backgroundColor: colors.surfaceHighlight }]}>
                              <Text style={[styles.dayBankBadgeText, { color: colors.textMuted }]}>
                                {t.bankName || 'GCash'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )
        )}

        {/* ========================================================= */}
        {/* TAB 2: SAVINGS GOALS & SALARY CUTOFF                      */}
        {/* ========================================================= */}
        {activeTab === 'goals' && (
          <View style={{ gap: 16 }}>
            {/* Salary Cutoff Income Banner */}
            <View style={[styles.cutoffCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <View style={styles.cutoffHeader}>
                <View style={styles.cutoffIconRow}>
                  <View style={[styles.cutoffIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Wallet size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cutoffTitle, { color: colors.text }]}>Salary Cutoff Budget</Text>
                    <Text style={[styles.cutoffSubtitle, { color: colors.textMuted }]}>
                      Connected to RAG AI (15th & 30th paydays)
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.editCutoffBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCutoffInput(cutoffIncome.toString());
                    setIsCutoffModalOpen(true);
                  }}
                >
                  <Edit3 size={13} color="#3B82F6" />
                  <Text style={styles.editCutoffBtnText}>Set Income</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cutoffValueRow}>
                <Text style={[styles.cutoffAmount, { color: colors.primary }]}>{formatCurrency(cutoffIncome)}</Text>
                <Text style={[styles.cutoffUnit, { color: colors.textMuted }]}>/ cutoff</Text>
              </View>
            </View>

            {isGoalsLoading ? (
              <View style={{ gap: 14 }}>
                <SkeletonGoalCard />
                <SkeletonGoalCard />
              </View>
            ) : goals.length === 0 ? (
              /* Empty State */
              <View style={[styles.emptyCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                <View style={[styles.emptyIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <PiggyBank size={36} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Savings Goals Yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Create your own real savings goal (e.g. Drone, OneXPlayer, House) and track progress in real time!
                </Text>
                <TouchableOpacity style={[styles.createFirstBtn, { backgroundColor: colors.primary }]} onPress={openAddModal}>
                  <Plus size={18} color="#FFF" />
                  <Text style={styles.createFirstBtnText}>Create Your First Goal</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Goals List */
              goals.map(goal => {
                const progress = goal.target > 0 ? Math.min(goal.current / goal.target, 1) : 0;
                const Icon = getIconComponent(goal.iconName);
                const color = getIconColor(goal.iconName);
                const percentStr = Math.round(progress * 100);

                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.goalCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedGoal(goal);
                      setDepositAmountInput('');
                    }}
                  >
                    <View style={styles.goalHeader}>
                      <View style={styles.goalTitleRow}>
                        <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
                          <Icon size={20} color={color} />
                        </View>
                        <View>
                          <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                          <Text style={[styles.goalDate, { color: colors.textMuted }]}>Target: {goal.targetDate}</Text>
                        </View>
                      </View>
                      <View style={styles.amounts}>
                        <Text style={[styles.currentAmount, { color: colors.text }]}>{formatCurrency(goal.current)}</Text>
                        <Text style={[styles.targetAmount, { color: colors.textMuted }]}>of {formatCurrency(goal.target)}</Text>
                      </View>
                    </View>

                    {/* Optional Cover Image Banner */}
                    {goal.imageUrl ? (
                      <View style={styles.cardImageContainer}>
                        <Image source={{ uri: goal.imageUrl }} style={styles.cardCoverImage} resizeMode="cover" />
                      </View>
                    ) : null}

                    {/* Progress Bar */}
                    <View style={[styles.progressBg, { backgroundColor: colors.background }]}>
                      <View style={[styles.progressFill, { backgroundColor: color, width: `${progress * 100}%` }]} />
                    </View>

                    <View style={styles.cardFooterRow}>
                      <Text style={[styles.neededText, { color: colors.textMuted }]}>
                        {goal.current >= goal.target ? 'Goal Completed 🎉' : `Need ${formatCurrency(goal.target - goal.current)} more`}
                      </Text>
                      <Text style={[styles.percentage, { color: color }]}>{percentStr}% Funded</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: BACKUP, EXPORT & OFFLINE RAG AI HUB                */}
        {/* ========================================================= */}
        {activeTab === 'data' && (
          <View style={{ gap: 16 }}>
            {/* Geko AI Offline RAG Brain Card */}
            <View style={[styles.aiHubCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <View style={styles.aiHubHeaderRow}>
                <View style={[styles.aiIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Sparkles size={22} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiHubTitle, { color: colors.text }]}>Geko AI Offline RAG Brain</Text>
                  <Text style={[styles.aiHubSub, { color: colors.textMuted }]}>
                    Local vector embeddings in SQLite. Geko AI has 100% awareness of all your expenses, cards & goals.
                  </Text>
                </View>
              </View>

              <View style={[styles.aiStatsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.aiStatItem}>
                  <Text style={[styles.aiStatNum, { color: colors.primary }]}>{transactions.length}</Text>
                  <Text style={[styles.aiStatLabel, { color: colors.textMuted }]}>Total Records</Text>
                </View>
                <View style={[styles.aiStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.aiStatItem}>
                  <Text style={[styles.aiStatNum, { color: '#3B82F6' }]}>{goals.length}</Text>
                  <Text style={[styles.aiStatLabel, { color: colors.textMuted }]}>Goals Tracked</Text>
                </View>
                <View style={[styles.aiStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.aiStatItem}>
                  <Text style={[styles.aiStatNum, { color: '#10B981' }]}>100%</Text>
                  <Text style={[styles.aiStatLabel, { color: colors.textMuted }]}>Offline Ready</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.syncAiBtn,
                  { backgroundColor: isSyncingAI ? `${colors.primary}50` : colors.primary },
                ]}
                onPress={handleSyncAI}
                disabled={isSyncingAI}
              >
                {isSyncingAI ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <RotateCw size={16} color="#FFF" />
                )}
                <Text style={styles.syncAiBtnText}>
                  {isSyncingAI ? 'Indexing Vector Memory...' : 'Sync AI Knowledge Base'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Export Cards Section */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>EXPORT & BACKUP</Text>

            {/* Export JSON Card */}
            <View style={[styles.actionCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <View style={styles.actionCardTop}>
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <FileJson size={22} color="#06B6D4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>Export Full Backup (JSON)</Text>
                  <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
                    Complete portable backup including all transactions, bank cards, wallets, savings goals & salary cutoff budget.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(6, 182, 212, 0.15)', borderColor: '#06B6D4' }]}
                onPress={handleExportJSON}
                disabled={isExportingJSON}
              >
                {isExportingJSON ? (
                  <ActivityIndicator size="small" color="#06B6D4" />
                ) : (
                  <Download size={16} color="#06B6D4" />
                )}
                <Text style={[styles.actionBtnText, { color: '#06B6D4' }]}>Share / Export JSON</Text>
              </TouchableOpacity>
            </View>

            {/* Export CSV Card */}
            <View style={[styles.actionCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <View style={styles.actionCardTop}>
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <FileSpreadsheet size={22} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>Export Ledger (CSV Spreadsheet)</Text>
                  <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
                    Full spreadsheet ledger with dates, categories, notes, amounts, and accounts. Compatible with Excel & Google Sheets.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}
                onPress={handleExportCSV}
                disabled={isExportingCSV}
              >
                {isExportingCSV ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Download size={16} color="#10B981" />
                )}
                <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Share / Export CSV</Text>
              </TouchableOpacity>
            </View>

            {/* Import & Restore Section */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>IMPORT & RESTORE</Text>

            <View style={[styles.actionCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <View style={styles.actionCardTop}>
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Upload size={22} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>Restore from JSON Backup</Text>
                  <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
                    Paste a previously saved Geko JSON backup to safely restore or merge your financial records.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: '#8B5CF6' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsImportModalOpen(true);
                }}
              >
                <Upload size={16} color="#8B5CF6" />
                <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>Open Restore Tool</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL: IMPORT / RESTORE DATA                              */}
      {/* ========================================================= */}
      <Modal
        visible={isImportModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsImportModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Upload size={20} color="#8B5CF6" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Restore Data Backup</Text>
              </View>
              <TouchableOpacity onPress={() => setIsImportModalOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Paste the contents of your exported Geko JSON backup below.
            </Text>

            {/* Mode Selector */}
            <View style={styles.restoreModeRow}>
              <TouchableOpacity
                style={[
                  styles.restoreModeChip,
                  importMode === 'merge' && [styles.restoreModeChipActive, { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }],
                ]}
                onPress={() => setImportMode('merge')}
              >
                <Text style={[styles.restoreModeText, { color: importMode === 'merge' ? colors.primary : colors.textMuted }]}>
                  Merge (Safe Add)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.restoreModeChip,
                  importMode === 'replace' && [styles.restoreModeChipActive, { borderColor: '#F43F5E', backgroundColor: 'rgba(244, 63, 94, 0.15)' }],
                ]}
                onPress={() => setImportMode('replace')}
              >
                <Text style={[styles.restoreModeText, { color: importMode === 'replace' ? '#F43F5E' : colors.textMuted }]}>
                  Replace (Overwrite All)
                </Text>
              </TouchableOpacity>
            </View>

            {/* JSON Input */}
            <TextInput
              style={[
                styles.jsonInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              placeholder="Paste Geko JSON backup payload here..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={importJsonText}
              onChangeText={setImportJsonText}
            />

            {/* Live Preview Box */}
            {importPreview && (
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: importPreview.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    borderColor: importPreview.valid ? '#10B981' : '#F43F5E',
                  },
                ]}
              >
                {importPreview.valid ? (
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={16} color="#10B981" />
                      <Text style={[styles.previewValidTitle, { color: '#10B981' }]}>
                        Valid Backup: {importPreview.appName}
                      </Text>
                    </View>
                    <Text style={[styles.previewValidText, { color: colors.text }]}>
                      Found {importPreview.transCount} transactions, {importPreview.cardsCount} cards, {importPreview.goalsCount} goals.
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.previewErrorText, { color: '#F43F5E' }]}>
                    {importPreview.message}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: importPreview?.valid ? colors.primary : colors.surfaceHighlight,
                  opacity: importPreview?.valid ? 1 : 0.6,
                },
              ]}
              disabled={!importPreview?.valid || isRestoring}
              onPress={handleExecuteRestore}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Check size={18} color="#FFF" />
              )}
              <Text style={styles.submitBtnText}>
                {isRestoring ? 'Restoring & Vectorizing...' : 'Execute Restore & Vectorize for AI'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: CREATE SAVINGS GOAL                                */}
      {/* ========================================================= */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Savings Goal</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Goal Title</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. Emergency Fund, Japan Trip"
              placeholderTextColor={colors.textMuted}
              value={titleInput}
              onChangeText={setTitleInput}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Target Amount (₱)</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="10000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={targetInput}
                  onChangeText={setTargetInput}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Starting Saved (₱)</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={currentInput}
                  onChangeText={setCurrentInput}
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Target Date</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. Dec 2026, Mar 2027"
              placeholderTextColor={colors.textMuted}
              value={targetDateInput}
              onChangeText={setTargetDateInput}
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Goal Photo (Optional)</Text>
            {selectedImageUri ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImageBadge}
                  onPress={() => setSelectedImageUri(null)}
                >
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeImageOverlayBtn}
                  onPress={handlePickImageForNewGoal}
                >
                  <Camera size={14} color="#FFF" />
                  <Text style={styles.changeImageOverlayText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.imagePickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={handlePickImageForNewGoal}
              >
                <ImageIcon size={20} color={colors.primary} />
                <Text style={[styles.imagePickerText, { color: colors.textMuted }]}>
                  Upload Goal Photo (e.g. Drone, Laptop)
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 10 }]}>Quick Preset Cover Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {PRESET_GOAL_IMAGES.map(item => (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.presetChip,
                    {
                      borderColor: selectedImageUri === item.uri ? colors.primary : colors.border,
                      backgroundColor: selectedImageUri === item.uri ? `${colors.primary}20` : colors.background,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedImageUri(item.uri);
                  }}
                >
                  <Image source={{ uri: item.uri }} style={styles.presetChipThumb} resizeMode="cover" />
                  <Text style={[styles.presetChipText, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Select Category Icon</Text>
            <View style={styles.iconSelectorRow}>
              {ICON_OPTIONS.map(({ name, Icon, color }) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.iconChip,
                    {
                      backgroundColor: selectedIcon === name ? `${color}30` : colors.surfaceHighlight,
                      borderColor: selectedIcon === name ? color : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedIcon(name)}
                >
                  <Icon size={18} color={color} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleCreateGoal}>
              <Check size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Save Goal to SQLite</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: MANAGE GOAL / DEPOSIT                              */}
      {/* ========================================================= */}
      <Modal
        visible={selectedGoal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedGoal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedGoal?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedGoal(null)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedGoal?.imageUrl ? (
              <View style={styles.modalBannerImageWrapper}>
                <Image source={{ uri: selectedGoal.imageUrl }} style={styles.modalBannerImage} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.changePhotoBadge}
                  onPress={() => selectedGoal && handlePickImageForExistingGoal(selectedGoal.id)}
                >
                  <Camera size={14} color="#FFF" />
                  <Text style={styles.changePhotoBadgeText}>Update Photo</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={[styles.goalDetailBanner, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.bannerLabel, { color: colors.textMuted }]}>CURRENT SAVED</Text>
              <Text style={[styles.bannerValue, { color: colors.primary }]}>{formatCurrency(selectedGoal?.current || 0)}</Text>
              <Text style={[styles.bannerSub, { color: colors.textMuted }]}>Target: {formatCurrency(selectedGoal?.target || 0)}</Text>
            </View>

            <View style={{ marginVertical: 6 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 4 }]}>Quick Cover Photo Presets</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {PRESET_GOAL_IMAGES.map(item => (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.presetChip,
                      {
                        borderColor: selectedGoal?.imageUrl === item.uri ? colors.primary : colors.border,
                        backgroundColor: selectedGoal?.imageUrl === item.uri ? `${colors.primary}20` : colors.background,
                      },
                    ]}
                    onPress={async () => {
                      if (!selectedGoal) return;
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      await updateGoalImage(selectedGoal.id, item.uri);
                      setSelectedGoal(prev => (prev ? { ...prev, imageUrl: item.uri } : null));
                    }}
                  >
                    <Image source={{ uri: item.uri }} style={styles.presetChipThumb} resizeMode="cover" />
                    <Text style={[styles.presetChipText, { color: colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {!selectedGoal?.imageUrl && (
              <TouchableOpacity
                style={[styles.uploadPhotoBtn, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}
                onPress={() => selectedGoal && handlePickImageForExistingGoal(selectedGoal.id)}
              >
                <Camera size={16} color={colors.primary} />
                <Text style={[styles.uploadPhotoBtnText, { color: colors.primary }]}>Upload Custom Photo from Gallery</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Deposit / Add Money (₱)</Text>
            <View style={styles.depositRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={depositAmountInput}
                onChangeText={setDepositAmountInput}
              />
              <TouchableOpacity style={[styles.depositBtn, { backgroundColor: colors.primary }]} onPress={handleDepositToGoal}>
                <Plus size={16} color="#FFF" />
                <Text style={styles.depositBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={async () => {
                if (!selectedGoal) return;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const addAmt = parseFloat(depositAmountInput.replace(/,/g, '')) || 0;
                if (addAmt > 0) {
                  await updateGoalProgress(selectedGoal.id, selectedGoal.current + addAmt);
                }
                setSelectedGoal(null);
                setDepositAmountInput('');
              }}
            >
              <Check size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Save Changes & Done</Text>
            </TouchableOpacity>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}
                onPress={() => selectedGoal && handleDeleteGoal(selectedGoal.id)}
              >
                <Trash2 size={16} color="#F43F5E" />
                <Text style={styles.deleteModalBtnText}>Delete Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: EDIT SALARY CUTOFF INCOME                          */}
      {/* ========================================================= */}
      <Modal
        visible={isCutoffModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCutoffModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Salary Cutoff Income</Text>
              <TouchableOpacity onPress={() => setIsCutoffModalOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Enter your average take-home pay per salary cutoff (15th & 30th paydays). Geko AI will automatically connect this to calculate your exact goal cutoff savings guide!
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Cutoff Income Amount (₱)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="15000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={cutoffInput}
              onChangeText={setCutoffInput}
            />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSaveCutoffIncome}>
              <Check size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Save Cutoff Income</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayJumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  todayJumpBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentBtnActive: {
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  /* Calendar Styles */
  calendarMonthCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  monthSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  monthStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  miniStatBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
  },
  miniStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E9BAC',
    letterSpacing: 0.5,
  },
  miniStatValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  calendarCellSelected: {
    borderWidth: 1.5,
  },
  dayNumberContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 13,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  dayIndicatorsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 5,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },

  /* Inspector Styles */
  inspectorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  inspectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectorDateTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  inspectorDateSub: {
    fontSize: 12,
    marginTop: 2,
  },
  inspectorDailyTotals: {
    alignItems: 'flex-end',
    gap: 2,
  },
  inspectorExpenseTotal: {
    fontSize: 14,
    fontWeight: '800',
  },
  inspectorIncomeTotal: {
    fontSize: 13,
    fontWeight: '800',
  },
  noTransactionsDayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noTransactionsDayText: {
    fontSize: 13,
  },
  dayTransactionsList: {
    gap: 10,
  },
  dayTransactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  miniCardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCatIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTransTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  utangBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  utangBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
  dayTransNote: {
    fontSize: 12,
    maxWidth: 130,
  },
  dayTransDot: {
    fontSize: 10,
  },
  dayTransTime: {
    fontSize: 11,
  },
  dayTransAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  dayBankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayBankBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  /* Salary Cutoff Card */
  cutoffCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cutoffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cutoffIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cutoffIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutoffTitle: { fontSize: 15, fontWeight: '700' },
  cutoffSubtitle: { fontSize: 11, marginTop: 1 },
  editCutoffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editCutoffBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  cutoffValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  cutoffAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cutoffUnit: {
    fontSize: 13,
  },

  /* Goals Styles */
  goalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  goalDate: {
    fontSize: 12,
    marginTop: 2,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  currentAmount: {
    fontSize: 17,
    fontWeight: '800',
  },
  targetAmount: {
    fontSize: 12,
    marginTop: 2,
  },
  cardImageContainer: {
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cardCoverImage: {
    width: '100%',
    height: '100%',
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  neededText: {
    fontSize: 12,
    fontWeight: '500',
  },
  percentage: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createFirstBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* AI Hub & Backup Styles */
  aiHubCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  aiHubHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  aiIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHubTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  aiHubSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  aiStatsBox: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  aiStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  aiStatNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  aiStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  aiStatDivider: {
    width: 1,
    height: 24,
  },
  syncAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  syncAiBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  actionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  actionCardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalDesc: { fontSize: 13, lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  modalInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 16,
  },
  imagePickerText: { fontSize: 13, fontWeight: '500' },
  imagePreviewWrapper: {
    position: 'relative',
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  removeImageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageOverlayBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  changeImageOverlayText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    paddingLeft: 4,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetChipThumb: { width: 24, height: 24, borderRadius: 8 },
  presetChipText: { fontSize: 11, fontWeight: '600' },
  iconSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBannerImageWrapper: {
    position: 'relative',
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  modalBannerImage: { width: '100%', height: '100%' },
  changePhotoBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  changePhotoBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  goalDetailBanner: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 2,
  },
  bannerLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bannerValue: { fontSize: 24, fontWeight: '800' },
  bannerSub: { fontSize: 12 },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  uploadPhotoBtnText: { fontSize: 13, fontWeight: '700' },
  depositRow: { flexDirection: 'row', gap: 10 },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  depositBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
    marginTop: 6,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  deleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  deleteModalBtnText: { color: '#F43F5E', fontSize: 12, fontWeight: '700' },

  /* Restore Modal Styles */
  restoreModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  restoreModeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  restoreModeChipActive: {
    borderWidth: 1,
  },
  restoreModeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  jsonInput: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlignVertical: 'top',
  },
  previewBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  previewValidTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  previewValidText: {
    fontSize: 11,
    marginTop: 2,
  },
  previewErrorText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
