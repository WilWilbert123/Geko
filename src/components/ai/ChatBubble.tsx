import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useCards } from '../../hooks/useCards';
import { useGoals } from '../../hooks/useGoals';
import { useInstallments } from '../../hooks/useInstallments';
import { ChatMessage } from '../../types/ai';
import { extractCardsFromText } from '../../utils/cardExtractor';
import { extractGoalsFromText } from '../../utils/goalExtractor';
import { extractInstallmentsFromText } from '../../utils/installmentExtractor';
import { ChatCardBadgeList } from './ChatCardBadge';
import { ChatGoalBadgeList } from './ChatGoalBadge';
import { ChatInstallmentBadgeList } from './ChatInstallmentBadge';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { colors } = useTheme();
  const { cards: userCards } = useCards();
  const { goals: userGoals } = useGoals();
  const { installments: userInstallments } = useInstallments();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const extractedCards = useMemo(() => {
    if (isUser || isSystem) return [];
    return extractCardsFromText(message.content, userCards);
  }, [message.content, userCards, isUser, isSystem]);

  const extractedGoals = useMemo(() => {
    if (isUser || isSystem) return [];
    return extractGoalsFromText(message.content, userGoals);
  }, [message.content, userGoals, isUser, isSystem]);

  const extractedInstallments = useMemo(() => {
    if (isUser || isSystem) return [];
    return extractInstallmentsFromText(message.content, userInstallments);
  }, [message.content, userInstallments, isUser, isSystem]);

  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <Text style={[styles.systemText, { color: colors.danger }]}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer]}>
      <View style={[
        styles.bubble, 
        isUser ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceHighlight }
      ]}>
        <Text style={[styles.text, { color: isUser ? '#000' : colors.text }]}>
          {message.content}
        </Text>

        {!isUser && extractedCards.length > 0 && (
          <ChatCardBadgeList cards={extractedCards} />
        )}

        {!isUser && extractedGoals.length > 0 && (
          <ChatGoalBadgeList goals={extractedGoals} />
        )}

        {!isUser && extractedInstallments.length > 0 && (
          <ChatInstallmentBadgeList installments={extractedInstallments} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: '100%',
    width: '100%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  botContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    maxWidth: '96%',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  systemContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemText: {
    fontSize: 12,
  }
});
