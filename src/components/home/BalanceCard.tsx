import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import { GekoCard3D } from '../wallet/GekoCard3D';

interface BalanceCardProps {
  balance: number;
  dailyLimit?: number;
  spentToday?: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  dailyLimit = 150,
  spentToday = 760
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* The Direct 3D GEKO Platinum Card (Balance rendered directly on the physical 3D card surface!) */}
      <GekoCard3D
        balance={balance}
        cardholderName="GEKO MEMBER"
        accountType="DEBIT • PLATINUM"
        expiryDate="10/29"
        height={340}
      />

      {/* Clean Stats Row directly below the card: Spent Today & Daily Limit */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.05)', borderColor: colors.border }]}>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spent Today</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(spentToday)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Daily Limit</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(dailyLimit)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  divider: {
    width: 1,
    height: 26,
    marginHorizontal: 16,
  },
});
