import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Installment } from '../../hooks/useInstallments';
import { formatCurrency } from '../../utils/formatters';
import { getInstallmentImageUri } from '../../utils/installmentExtractor';
import { Calendar } from 'lucide-react-native';

interface ChatInstallmentBadgeListProps {
  installments: Installment[];
}

export const ChatInstallmentBadgeList: React.FC<ChatInstallmentBadgeListProps> = ({ installments }) => {
  const { colors } = useTheme();

  if (!installments || installments.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        📦 YOUR INSTALLMENT {installments.length === 1 ? 'PLAN' : 'PLANS'}
      </Text>
      <ScrollView
        horizontal={installments.length > 1}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {installments.map((inst) => {
          const totalM = inst.totalMonths || 1;
          const paidM = inst.paidMonths || 0;
          const pct = Math.min(100, Math.round((paidM / totalM) * 100));
          const imageUri = getInstallmentImageUri(inst);
          const cutoffDateStr = inst.nextCutoff
            ? new Date(inst.nextCutoff).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'Next Cutoff';

          return (
            <View key={inst.id} style={[styles.card, { backgroundColor: '#0B0F19', borderColor: 'rgba(56, 189, 248, 0.4)' }]}>
              {/* Installment Image Header */}
              <View style={styles.imageHeaderWrapper}>
                <Image source={{ uri: imageUri }} style={styles.instImage} resizeMode="cover" />
                <View style={styles.badgeTag}>
                  <Calendar size={10} color="#38BDF8" style={{ marginRight: 3 }} />
                  <Text style={styles.badgeTagText}>{inst.status === 'completed' ? 'Completed 🎉' : `Cut-off: ${cutoffDateStr}`}</Text>
                </View>
                <View style={styles.pctBadge}>
                  <Text style={styles.pctBadgeText}>{paidM}/{totalM} Paid</Text>
                </View>
              </View>

              {/* Card Details */}
              <View style={styles.cardContent}>
                <Text style={styles.instTitle} numberOfLines={1}>
                  {inst.title}
                </Text>

                <View style={styles.amountRow}>
                  <Text style={styles.monthlyAmount}>{formatCurrency(inst.monthlyAmount)}</Text>
                  <Text style={styles.perCutoffLabel}> / cutoff</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  scrollContent: {
    gap: 10,
  },
  card: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  imageHeaderWrapper: {
    height: 105,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  instImage: {
    width: '100%',
    height: '100%',
  },
  badgeTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  badgeTagText: {
    color: '#E2E8F0',
    fontSize: 9.5,
    fontWeight: '700',
  },
  pctBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pctBadgeText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
  },
  cardContent: {
    padding: 10,
  },
  instTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  monthlyAmount: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '900',
  },
  perCutoffLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 5,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
});
