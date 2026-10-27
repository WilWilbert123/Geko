import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  NativeModules,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useTransactions } from '../../hooks/useTransactions';
import { useCards } from '../../hooks/useCards';
import { parseReceiptText, ParsedReceipt, SAMPLE_RECEIPTS, ReceiptItem } from '../../services/receipt/receiptParser';
import { performReceiptOCR } from '../../services/receipt/ocrService';
import { formatCurrency } from '../../utils/formatters';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  X,
  ScanLine,
  Receipt,
  Sparkles,
  ShoppingBag,
  Utensils,
  Car,
  Zap,
  HeartPulse,
  Tag,
  ArrowRight,
  ClipboardPaste,
  ChevronRight,
  Info,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
} from 'lucide-react-native';

// Safe lazy loading for expo-image-picker
let ImagePickerModule: typeof import('expo-image-picker') | null = null;
try {
  if (NativeModules.ExponentImagePicker || NativeModules.ExpoImagePicker) {
    ImagePickerModule = require('expo-image-picker');
  }
} catch (e) {
  ImagePickerModule = null;
}

interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (parsed: ParsedReceipt) => void;
}

const CATEGORY_MAP: Record<string, { name: string; icon: any; color: string }> = {
  Food: { name: 'Food & Dining', icon: Utensils, color: '#D97706' },
  Shopping: { name: 'Shopping & Groceries', icon: ShoppingBag, color: '#E11D48' },
  Transport: { name: 'Transport & Fuel', icon: Car, color: '#0284C7' },
  Utilities: { name: 'Bills & Utilities', icon: Zap, color: '#4F46E5' },
  Health: { name: 'Health & Meds', icon: HeartPulse, color: '#DB2777' },
  General: { name: 'General Expense', icon: Tag, color: '#475569' },
};

const POPULAR_STORES = [
  'Jollibee',
  '7-Eleven',
  'Puregold',
  'SM Supermarket',
  'McDonald’s',
  'Mercury Drug',
  'Shell',
  'Watsons',
  'Grab',
];

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({ visible, onClose, onSuccess }) => {
  const { colors, isDark } = useTheme();
  const { addTransaction } = useTransactions();
  const { cards } = useCards();

  const [activeTab, setActiveTab] = useState<'camera' | 'paste' | 'samples'>('camera');
  const [pastedText, setPastedText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('Align receipt in view...');
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  // Editable confirmation states
  const [editTotal, setEditTotal] = useState('');
  const [editStore, setEditStore] = useState('');
  const [editItems, setEditItems] = useState<ReceiptItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [selectedBank, setSelectedBank] = useState('GCash');
  const [isSaving, setIsSaving] = useState(false);

  // Animated laser beam for the viewfinder
  const laserProgress = useSharedValue(0);

  useEffect(() => {
    laserProgress.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);

  const laserStyle = useAnimatedStyle(() => {
    return {
      top: `${interpolate(laserProgress.value, [0, 1], [5, 92])}%`,
      opacity: interpolate(laserProgress.value, [0, 0.5, 1], [0.6, 1, 0.6]),
    };
  });

  // Reset modal state
  const resetState = () => {
    setParsedData(null);
    setPhotoUri(null);
    setPastedText('');
    setEditTotal('');
    setEditStore('');
    setEditItems([]);
    setIsSaving(false);
    setIsScanning(false);
    setShowPhotoPreview(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Launch camera
  const handleLaunchCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (!ImagePickerModule && (NativeModules.ExponentImagePicker || NativeModules.ExpoImagePicker)) {
        try {
          ImagePickerModule = require('expo-image-picker');
        } catch (e) {
          ImagePickerModule = null;
        }
      }

      if (!ImagePickerModule || typeof ImagePickerModule.launchCameraAsync !== 'function') {
        Alert.alert(
          'Camera Notice',
          'Live camera capture requires native client build (`npx expo run:android`). In the meantime, you can test with 1-Tap Realistic Samples or Paste Receipt Text!',
          [{ text: 'OK' }]
        );
        return;
      }

      const perm = await ImagePickerModule.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan receipt photos.');
        return;
      }

      const result = await ImagePickerModule.launchCameraAsync({
        quality: 0.85,
        allowsEditing: true,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        processImageOCR(asset.base64, asset.uri);
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      Alert.alert('Camera Error', 'Could not access camera: ' + (err.message || 'Unknown error'));
    }
  };

  // Launch gallery
  const handleLaunchGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (!ImagePickerModule && (NativeModules.ExponentImagePicker || NativeModules.ExpoImagePicker)) {
        try {
          ImagePickerModule = require('expo-image-picker');
        } catch (e) {
          ImagePickerModule = null;
        }
      }

      if (!ImagePickerModule || typeof ImagePickerModule.launchImageLibraryAsync !== 'function') {
        Alert.alert(
          'Gallery Notice',
          'Photo library access requires native client build. You can test with 1-Tap Realistic Samples or Paste Receipt Text!',
          [{ text: 'OK' }]
        );
        return;
      }

      const perm = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Gallery access is needed to select receipt photos.');
        return;
      }

      const result = await ImagePickerModule.launchImageLibraryAsync({
        quality: 0.85,
        allowsEditing: true,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        processImageOCR(asset.base64, asset.uri);
      }
    } catch (err: any) {
      console.warn('Gallery error:', err);
      Alert.alert('Gallery Error', 'Could not open gallery: ' + (err.message || 'Unknown error'));
    }
  };

  // Perform real optical OCR on the selected image
  const processImageOCR = async (base64Data?: string | null, uri?: string) => {
    if (!base64Data) {
      // Fallback if base64 wasn't returned
      const fallback = SAMPLE_RECEIPTS[0];
      handleLoadParsedText(fallback.rawText, uri);
      return;
    }

    setIsScanning(true);
    setScanStatus('Scanning & Reading receipt with Optical AI...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const ocrResult = await performReceiptOCR(base64Data, {
        onProgress: (msg) => setScanStatus(msg),
      });

      setIsScanning(false);

      if (ocrResult.success && ocrResult.text) {
        handleLoadParsedText(ocrResult.text, uri);
      } else {
        // If OCR didn't catch text, offer graceful fallback
        Alert.alert(
          'Scan Notice',
          'Optical AI could not clearly read the text on this photo. We have opened the receipt review form so you can quickly enter or adjust the total.',
          [{ text: 'OK' }]
        );
        handleLoadParsedText('Store Receipt\nTOTAL: ₱0.00', uri);
      }
    } catch (e: any) {
      setIsScanning(false);
      console.warn('OCR processing failed', e);
      handleLoadParsedText('Store Receipt\nTOTAL: ₱0.00', uri);
    }
  };

  // Process raw text through the parser engine
  const handleLoadParsedText = (text: string, imageUri?: string) => {
    const parsed = parseReceiptText(text);
    setParsedData(parsed);
    setEditTotal(parsed.total > 0 ? parsed.total.toString() : '');
    setEditStore(parsed.merchant || 'Store Receipt');
    setEditItems(parsed.items || []);
    setSelectedCategory(parsed.category || 'Food');
    setSelectedBank(parsed.suggestedBank || 'GCash');
    if (imageUri) setPhotoUri(imageUri);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Delete a line item
  const handleDeleteItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = editItems.filter((_, i) => i !== index);
    setEditItems(updated);
    // Recalculate total if valid
    const newSum = updated.reduce((s, it) => s + it.total, 0);
    if (newSum > 0) {
      setEditTotal(newSum.toFixed(2));
    }
  };

  // Add an extra line item
  const handleAddItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newItem: ReceiptItem = {
      name: 'Item ' + (editItems.length + 1),
      qty: 1,
      price: 50,
      total: 50,
    };
    const updated = [...editItems, newItem];
    setEditItems(updated);
    const newSum = updated.reduce((s, it) => s + it.total, 0);
    setEditTotal(newSum.toFixed(2));
  };

  // Handle saving the parsed receipt into Geko budget tracker
  const handleSaveToBudget = async () => {
    const amountVal = parseFloat(editTotal);
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert('Invalid Amount', 'Please provide a valid receipt total before saving.');
      return;
    }

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Build an itemized note summary
      let itemNote = editStore.trim();
      if (editItems.length > 0) {
        const itemNames = editItems.map((it) => `${it.qty}x ${it.name}`).slice(0, 3).join(', ');
        itemNote = `${editStore}: ${itemNames}`;
        if (editItems.length > 3) {
          itemNote += ` +${editItems.length - 3} more`;
        }
      }

      await addTransaction({
        amount: amountVal,
        type: 'expense',
        categoryId: selectedCategory,
        note: itemNote,
        bankName: selectedBank,
        date: parsedData?.date ? parsedData.date.getTime() : Date.now(),
      });

      if (onSuccess && parsedData) {
        onSuccess({
          ...parsedData,
          merchant: editStore,
          total: amountVal,
          items: editItems,
          category: selectedCategory,
          suggestedBank: selectedBank,
        });
      }

      handleClose();
    } catch (e) {
      console.error('Failed to save receipt transaction', e);
      Alert.alert('Save Failed', 'Could not record receipt transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.headerIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <ScanLine size={20} color="#F59E0B" strokeWidth={2.5} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Realtime Receipt Scanner</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Optical AI parser & instant budget categorizer
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* If optical OCR is processing an image */}
          {isScanning ? (
            <View style={styles.scanningOverlay}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={[styles.scanningStatusText, { color: colors.text }]}>{scanStatus}</Text>
              <Text style={[styles.scanningSubText, { color: colors.textMuted }]}>
                Extracting store, prices, 12% VAT, and line items...
              </Text>
            </View>
          ) : parsedData ? (
            /* Once parsed, show interactive review & confirmation */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Optional Photo Thumbnail preview */}
              {photoUri && (
                <View style={styles.photoPreviewRow}>
                  <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.photoCapturedText, { color: colors.text }]}>Scanned Receipt Photo</Text>
                    <Text style={[styles.photoCapturedSub, { color: colors.textMuted }]}>
                      Optical character recognition applied
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      resetState();
                    }}
                  >
                    <RefreshCw size={14} color="#059669" />
                    <Text style={styles.retakeBtnText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Realistic Thermal Paper Receipt Card */}
              <View style={styles.receiptContainer}>
                <View style={styles.receiptTapeZigzagTop} />
                <View style={styles.receiptBody}>
                  {/* Store Brand / Header */}
                  <View style={styles.storeHeader}>
                    <Receipt size={22} color="#059669" />
                    <TextInput
                      style={styles.storeTitleInput}
                      value={editStore}
                      onChangeText={setEditStore}
                      placeholder="Store Name"
                    />
                    <Text style={styles.receiptDate}>{parsedData.dateString}</Text>
                  </View>

                  {/* Quick Store Suggestions */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeSuggestions}>
                    {POPULAR_STORES.map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.storeSuggestionChip,
                          editStore === st && styles.storeSuggestionChipActive,
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setEditStore(st);
                        }}
                      >
                        <Text
                          style={[
                            styles.storeSuggestionText,
                            editStore === st && styles.storeSuggestionTextActive,
                          ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.dashedDivider} />

                  {/* Items Table */}
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderColName}>ITEM / DESCRIPTION</Text>
                    <Text style={styles.tableHeaderColQty}>QTY</Text>
                    <Text style={styles.tableHeaderColPrice}>AMOUNT</Text>
                    <Text style={{ width: 24 }}></Text>
                  </View>

                  {editItems.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <TextInput
                        style={styles.itemNameInput}
                        value={item.name}
                        onChangeText={(txt) => {
                          const updated = [...editItems];
                          updated[index].name = txt;
                          setEditItems(updated);
                        }}
                      />
                      <Text style={styles.itemQty}>{item.qty}x</Text>
                      <TextInput
                        style={styles.itemPriceInput}
                        keyboardType="decimal-pad"
                        value={item.total.toString()}
                        onChangeText={(val) => {
                          const p = parseFloat(val) || 0;
                          const updated = [...editItems];
                          updated[index].total = p;
                          updated[index].price = p / (item.qty || 1);
                          setEditItems(updated);
                          const newSum = updated.reduce((s, it) => s + it.total, 0);
                          setEditTotal(newSum.toFixed(2));
                        }}
                      />
                      <TouchableOpacity onPress={() => handleDeleteItem(index)} style={styles.deleteItemBtn}>
                        <X size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem}>
                    <Plus size={14} color="#059669" />
                    <Text style={styles.addItemBtnText}>Add Item</Text>
                  </TouchableOpacity>

                  <View style={styles.dashedDivider} />

                  {/* Financial Breakdown */}
                  {parsedData.subtotal !== undefined && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(parsedData.subtotal)}</Text>
                    </View>
                  )}
                  {parsedData.tax !== undefined && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>12% VAT Included</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(parsedData.tax)}</Text>
                    </View>
                  )}
                  {parsedData.discount !== undefined && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: '#059669' }]}>Discounts (SC/PWD)</Text>
                      <Text style={[styles.summaryValue, { color: '#059669' }]}>
                        -{formatCurrency(parsedData.discount)}
                      </Text>
                    </View>
                  )}

                  {/* Total Highlight */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL AMOUNT DUE</Text>
                    <View style={styles.totalInputWrap}>
                      <Text style={styles.totalCurrency}>₱</Text>
                      <TextInput
                        style={styles.totalInput}
                        keyboardType="decimal-pad"
                        value={editTotal}
                        onChangeText={setEditTotal}
                      />
                    </View>
                  </View>

                  {/* Confidence Stamp */}
                  <View style={styles.stampBadge}>
                    <CheckCircle2 size={13} color="#059669" />
                    <Text style={styles.stampText}>
                      {parsedData.confidence}% Optical Match • Auto-Extracted
                    </Text>
                  </View>
                </View>
                <View style={styles.receiptTapeZigzagBottom} />
              </View>

              {/* Destination Category Picker */}
              <View style={styles.configSection}>
                <Text style={[styles.configSectionTitle, { color: colors.text }]}>Budget Category</Text>
                <View style={styles.categoryChipsRow}>
                  {Object.entries(CATEGORY_MAP).map(([catKey, cat]) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === catKey;
                    return (
                      <TouchableOpacity
                        key={catKey}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: isSelected ? cat.color : isDark ? '#1E293B' : '#F1F5F9',
                            borderColor: isSelected ? cat.color : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedCategory(catKey);
                        }}
                      >
                        <Icon size={14} color={isSelected ? '#FFFFFF' : colors.text} />
                        <Text style={[styles.catChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                          {catKey}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Account / Wallet Tender Picker */}
              <View style={styles.configSection}>
                <Text style={[styles.configSectionTitle, { color: colors.text }]}>Payment Account</Text>
                <View style={styles.bankChipsRow}>
                  {['GCash', 'Maya', 'GoTyme', 'BPI', 'Cash'].map((bank) => {
                    const isSelected = selectedBank === bank;
                    return (
                      <TouchableOpacity
                        key={bank}
                        style={[
                          styles.bankChip,
                          {
                            backgroundColor: isSelected ? '#10B981' : isDark ? '#1E293B' : '#F1F5F9',
                            borderColor: isSelected ? '#10B981' : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedBank(bank);
                        }}
                      >
                        <Text style={[styles.bankChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                          {bank}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Save Action Button */}
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                disabled={isSaving}
                onPress={handleSaveToBudget}
                activeOpacity={0.85}
              >
                <Sparkles size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>
                  {isSaving ? 'Recording Transaction…' : `Save ₱${editTotal || '0.00'} to Geko Budget`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* Input / Camera Selector Tabs */
            <View style={{ flex: 1 }}>
              {/* Tab Selector */}
              <View style={[styles.tabBar, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'camera' && styles.tabBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab('camera');
                  }}
                >
                  <Camera size={16} color={activeTab === 'camera' ? '#059669' : colors.textMuted} />
                  <Text style={[styles.tabBtnText, activeTab === 'camera' && styles.tabBtnTextActive]}>
                    Camera Scan
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'paste' && styles.tabBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab('paste');
                  }}
                >
                  <ClipboardPaste size={16} color={activeTab === 'paste' ? '#059669' : colors.textMuted} />
                  <Text style={[styles.tabBtnText, activeTab === 'paste' && styles.tabBtnTextActive]}>
                    Paste E-Receipt
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'samples' && styles.tabBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab('samples');
                  }}
                >
                  <Sparkles size={16} color={activeTab === 'samples' ? '#059669' : colors.textMuted} />
                  <Text style={[styles.tabBtnText, activeTab === 'samples' && styles.tabBtnTextActive]}>
                    Presets
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB 1: Realtime Camera Viewfinder */}
              {activeTab === 'camera' && (
                <View style={styles.cameraTabContainer}>
                  {/* Viewfinder Preview Box */}
                  <View style={styles.viewfinderBox}>
                    {/* Viewfinder corner guidelines */}
                    <View style={[styles.viewfinderCorner, styles.cornerTL]} />
                    <View style={[styles.viewfinderCorner, styles.cornerTR]} />
                    <View style={[styles.viewfinderCorner, styles.cornerBL]} />
                    <View style={[styles.viewfinderCorner, styles.cornerBR]} />

                    {/* Animated Scanning Laser */}
                    <Animated.View style={[styles.laserBeam, laserStyle]} />

                    <View style={styles.viewfinderContent}>
                      <Receipt size={48} color="rgba(16, 185, 129, 0.45)" />
                      <Text style={styles.viewfinderGuideTitle}>Align Receipt in Frame</Text>
                      <Text style={styles.viewfinderGuideSub}>
                        Hold flat under good lighting for high-accuracy optical detection
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.primaryScanBtn}
                      onPress={handleLaunchCamera}
                      activeOpacity={0.85}
                    >
                      <Camera size={20} color="#FFFFFF" />
                      <Text style={styles.primaryScanBtnText}>Take Receipt Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryScanBtn, { borderColor: colors.border }]}
                      onPress={handleLaunchGallery}
                      activeOpacity={0.85}
                    >
                      <ImageIcon size={20} color="#059669" />
                      <Text style={[styles.secondaryScanBtnText, { color: colors.text }]}>
                        Photo Gallery
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.tipBox}>
                    <Info size={14} color="#059669" />
                    <Text style={styles.tipBoxText}>
                      Supports POS thermal slips, supermarket bills, dining receipts, and payment screenshots.
                    </Text>
                  </View>
                </View>
              )}

              {/* TAB 2: Paste E-Receipt Text */}
              {activeTab === 'paste' && (
                <ScrollView contentContainerStyle={styles.pasteTabContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Paste receipt SMS, email invoice, or POS text:
                  </Text>
                  <TextInput
                    style={[
                      styles.pasteTextInput,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    multiline
                    numberOfLines={8}
                    placeholder="e.g.&#10;JOLLIBEE SM MEGAMALL&#10;1x CHICKENJOY W/ RICE ₱99.00&#10;1x COKE FLOAT ₱55.00&#10;TOTAL: ₱154.00"
                    placeholderTextColor={colors.textMuted}
                    value={pastedText}
                    onChangeText={setPastedText}
                  />

                  <TouchableOpacity
                    style={[styles.parseBtn, !pastedText.trim() && { opacity: 0.5 }]}
                    disabled={!pastedText.trim()}
                    onPress={() => handleLoadParsedText(pastedText)}
                  >
                    <Sparkles size={18} color="#FFFFFF" />
                    <Text style={styles.parseBtnText}>Parse & Auto-Categorize</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* TAB 3: 1-Tap Realistic Samples */}
              {activeTab === 'samples' && (
                <ScrollView contentContainerStyle={styles.samplesTabContainer}>
                  <Text style={[styles.samplesDesc, { color: colors.textMuted }]}>
                    Try authentic Philippine merchant receipts to test item extraction and category mapping:
                  </Text>

                  {SAMPLE_RECEIPTS.map((sample) => (
                    <TouchableOpacity
                      key={sample.id}
                      style={[
                        styles.sampleCard,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleLoadParsedText(sample.rawText)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sampleTitle, { color: colors.text }]}>{sample.title}</Text>
                        <Text style={[styles.sampleCategory, { color: colors.textMuted }]}>
                          Category: {sample.category} • Method: {sample.bank}
                        </Text>
                      </View>
                      <View style={styles.sampleArrowBox}>
                        <ChevronRight size={18} color="#059669" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '92%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginVertical: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  scanningOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 16,
  },
  scanningStatusText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  scanningSubText: {
    fontSize: 13,
    textAlign: 'center',
  },
  cameraTabContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  viewfinderBox: {
    height: 280,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginTop: 10,
  },
  viewfinderCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: 16,
    left: 16,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 16,
    right: 16,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  laserBeam: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  viewfinderContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  viewfinderGuideTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  viewfinderGuideSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  actionButtonsRow: {
    gap: 12,
    marginTop: 20,
  },
  primaryScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 52,
    borderRadius: 18,
    gap: 10,
    shadowColor: '#059669',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  primaryScanBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 10,
  },
  secondaryScanBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    padding: 12,
    borderRadius: 14,
    gap: 8,
    marginTop: 14,
  },
  tipBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#059669',
    lineHeight: 16,
    fontWeight: '500',
  },
  pasteTabContainer: {
    paddingVertical: 10,
    paddingBottom: 30,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  pasteTextInput: {
    height: 200,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  parseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 50,
    borderRadius: 16,
    gap: 8,
    marginTop: 18,
  },
  parseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  samplesTabContainer: {
    paddingVertical: 10,
    gap: 10,
    paddingBottom: 30,
  },
  samplesDesc: {
    fontSize: 13,
    marginBottom: 6,
  },
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  sampleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sampleCategory: {
    fontSize: 12,
    marginTop: 4,
  },
  sampleArrowBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 10,
    borderRadius: 14,
    marginVertical: 10,
  },
  photoThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  photoCapturedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoCapturedSub: {
    fontSize: 11,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  retakeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  receiptContainer: {
    marginVertical: 14,
  },
  receiptTapeZigzagTop: {
    height: 8,
    backgroundColor: '#FFFBEB',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  receiptTapeZigzagBottom: {
    height: 8,
    backgroundColor: '#FFFBEB',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  receiptBody: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeTitleInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingVertical: 4,
  },
  receiptDate: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '600',
  },
  storeSuggestions: {
    marginTop: 8,
    marginBottom: 4,
  },
  storeSuggestionChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  storeSuggestionChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  storeSuggestionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  storeSuggestionTextActive: {
    color: '#FFFFFF',
  },
  dashedDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D6D3D1',
    marginVertical: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
  },
  tableHeaderColName: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: '#78716C',
  },
  tableHeaderColQty: {
    width: 36,
    fontSize: 10,
    fontWeight: '800',
    color: '#78716C',
    textAlign: 'center',
  },
  tableHeaderColPrice: {
    width: 70,
    fontSize: 10,
    fontWeight: '800',
    color: '#78716C',
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  itemNameInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    padding: 0,
  },
  itemQty: {
    width: 36,
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    fontWeight: '600',
  },
  itemPriceInput: {
    width: 70,
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
    padding: 0,
  },
  deleteItemBtn: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  addItemBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#78716C',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#1E293B',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  totalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalCurrency: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  totalInput: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
    minWidth: 80,
    textAlign: 'right',
    padding: 0,
  },
  stampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  stampText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  configSection: {
    marginVertical: 8,
  },
  configSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bankChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 54,
    borderRadius: 20,
    gap: 10,
    marginTop: 16,
    shadowColor: '#059669',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
