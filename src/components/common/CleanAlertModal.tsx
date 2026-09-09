import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CleanAlertModalProps {
  visible: boolean;
  type?: 'success' | 'error' | 'info';
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export const CleanAlertModal: React.FC<CleanAlertModalProps> = ({
  visible,
  type = 'success',
  title,
  message,
  buttonText = 'OK',
  onClose,
}) => {
  const { colors } = useTheme();

  const getIcon = () => {
    switch (type) {
      case 'error':
        return {
          Icon: AlertCircle,
          color: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.15)',
        };
      case 'info':
        return {
          Icon: Info,
          color: '#6366F1',
          bg: 'rgba(99, 102, 241, 0.15)',
        };
      default:
        return {
          Icon: CheckCircle2,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
        };
    }
  };

  const { Icon, color, bg } = getIcon();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: bg }]}>
            <Icon size={28} color={color} strokeWidth={2.2} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
