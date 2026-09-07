import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import { Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '../common/Card';
import Animated, { Layout } from 'react-native-reanimated';

interface BalanceCardProps {
  balance: number;
  dailyLimit?: number;
  spentToday?: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ 
  balance, 
  dailyLimit = 150, 
  spentToday = 45 
}) => {
  const { colors } = useTheme();
  const [isHidden, setIsHidden] = useState(false);

  const toggleHidden = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsHidden(!isHidden);
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Total Balance</Text>
        <Pressable onPress={toggleHidden} hitSlop={10} style={styles.eyeBtn}>
          {isHidden ? 
            <EyeOff size={20} color={colors.textMuted} /> : 
            <Eye size={20} color={colors.textMuted} />
          }
        </Pressable>
      </View>
      
      <Animated.View layout={Layout.springify()}>
        <Text style={[styles.balance, { color: colors.text }]}>
          {isHidden ? '••••••' : formatCurrency(balance)}
        </Text>
      </Animated.View>
      
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spent Today</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(spentToday)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Daily Limit</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(dailyLimit)}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  balance: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    marginHorizontal: 16,
  }
});
