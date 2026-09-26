import React, { useState } from 'react';
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
} from 'lucide-react-native';
import { formatCurrency } from '../utils/formatters';
import { useGoals, Goal } from '../hooks/useGoals';
import { useCutoffIncome, setCutoffIncome } from '../store/userStore';
import * as Haptics from 'expo-haptics';

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
  const { colors } = useTheme();
  const { goals, addGoal, updateGoalProgress, updateGoalImage, deleteGoal, clearAllGoals } = useGoals();
  const cutoffIncome = useCutoffIncome();

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
      setSelectedGoal(prev => prev ? { ...prev, imageUrl: uri } : null);
    }
  };

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

  const handleClearAll = () => {
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── Screen Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Savings Goals</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {goals.length === 0 ? 'No active goals' : `${goals.length} active savings goals`}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {goals.length > 0 && (
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}
              onPress={handleClearAll}
            >
              <Trash2 size={16} color="#F43F5E" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={openAddModal}>
            <Plus color="#FFF" size={22} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Salary Cutoff Income Banner ── */}
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

        {goals.length === 0 ? (
          /* ── Empty State ── */
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <PiggyBank size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Savings Goals Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Create your own real savings goal (e.g. Emergency Fund, New Car, House) and track progress in real time!
            </Text>
            <TouchableOpacity style={[styles.createFirstBtn, { backgroundColor: colors.primary }]} onPress={openAddModal}>
              <Plus size={18} color="#FFF" />
              <Text style={styles.createFirstBtnText}>Create Your First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Real Goals List ── */
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
      </ScrollView>

      {/* ── Create Goal Modal ── */}
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

      {/* ── Manage Goal / Deposit Modal ── */}
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
                      setSelectedGoal(prev => prev ? { ...prev, imageUrl: item.uri } : null);
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

      {/* ── Edit Salary Cutoff Income Modal ── */}
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
    marginVertical: 16,
  },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 16,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  createFirstBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  goalCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardImageContainer: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 10,
  },
  cardCoverImage: {
    width: '100%',
    height: '100%',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  goalDate: {
    fontSize: 12,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  currentAmount: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  targetAmount: {
    fontSize: 12,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  imagePickerBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  changeImageOverlayText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalBannerImageWrapper: {
    width: '100%',
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  modalBannerImage: {
    width: '100%',
    height: '100%',
  },
  changePhotoBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  changePhotoBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  uploadPhotoBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  presetChipThumb: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  goalDetailBanner: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerSub: {
    fontSize: 12,
  },
  depositRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 14,
    gap: 4,
  },
  depositBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalActionsRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  deleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  deleteModalBtnText: {
    color: '#F43F5E',
    fontWeight: '700',
    fontSize: 13,
  },
  cutoffCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  cutoffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cutoffIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cutoffIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutoffTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cutoffSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  editCutoffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  editCutoffBtnText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 12,
  },
  cutoffValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  cutoffAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  cutoffUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
});
