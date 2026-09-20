import React, { useState, useCallback, useSyncExternalStore } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useTransactions } from '../hooks/useTransactions';
import { BalanceCard } from '../components/home/BalanceCard';
import { ActionRow } from '../components/home/ActionRow';
import { BudgetMeters } from '../components/home/BudgetMeters';
import { RecentActivity } from '../components/home/RecentActivity';
import { useTodayStats } from '../hooks/useTodayStats';
import { useCurrency } from '../hooks/useCurrency';
import { useCards } from '../hooks/useCards';
import { getDisplayName, setDisplayName, subscribeUserStore } from '../store/userStore';
import { Sun, Moon, User, Check, Trash2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type Props = any;

const getTimeBasedGreeting = (name?: string) => {
  const hour = new Date().getHours();
  let timeStr = 'Good evening';
  if (hour >= 5 && hour < 12) {
    timeStr = 'Good morning';
  } else if (hour >= 12 && hour < 18) {
    timeStr = 'Good afternoon';
  }
  return name ? `${timeStr}, ${name}` : `${timeStr} 👋`;
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { balance, refresh: refreshTransactions } = useTransactions();
  const { spentToday, refresh: refreshStats } = useTodayStats();
  const { currency, toggleCurrency, symbol } = useCurrency();
  const { resetAllCardBalances } = useCards();

  const displayName = useSyncExternalStore(subscribeUserStore, getDisplayName);

  const [refreshing, setRefreshing] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [inputName, setInputName] = useState(displayName || '');

  // Show onboarding prompt if user has not set a name yet
  const showOnboarding = !displayName || displayName.trim().length === 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshTransactions(), refreshStats()]);
    require('react-native').DeviceEventEmitter.emit('transactions_updated');
    setRefreshing(false);
  }, [refreshTransactions, refreshStats]);

  const handleSaveName = (nameToSave: string) => {
    const trimmed = nameToSave.trim();
    if (trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDisplayName(trimmed);
      setProfileModalVisible(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Financial Data?',
      'This will permanently delete your local accounts, transactions, budgets, and financial history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await resetAllCardBalances(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setProfileModalVisible(false);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Left: avatar + greeting */}
          <TouchableOpacity
            style={styles.headerLeft}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setInputName(displayName || '');
              setProfileModalVisible(true);
            }}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: `${colors.primary}22`,
                  borderColor: `${colors.primary}44`,
                },
              ]}
            >
              <User size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>
                {getTimeBasedGreeting(displayName)}
              </Text>
              <Text style={[styles.subGreeting, { color: colors.textMuted }]}>
                Personal Finance Companion
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right: currency pill + theme toggle */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleCurrency();
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, { color: colors.primary }]}>
                {symbol} {currency}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeBtn,
                {
                  backgroundColor: isDark ? colors.surface : '#F1F5F9',
                  borderColor: isDark ? colors.border : '#CBD5E1',
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleTheme();
              }}
              activeOpacity={0.75}
            >
              {isDark ? (
                <Sun size={16} color="#FBBF24" strokeWidth={2.2} />
              ) : (
                <Moon size={16} color="#6366F1" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3D Card (Preserving approved 3D design) ── */}
        <View style={{ marginHorizontal: -20 }}>
          <BalanceCard balance={balance} spentToday={spentToday} />
        </View>

        <ActionRow />
        <BudgetMeters />
        <RecentActivity />
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Onboarding / Profile Name Modal */}
      <Modal
        visible={showOnboarding || profileModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {showOnboarding ? "What's your name?" : 'Local Profile & Data'}
              </Text>
              {!showOnboarding && (
                <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              {showOnboarding
                ? 'Welcome to Geko! Enter your name for local device personalization.'
                : 'Your financial data is stored 100% locally on your device.'}
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Enter your name (e.g. Wilbert)"
                placeholderTextColor={colors.textMuted}
                value={inputName}
                onChangeText={setInputName}
                autoFocus={showOnboarding}
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleSaveName(inputName)}
              >
                <Check size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {!showOnboarding && (
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: '#EF444422', backgroundColor: '#EF444411' }]}
                onPress={handleResetData}
              >
                <Trash2 size={16} color="#EF4444" />
                <Text style={styles.dangerBtnText}>Reset All Financial Data</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subGreeting: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  themeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  profileCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  saveBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  dangerBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
});
