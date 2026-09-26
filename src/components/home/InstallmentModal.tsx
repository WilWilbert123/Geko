import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Alert,
  NativeModules,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useInstallments, Installment } from '../../hooks/useInstallments';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../hooks/useCurrency';
import * as Haptics from 'expo-haptics';
import {
  X,
  Plus,
  Layers,
  CheckCircle2,
  CalendarClock,
  ArrowDownCircle,
  CreditCard,
  Trash2,
  Camera,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { CleanAlertModal } from '../common/CleanAlertModal';

let ImagePickerModule: typeof import('expo-image-picker') | null = null;
try {
  if (NativeModules.ExponentImagePicker || NativeModules.ExpoImagePicker) {
    ImagePickerModule = require('expo-image-picker');
  }
} catch (e) {
  ImagePickerModule = null;
}

const PRESET_INSTALLMENT_IMAGES = [
  { label: '💻 Laptop', uri: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800' },
  { label: '📱 Phone', uri: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800' },
  { label: '📺 Appliance', uri: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=800' },
  { label: '🎮 Console', uri: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=800' },
  { label: '📸 Camera', uri: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800' },
  { label: '🚗 Vehicle', uri: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800' },
];

const getInstallmentImage = (inst: Installment): string | null => {
  if (inst.imageUrl && inst.imageUrl.trim().length > 0) return inst.imageUrl;
  const t = (inst.title || '').toLowerCase();
  if (t.includes('laptop') || t.includes('macbook') || t.includes('pc')) return PRESET_INSTALLMENT_IMAGES[0].uri;
  if (t.includes('iphone') || t.includes('phone') || t.includes('samsung')) return PRESET_INSTALLMENT_IMAGES[1].uri;
  if (t.includes('tv') || t.includes('appliance') || t.includes('refrigerator')) return PRESET_INSTALLMENT_IMAGES[2].uri;
  if (t.includes('ps5') || t.includes('console') || t.includes('game') || t.includes('onexplayer')) return PRESET_INSTALLMENT_IMAGES[3].uri;
  if (t.includes('camera') || t.includes('canon') || t.includes('sony')) return PRESET_INSTALLMENT_IMAGES[4].uri;
  if (t.includes('car') || t.includes('motor') || t.includes('vehicle')) return PRESET_INSTALLMENT_IMAGES[5].uri;
  return null;
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const InstallmentModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { installments, addInstallment, payCutoff, deleteInstallment } = useInstallments();
  const { symbol } = useCurrency();

  const [activeTab, setActiveTab] = useState<'plans' | 'create'>('plans');
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(3);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const durationOptions = [3, 6, 12, 24];

  const calculatedMonthly = totalAmount && !isNaN(Number(totalAmount)) && Number(totalAmount) > 0
    ? (Number(totalAmount) / selectedMonths).toFixed(2)
    : '0.00';

  const handlePickImage = async () => {
    if (!ImagePickerModule) {
      Alert.alert('Not Supported', 'Photo library picker is not available on this build.');
      return;
    }
    try {
      const { status } = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required to upload a photo.');
        return;
      }
      const result = await ImagePickerModule.launchImageLibraryAsync({
        mediaTypes: ImagePickerModule.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Image picker error', e);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Missing Plan Name',
        message: 'Please enter a name for your installment plan.',
      });
      return;
    }
    const amt = parseFloat(totalAmount);
    if (isNaN(amt) || amt <= 0) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid total amount for this plan.',
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const planTitle = title.trim();
    const months = selectedMonths;
    await addInstallment(planTitle, amt, months, selectedImageUri || undefined);
    setTitle('');
    setTotalAmount('');
    setSelectedMonths(3);
    setSelectedImageUri(null);
    setActiveTab('plans');
    
    setAlertConfig({
      visible: true,
      type: 'success',
      title: 'Plan Created!',
      message: `Created ${months}-month installment plan for ${planTitle}!`,
    });
  };

  const handlePayCutoff = async (item: Installment) => {
    try {
      setProcessingId(item.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const result = await payCutoff(item.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Cut-off Deducted!',
        message: `Successfully deducted ${formatCurrency(result.amountDeducted)} from your Geko Card for Cut-off ${result.cutOffNumber}/${result.totalMonths}.${
          result.isCompleted ? ' Plan fully paid!' : ''
        }`,
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Payment Failed',
        message: err?.message || 'Failed to process cut-off payment.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.container,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Layers size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Installment Plans</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Fixed cut-off deductions on your Geko Card
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

          {/* Tab Switcher */}
          <View style={[styles.tabBar, { backgroundColor: colors.surfaceHighlight }]}>
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'plans' && { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setActiveTab('plans')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'plans' ? colors.text : colors.textMuted },
                ]}
              >
                Active Plans ({installments.filter((i) => i.status === 'active').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'create' && { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setActiveTab('create')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'create' ? colors.text : colors.textMuted },
                ]}
              >
                + New Plan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {activeTab === 'plans' ? (
              installments.length === 0 ? (
                <View style={styles.emptyState}>
                  <CreditCard size={48} color={colors.border} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Installment Plans</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    Create a 3, 6, or 12-month installment plan to automatically manage cut-off deductions.
                  </Text>
                  <TouchableOpacity
                    style={[styles.createFirstBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setActiveTab('create')}
                  >
                    <Text style={[styles.createFirstText, { color: colors.background }]}>
                      Add Your First Plan
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                installments.map((inst) => {
                  const progress = inst.totalMonths > 0 ? inst.paidMonths / inst.totalMonths : 0;
                  const isDone = inst.status === 'completed';
                  const imgUri = getInstallmentImage(inst);

                  return (
                    <View
                      key={inst.id}
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.04)',
                          borderColor: isDone ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {/* Optional Plan Image Banner Header */}
                      {imgUri ? (
                        <View style={styles.planCardImageWrapper}>
                          <Image source={{ uri: imgUri }} style={styles.planCardImage} resizeMode="cover" />
                          <View style={styles.planCardBadgeTag}>
                            <Text style={styles.planCardBadgeText}>{inst.totalMonths} Mo Plan</Text>
                          </View>
                        </View>
                      ) : null}

                      {/* Top Header Row */}
                      <View style={styles.cardHeaderRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                            {inst.title}
                          </Text>
                          <Text style={[styles.cardDate, { color: colors.textMuted }]}>
                            Next cut-off: {format(inst.nextCutoff, 'MMM d, yyyy')}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            {isDone ? (
                              <View style={styles.completedBadge}>
                                <CheckCircle2 size={14} color="#10B981" />
                                <Text style={styles.completedText}>Completed</Text>
                              </View>
                            ) : (
                              <Text style={[styles.monthlyRate, { color: colors.text }]}>
                                {formatCurrency(inst.monthlyAmount)}
                                <Text style={{ fontSize: 11, fontWeight: '400', color: colors.textMuted }}>/cut-off</Text>
                              </Text>
                            )}
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                deleteInstallment(inst.id);
                              }}
                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                              style={[styles.deleteIconBtn, { backgroundColor: `${colors.textMuted}15` }]}
                              activeOpacity={0.6}
                            >
                              <Trash2 size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                          <View
                            style={[
                              styles.progressBar,
                              {
                                backgroundColor: isDone ? '#10B981' : colors.primary,
                                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.progressLabelRow}>
                          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                            {inst.paidMonths} of {inst.totalMonths} paid
                          </Text>
                          <Text style={[styles.progressLabel, { color: colors.text }]}>
                            Total: {formatCurrency(inst.totalAmount)}
                          </Text>
                        </View>
                      </View>

                      {/* Cut-off Deduction Action */}
                      {!isDone && (
                        <TouchableOpacity
                          style={[
                            styles.payBtn,
                            {
                              backgroundColor: colors.primary,
                              opacity: processingId === inst.id ? 0.6 : 1,
                            },
                          ]}
                          disabled={processingId === inst.id}
                          onPress={() => handlePayCutoff(inst)}
                          activeOpacity={0.7}
                        >
                          <ArrowDownCircle size={16} color={colors.background} />
                          <Text style={[styles.payBtnText, { color: colors.background }]}>
                            {processingId === inst.id
                              ? 'Deducting...'
                              : `Deduct Cut-off ${inst.paidMonths + 1}/${inst.totalMonths} (${formatCurrency(inst.monthlyAmount)})`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )
            ) : (
              /* Create Plan Form */
              <View style={styles.form}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Plan Item / Title</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceHighlight,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="e.g. iPhone 15, Appliances, Laptop"
                    placeholderTextColor={colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Plan Item Image Selection */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PLAN ITEM PHOTO</Text>
                  {selectedImageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setSelectedImageUri(null)}
                      >
                        <X size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.uploadBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                        onPress={handlePickImage}
                      >
                        <Camera size={18} color={colors.primary} />
                        <Text style={[styles.uploadBoxText, { color: colors.text }]}>Upload Photo / Gallery</Text>
                      </TouchableOpacity>

                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500' }}>Or select a quick preset:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {PRESET_INSTALLMENT_IMAGES.map((p) => (
                          <TouchableOpacity
                            key={p.label}
                            style={[
                              styles.presetChip,
                              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                            ]}
                            onPress={() => setSelectedImageUri(p.uri)}
                          >
                            <Text style={{ fontSize: 11.5, color: colors.text, fontWeight: '600' }}>{p.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                    Total Amount ({symbol})
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceHighlight,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="e.g. 900.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                    Number of Months
                  </Text>
                  <View style={styles.durationRow}>
                    {durationOptions.map((months) => (
                      <TouchableOpacity
                        key={months}
                        style={[
                          styles.durationBtn,
                          {
                            backgroundColor:
                              selectedMonths === months
                                ? colors.primary
                                : colors.surfaceHighlight,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setSelectedMonths(months)}
                      >
                        <Text
                          style={[
                            styles.durationText,
                            {
                              color:
                                selectedMonths === months ? colors.background : colors.text,
                            },
                          ]}
                        >
                          {months} Mo
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Calculation Summary Box */}
                <View
                  style={[
                    styles.summaryBox,
                    { backgroundColor: `${colors.primary}12`, borderColor: colors.primary },
                  ]}
                >
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                      Monthly Cut-off Deduction:
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>
                      {symbol}
                      {calculatedMonthly} / month
                    </Text>
                  </View>
                  <Text style={[styles.summaryNote, { color: colors.textMuted }]}>
                    Each time you trigger or confirm a cut-off, {symbol}
                    {calculatedMonthly} will be deducted from your Geko Card and recorded in your transaction activity.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreate}
                >
                  <Plus size={18} color={colors.background} />
                  <Text style={[styles.submitText, { color: colors.background }]}>
                    Save Installment Plan
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>

      <CleanAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingTop: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardDate: {
    fontSize: 12,
    marginTop: 3,
  },
  monthlyRate: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  progressContainer: {
    gap: 6,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  payBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  createFirstBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  createFirstText: {
    fontSize: 13,
    fontWeight: '700',
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  durationText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  summaryBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryNote: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
  },
  planCardImageWrapper: {
    height: 110,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
  },
  planCardImage: {
    width: '100%',
    height: '100%',
  },
  planCardBadgeTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planCardBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadBoxText: {
    fontSize: 13,
    fontWeight: '600',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  imagePreviewContainer: {
    height: 125,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
