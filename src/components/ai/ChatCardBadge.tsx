import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ExtractedCardInfo, getCanonicalBankKey } from '../../utils/cardExtractor';
import { getBankTheme } from '../../utils/bankThemes';
import { GekoCard3D } from '../wallet/GekoCard3D';

interface ChatCardBadgeProps {
  cards: ExtractedCardInfo[];
}

export const MiniCardItem: React.FC<{ card: ExtractedCardInfo }> = ({ card }) => {
  const theme = getBankTheme(card.bankName, card.color1, card.color2);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handlePress}
      style={[
        styles.cardItem3D,
        { backgroundColor: card.color1 || theme.bg1 }
      ]}
    >
      <GekoCard3D
        balance={card.balance}
        cardholderName="GEKO MEMBER"
        expiryDate="10/29"
        accountType={card.type}
        bankName={card.bankName}
        color1={card.color1 || theme.bg1}
        color2={card.color2 || theme.bg2}
        height={112}
        interactive={false}
      />
    </TouchableOpacity>
  );
};

export const ChatCardBadgeList: React.FC<ChatCardBadgeProps> = ({ cards }) => {
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
      <Text style={styles.headerLabel}>
        {uniqueCards.length === 1 ? 'ACCOUNT CARD USED' : 'YOUR ACCOUNTS'}
      </Text>

      {uniqueCards.length === 1 ? (
        <View style={styles.singleCardContainer}>
          <MiniCardItem card={uniqueCards[0]} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {uniqueCards.map((card, idx) => (
            <MiniCardItem key={`${card.bankName}-${idx}`} card={card} />
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
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
});
