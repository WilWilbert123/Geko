import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export const SpendingChart = () => {
  const { colors } = useTheme();
  
  // Minimal visual representation placeholder
  // In a real app this would use D3 or a lightweight path renderer
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Spending Flow</Text>
      <View style={[styles.barContainer, { backgroundColor: colors.surfaceHighlight }]}>
        <View style={[styles.fill, { backgroundColor: colors.primary, width: '40%' }]} />
        <View style={[styles.fill, { backgroundColor: '#3B82F6', width: '25%' }]} />
        <View style={[styles.fill, { backgroundColor: '#8B5CF6', width: '15%' }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  barContainer: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  }
});
