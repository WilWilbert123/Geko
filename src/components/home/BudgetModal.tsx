import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useBudgets, Budget } from '../../hooks/useBudgets';
import { formatCurrency } from '../../utils/formatters';
import {
  X,
  Plus,
  Edit3,
  Trash2,
  PieChart,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Tag,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  food: Utensils,
  dining: Utensils,
  transport: Car,
  shopping: ShoppingBag,
  utilities: Zap,
  bills: Zap,
};

const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase();
  for (const [k, IconComp] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(k)) return IconComp;
  }
  return Tag;
};

export const BudgetModal: React.FC<BudgetModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { budgets, updateBudgetLimit, addBudget, deleteBudget } = useBudgets();

  // Edit Limit State
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editLimitInput, setEditLimitInput] = useState('');

  // Add New Budget State
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newLimitInput, setNewLimitInput] = useState('');

  const totalLimit = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const totalRemaining = totalLimit - totalSpent;
  const overallPercent = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;

  const handleSaveEdit = async () => {
    if (!editingBudget) return;
    const val = parseFloat(editLimitInput);
    if (!isNaN(val) && val > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateBudgetLimit(editingBudget.id, val);
      setEditingBudget(null);
      setEditLimitInput('');
    } else {
      Alert.alert('Invalid Amount', 'Please enter a valid monthly limit amount.');
    }
  };

  const handleCreateBudget = async () => {
    const name = newCatName.trim();
    const val = parseFloat(newLimitInput);
    if (name && !isNaN(val) && val > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addBudget(name, val);
      setIsAdding(false);
      setNewCatName('');
      setNewLimitInput('');
    } else {
      Alert.alert('Missing Info', 'Please enter a category name and a valid monthly budget limit.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Remove Budget?',
      `Are you sure you want to remove the monthly spending limit for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteBudget(id);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.sheetContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <PieChart size={20} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Category Budgets</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Set monthly spending limits for each category
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight }]}
              onPress={onClose}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Total Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>TOTAL MONTHLY BUDGET</Text>
                  <Text style={[styles.summaryVal, { color: colors.text }]}>{formatCurrency(totalLimit)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>BUDGET LEFT</Text>
                  <Text style={[styles.summaryVal, { color: totalRemaining >= 0 ? '#10B981' : '#EF4444' }]}>
                    {formatCurrency(totalRemaining)}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${overallPercent}%`,
                      backgroundColor: overallPercent > 90 ? '#EF4444' : overallPercent > 75 ? '#F59E0B' : '#10B981',
                    },
                  ]}
                />
              </View>
              <View style={styles.progressSub}>
                <Text style={[styles.progressSubText, { color: colors.textMuted }]}>
                  {overallPercent}% of total budget spent ({formatCurrency(totalSpent)})
                </Text>
              </View>
            </View>

            {/* List of Category Budgets */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
              <TouchableOpacity
                style={[styles.addBtnSmall, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsAdding(true);
                }}
              >
                <Plus size={14} color="#10B981" />
                <Text style={styles.addBtnSmallText}>New Budget</Text>
              </TouchableOpacity>
            </View>

            {/* Add New Budget Inline Form */}
            {isAdding && (
              <View style={[styles.formCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                <Text style={[styles.formTitle, { color: colors.text }]}>Add Category Budget</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  placeholder="Category Name (e.g. Dining, Shopping)"
                  placeholderTextColor={colors.textMuted}
                  value={newCatName}
                  onChangeText={setNewCatName}
                />
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  placeholder="Monthly Limit (e.g. 5000)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={newLimitInput}
                  onChangeText={setNewLimitInput}
                />
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setIsAdding(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveFormBtn} onPress={handleCreateBudget}>
                    <Text style={styles.saveFormBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {budgets.map((b) => {
              const IconComp = getCategoryIcon(b.categoryName);
              const pct = b.limitAmount > 0 ? Math.min(100, Math.round((b.spentAmount / b.limitAmount) * 100)) : 0;
              const remaining = b.limitAmount - b.spentAmount;

              return (
                <View
                  key={b.id}
                  style={[styles.budgetItem, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <View style={[styles.catBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <IconComp size={18} color="#10B981" />
                      </View>
                      <View>
                        <Text style={[styles.catName, { color: colors.text }]}>{b.categoryName}</Text>
                        <Text style={[styles.catSub, { color: colors.textMuted }]}>
                          <Text style={{ fontWeight: '700', color: colors.text }}>{formatCurrency(b.spentAmount)}</Text> / {formatCurrency(b.limitAmount)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemRight}>
                      <TouchableOpacity
                        style={[styles.actionIconBtn, { backgroundColor: colors.surface }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEditingBudget(b);
                          setEditLimitInput(b.limitAmount.toString());
                        }}
                      >
                        <Edit3 size={15} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                        onPress={() => handleDelete(b.id, b.categoryName)}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Progress bar per category */}
                  <View style={styles.catProgressTrack}>
                    <View
                      style={[
                        styles.catProgressFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: pct > 90 ? '#EF4444' : pct > 75 ? '#F59E0B' : '#10B981',
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.catFooter}>
                    <Text style={[styles.pctText, { color: pct > 90 ? '#EF4444' : colors.textMuted }]}>
                      {pct}% used
                    </Text>
                    <Text style={[styles.remText, { color: remaining >= 0 ? '#10B981' : '#EF4444' }]}>
                      {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over limit`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Inline Edit Limit Modal */}
          {editingBudget && (
            <View style={styles.editOverlay}>
              <View style={[styles.editCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.editTitle, { color: colors.text }]}>
                  Edit Limit: {editingBudget.categoryName}
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                  placeholder="New Monthly Limit"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={editLimitInput}
                  onChangeText={setEditLimitInput}
                  autoFocus
                />
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setEditingBudget(null)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveFormBtn} onPress={handleSaveEdit}>
                    <Text style={styles.saveFormBtnText}>Update Limit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
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
  scrollContent: {
    paddingBottom: 24,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSub: {
    marginTop: 8,
  },
  progressSubText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  addBtnSmallText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveFormBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  saveFormBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  budgetItem: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 15,
    fontWeight: '700',
  },
  catSub: {
    fontSize: 12,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  catProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  catFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pctText: {
    fontSize: 12,
    fontWeight: '600',
  },
  remText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  editCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
