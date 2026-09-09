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
  TrendingDown
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { InstallmentModal } from './InstallmentModal';

export const ActionRow = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [installmentModalVisible, setInstallmentModalVisible] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const handlePress = (id: string, actionFn?: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (actionFn) {
      actionFn();
    } else if (id === 'installment') {
      setInstallmentModalVisible(true);
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
      onPress: () => handlePress('budget', () => navigation.navigate('Plan')),
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
      subtitle: 'Snowball & avalanche debt strategies',
      icon: TrendingDown,
      color: '#EF4444',
      onPress: () => {
        setModalVisible(false);
      },
    },
  ];

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
                <Icon size={18} color={colors.text} strokeWidth={1.8} />
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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 2,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 56,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '500',
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
