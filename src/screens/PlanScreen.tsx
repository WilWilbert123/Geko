import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Plus, Car, ShieldAlert, Laptop, Plane, Target } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatters';
import { useGoals } from '../hooks/useGoals';
import { getDb } from '../database/sqlite';
import { uuidv4 } from '../utils/uuid';

const getIconComponent = (name: string) => {
  switch (name) {
    case 'Car': return Car;
    case 'ShieldAlert': return ShieldAlert;
    case 'Laptop': return Laptop;
    case 'Plane': return Plane;
    default: return Target;
  }
};

const getIconColor = (name: string) => {
  switch (name) {
    case 'Car': return '#10B981';
    case 'ShieldAlert': return '#3B82F6';
    case 'Laptop': return '#8B5CF6';
    case 'Plane': return '#F59E0B';
    default: return '#EF4444';
  }
};

export const PlanScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { goals, refresh } = useGoals();

  const handleAddGoal = async () => {
    // Basic implementation for adding a real goal to DB
    const db = getDb();
    const newGoal = {
      id: uuidv4(),
      title: 'New House Fund',
      current: 5000,
      target: 50000,
      targetDate: 'Jan 2030',
      iconName: 'Target'
    };
    try {
      await db.execute(
        'INSERT INTO goals (id, title, current, target, targetDate, iconName) VALUES (?, ?, ?, ?, ?, ?)',
        [newGoal.id, newGoal.title, newGoal.current, newGoal.target, newGoal.targetDate, newGoal.iconName]
      );
      Alert.alert('Success', 'Goal added to database!');
      refresh();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to add goal.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Savings Goals</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddGoal}>
          <Plus color={colors.background} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {goals.map(goal => {
          const progress = Math.min(goal.current / goal.target, 1);
          const Icon = getIconComponent(goal.iconName);
          const color = getIconColor(goal.iconName);
          
          return (
            <TouchableOpacity key={goal.id} style={[styles.goalCard, { backgroundColor: colors.surfaceHighlight }]}>
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

              {/* Progress Bar Container */}
              <View style={[styles.progressBg, { backgroundColor: colors.background }]}>
                <View style={[styles.progressFill, { backgroundColor: color, width: `${progress * 100}%` }]} />
              </View>
              
              <Text style={[styles.percentage, { color: color }]}>
                {Math.round(progress * 100)}% Funded
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    marginVertical: 20,
  },
  title: { fontSize: 28, fontWeight: '700' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  goalCard: {
    padding: 16,
    borderRadius: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalDate: {
    fontSize: 12,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  currentAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  targetAmount: {
    fontSize: 12,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  }
});
