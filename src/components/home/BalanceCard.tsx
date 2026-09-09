import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import { GekoCard3D } from '../wallet/GekoCard3D';
import { TrendingDown } from 'lucide-react-native';

interface BalanceCardProps {
  balance: number;
  spentToday?: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  spentToday = 0
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* The Direct 3D GEKO Platinum Card */}
      <GekoCard3D
        balance={balance}
        cardholderName="GEKO MEMBER"
        accountType="DEBIT • PLATINUM"
        expiryDate="10/29"
        height={340}
      />

      {/* Premium Redesigned "Spent Today" Hero Widget */}
      <View
        style={[
          styles.spentCard,
          {
            backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.05)',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}>
            <TrendingDown size={18} color={colors.expense || '#F43F5E'} strokeWidth={2.2} />
          </View>
          <View style={styles.textGroup}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>SPENT TODAY</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(spentToday)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.liveDot, { backgroundColor: colors.primary || '#10B981' }]} />
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>Today's Outflow</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  spentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
