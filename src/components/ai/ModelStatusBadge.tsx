import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAIStore } from '../../store/aiStore';
import { useTheme } from '../../hooks/useTheme';
import { Cpu, Activity } from 'lucide-react-native';

export const ModelStatusBadge = () => {
  const { isModelLoaded, modelName, ramUsageMB, inferenceSpeedTps } = useAIStore();
  const { colors } = useTheme();

  if (!isModelLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceHighlight }]}>
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        <Text style={[styles.text, { color: colors.textMuted }]}>AI Offline</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceHighlight }]}>
      <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>
        {modelName || 'Local AI'}
      </Text>
      
      {ramUsageMB > 0 && (
        <View style={styles.metricsRow}>
          <Cpu size={12} color={colors.textMuted} style={styles.icon} />
          <Text style={[styles.metricText, { color: colors.textMuted }]}>{ramUsageMB} MB</Text>
          <Activity size={12} color={colors.textMuted} style={[styles.icon, { marginLeft: 6 }]} />
          <Text style={[styles.metricText, { color: colors.textMuted }]}>{inferenceSpeedTps.toFixed(1)} t/s</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 100,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    paddingLeft: 10,
  },
  icon: {
    marginRight: 4,
  },
  metricText: {
    fontSize: 10,
  }
});
