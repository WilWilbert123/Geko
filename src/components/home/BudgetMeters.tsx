import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useBudgets } from '../../hooks/useBudgets';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { formatCurrency } from '../../utils/formatters';

const ProgressBar = ({ spent, limit }: { spent: number; limit: number }) => {
  const { colors } = useTheme();
  const percentage = Math.min((spent / limit) * 100, 100);
  
  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(`${percentage}%`, { damping: 20, stiffness: 90 })
  }));

  // Monochrome colors
  const bgColor = colors.background === '#ffffff' ? '#E5E7EB' : '#333333';
  const fillColor = colors.background === '#ffffff' ? '#111827' : '#FFFFFF';

  return (
    <View style={[styles.barBackground, { backgroundColor: bgColor }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: fillColor }, animatedStyle]} />
    </View>
  );
};

export const BudgetMeters = () => {
  const { colors } = useTheme();
  const { budgets } = useBudgets();

  if (!budgets || budgets.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Smart Budgets</Text>
      <View style={styles.metersList}>
        {budgets.map((b) => (
          <View key={b.id} style={styles.meterContainer}>
            <View style={styles.meterHeader}>
              <Text style={[styles.category, { color: colors.text }]}>{b.categoryName}</Text>
              <Text style={[styles.amounts, { color: colors.textMuted }]}>
                <Text style={{ color: colors.text }}>{formatCurrency(b.spentAmount)}</Text> / {formatCurrency(b.limitAmount)}
              </Text>
            </View>
            <ProgressBar spent={b.spentAmount} limit={b.limitAmount} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  metersList: {
    gap: 16,
  },
  meterContainer: {
    gap: 8,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  category: {
    fontSize: 14,
    fontWeight: '500',
  },
  amounts: {
    fontSize: 12,
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  }
});
