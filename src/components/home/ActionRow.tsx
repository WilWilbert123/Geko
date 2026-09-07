import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Send, Plus, ScanLine, MessageSquare } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export const ActionRow = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const actions = [
    { id: 'send', icon: Send, label: 'Send', onPress: () => {} },
    { id: 'add', icon: Plus, label: 'Add', onPress: () => navigation.navigate('AddTransaction') },
    { id: 'scan', icon: ScanLine, label: 'Scan', onPress: () => {} },
    { id: 'ai', icon: MessageSquare, label: 'Ask AI', onPress: () => navigation.navigate('AI') },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <TouchableOpacity 
            key={action.id} 
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={action.onPress}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.surfaceHighlight }]}>
              <Icon size={24} color={colors.text} />
            </View>
            <Text style={[styles.label, { color: colors.text }]}>{action.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  }
});
