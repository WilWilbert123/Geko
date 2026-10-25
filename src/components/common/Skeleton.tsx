import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Core pulsing Skeleton primitive with smooth breathing animation in dark/light mode
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const { isDark } = useTheme();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const baseColor = isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

/**
 * 3D / Hero Card Loading Skeleton
 */
export const SkeletonCard3D = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card3dContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
      <View style={styles.card3dTopRow}>
        <Skeleton width={44} height={32} borderRadius={6} />
        <Skeleton width={50} height={20} borderRadius={6} />
      </View>

      <View style={styles.card3dMiddle}>
        <Skeleton width={80} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
        <Skeleton width={180} height={34} borderRadius={8} />
      </View>

      <View style={styles.card3dBottomRow}>
        <Skeleton width={140} height={16} borderRadius={4} />
        <Skeleton width={70} height={16} borderRadius={4} />
      </View>
    </View>
  );
};

/**
 * Miniature Real Card List Item Skeleton for WalletScreen list view
 */
export const SkeletonCardListItem = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardListContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
      {/* Mini Card replica */}
      <Skeleton width={64} height={40} borderRadius={8} />

      {/* Center Details */}
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width={110} height={15} borderRadius={4} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Skeleton width={56} height={16} borderRadius={6} />
          <Skeleton width={44} height={16} borderRadius={6} />
        </View>
      </View>

      {/* Right Balance */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Skeleton width={85} height={16} borderRadius={4} />
        <Skeleton width={55} height={12} borderRadius={4} />
      </View>
    </View>
  );
};

/**
 * Transaction Item Skeleton for RecentActivity & HistoryScreen
 */
export const SkeletonTransactionItem = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.transactionContainer, { borderBottomColor: colors.border }]}>
      {/* Icon Badge */}
      <Skeleton width={40} height={40} borderRadius={12} />

      {/* Details */}
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width={130} height={15} borderRadius={4} />
        <Skeleton width={70} height={14} borderRadius={6} />
      </View>

      {/* Amount */}
      <Skeleton width={75} height={16} borderRadius={4} />
    </View>
  );
};

/**
 * Savings Goal Card Skeleton for PlanScreen / Dashboard
 */
export const SkeletonGoalCard = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.goalContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
      <View style={styles.goalHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Skeleton width={42} height={42} borderRadius={14} />
          <View style={{ gap: 6 }}>
            <Skeleton width={120} height={16} borderRadius={4} />
            <Skeleton width={80} height={12} borderRadius={4} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Skeleton width={90} height={16} borderRadius={4} />
          <Skeleton width={60} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Cover Image Placeholder */}
      <Skeleton width="100%" height={130} borderRadius={16} />

      {/* Progress Bar */}
      <Skeleton width="100%" height={6} borderRadius={3} />

      {/* Footer */}
      <View style={styles.goalFooterRow}>
        <Skeleton width={110} height={14} borderRadius={4} />
        <Skeleton width={60} height={14} borderRadius={4} />
      </View>
    </View>
  );
};

/**
 * Calendar Grid Skeleton for PlanScreen / Dashboard
 */
export const SkeletonCalendar = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.calendarContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
      {/* Header Month Switcher */}
      <View style={styles.calendarHeaderRow}>
        <Skeleton width={36} height={36} borderRadius={18} />
        <Skeleton width={140} height={20} borderRadius={6} />
        <Skeleton width={36} height={36} borderRadius={18} />
      </View>

      {/* Mini Stats Bar */}
      <View style={styles.calendarStatsRow}>
        <Skeleton width="31%" height={46} borderRadius={12} />
        <Skeleton width="31%" height={46} borderRadius={12} />
        <Skeleton width="31%" height={46} borderRadius={12} />
      </View>

      {/* Day cells grid */}
      <View style={styles.calendarGrid}>
        {Array.from({ length: 28 }).map((_, i) => (
          <View key={i} style={styles.calendarCell}>
            <Skeleton width={28} height={28} borderRadius={14} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card3dContainer: {
    width: SCREEN_WIDTH - 40,
    height: 205,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    justifyContent: 'space-between',
    alignSelf: 'center',
    marginBottom: 20,
  },
  card3dTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card3dMiddle: {
    marginVertical: 10,
  },
  card3dBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardListContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },

  transactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },

  goalContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 14,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  calendarContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
