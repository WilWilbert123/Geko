import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Goal } from '../../hooks/useGoals';
import { formatCurrency } from '../../utils/formatters';
import { getGoalImageUri } from '../../utils/goalExtractor';
import { Calendar } from 'lucide-react-native';

interface ChatGoalBadgeListProps {
  goals: Goal[];
}

export const ChatGoalBadgeList: React.FC<ChatGoalBadgeListProps> = ({ goals }) => {
  const { colors } = useTheme();

  if (!goals || goals.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        🎯 YOUR SAVINGS {goals.length === 1 ? 'GOAL' : 'GOALS'}
      </Text>
      <ScrollView
        horizontal={goals.length > 1}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {goals.map((g) => {
          const cur = Number(g.current || 0);
          const tgt = Number(g.target || 0);
          const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
          const imageUri = getGoalImageUri(g);

          return (
            <View key={g.id} style={[styles.card, { backgroundColor: '#0B0F19', borderColor: 'rgba(56, 189, 248, 0.4)' }]}>
              {/* Goal Picture Header */}
              <View style={styles.imageHeaderWrapper}>
                <Image source={{ uri: imageUri }} style={styles.goalImage} resizeMode="cover" />
                <View style={styles.badgeTag}>
                  <Calendar size={10} color="#38BDF8" style={{ marginRight: 3 }} />
                  <Text style={styles.badgeTagText}>{g.targetDate || 'Target Goal'}</Text>
                </View>
                <View style={styles.pctBadge}>
                  <Text style={styles.pctBadgeText}>{pct}%</Text>
                </View>
              </View>

              {/* Goal Content */}
              <View style={styles.cardContent}>
                <Text style={styles.goalTitle} numberOfLines={1}>
                  {g.title}
                </Text>

                <View style={styles.amountRow}>
                  <Text style={styles.currentAmount}>{formatCurrency(cur)}</Text>
                  <Text style={styles.targetAmount}> / {formatCurrency(tgt)}</Text>
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
  goalImage: {
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
  goalTitle: {
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
  currentAmount: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '900',
  },
  targetAmount: {
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
