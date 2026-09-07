import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ChatMessage } from '../../types/ai';
import { Bot, User } from 'lucide-react-native';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <Text style={[styles.systemText, { color: colors.danger }]}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.surfaceHighlight }]}>
          <Bot size={16} color={colors.primary} />
        </View>
      )}
      
      <View style={[
        styles.bubble, 
        isUser ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceHighlight }
      ]}>
        <Text style={[styles.text, { color: isUser ? '#000' : colors.text }]}>
          {message.content}
        </Text>
      </View>
      
      {isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary, marginLeft: 8 }]}>
          <User size={16} color="#000" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    maxWidth: '90%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  botContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  systemContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemText: {
    fontSize: 12,
  }
});
