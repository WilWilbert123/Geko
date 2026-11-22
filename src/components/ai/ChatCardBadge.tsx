import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ExtractedCardInfo, getCanonicalBankKey } from '../../utils/cardExtractor';
import { getBankTheme } from '../../utils/bankThemes';
import { GekoCard3D } from '../wallet/GekoCard3D';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../hooks/useCards';

interface ChatCardBadgeProps {
  cards: ExtractedCardInfo[];
  liveCards?: Card[];
}

export const MiniCardItem: React.FC<{ card: ExtractedCardInfo; liveCards?: Card[] }> = ({ card, liveCards }) => {
  const cardKey = getCanonicalBankKey(card.bankName);
  const matchedLive = liveCards?.find(c => getCanonicalBankKey(c.bankName) === cardKey);

  const effectiveBal = card.balance !== undefined && card.balance > 0
    ? card.balance
    : (matchedLive ? (matchedLive.type === 'CREDIT_CARD' ? (matchedLive.outstandingBalance || 0) : matchedLive.balance) : (card.balance || 0));

  const theme = getBankTheme(matchedLive?.bankName || card.bankName, matchedLive?.color1 || card.color1, matchedLive?.color2 || card.color2);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handlePress}
      style={styles.cardItem3D}
    >
      <GekoCard3D
        balance={effectiveBal}
        cardholderName="GEKO MEMBER"
        expiryDate="10/29"
        accountType={matchedLive?.type || card.type}
        bankName={matchedLive?.bankName || card.bankName}
        color1={matchedLive?.color1 || card.color1 || theme.bg1}
        color2={matchedLive?.color2 || card.color2 || theme.bg2}
        height={112}
        interactive={false}
        paymentNetwork={theme.network}
      />
    </TouchableOpacity>
  );
};

export const ChatCardBadgeList: React.FC<ChatCardBadgeProps> = ({ cards, liveCards }) => {
  const { colors } = useTheme();
  const uniqueCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    const map = new Map<string, ExtractedCardInfo>();
    for (const c of cards) {
      const key = getCanonicalBankKey(c.bankName);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, c);
      } else {
        const existing = map.get(key)!;
        // Prioritize card with non-zero balance or matching user card
        if ((!existing.balance || existing.balance === 0) && (c.balance || 0) > 0) {
          map.set(key, c);
        }
      }
    }
    return Array.from(map.values());
  }, [cards]);

  if (uniqueCards.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.headerLabel, { color: colors.textMuted }]}>
        {uniqueCards.length === 1 ? 'ACCOUNT CARD USED' : 'YOUR ACCOUNTS'}
      </Text>

      {uniqueCards.length === 1 ? (
        <View style={styles.singleCardContainer}>
          <MiniCardItem card={uniqueCards[0]} liveCards={liveCards} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {uniqueCards.map((card, idx) => (
            <MiniCardItem key={`${card.bankName}-${idx}`} card={card} liveCards={liveCards} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    marginBottom: 4,
    width: '100%',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  singleCardContainer: {
    flexDirection: 'row',
  },
  scrollContainer: {
    gap: 12,
    paddingRight: 12,
  },
  cardItem3D: {
    width: 176,
    height: 112,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
});
