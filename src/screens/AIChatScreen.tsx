import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useRAGChat } from '../hooks/useRAGChat';
import { ChatBubble } from '../components/ai/ChatBubble';
import { StreamingText } from '../components/ai/StreamingText';
import { Send } from 'lucide-react-native';
import { loadModel } from '../services/ai/engine/llamaService';
import { getModelPath } from '../utils/fileSystem';

const PROMPT_CHIPS = [
  { icon: '🎯', title: 'What is my current financial goal?', query: 'What is my current financial goal?' },
  { icon: '📊', title: 'Analyze my spending this week', query: 'Analyze my spending this week' },
  { icon: '💳', title: 'Check my card & wallet balances', query: 'Show all my bank card balances' },
  { icon: '🍔', title: 'Can I afford dinner tonight?', query: 'Can I afford dinner tonight?' },
  { icon: '📅', title: 'When is my salary cutoff?', query: 'When is my salary cutoff?' },
];

export const AIChatScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const { messages, isGenerating, currentStream, sendMessage } = useRAGChat();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to load the model on mount
    const initLLM = async () => {
      try {
        const path = getModelPath('qwen2.5-1.5b-instruct-q4_k_m.gguf');
        await loadModel(path);
        setError(null);
      } catch (err) {
        setError('Model file not found. Please ensure qwen2.5-1.5b-instruct-q4_k_m.gguf is in your Downloads folder (Android) or App Bundle (iOS).');
      }
    };
    initLLM();
  }, []);

  const handleSend = (text: string = input) => {
    if (text.trim()) {
      sendMessage(text.trim());
      setInput('');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Geko</Text>
          <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Offline AI Assistant</Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>How can I help?</Text>
            <View style={styles.chipsContainer}>
              {PROMPT_CHIPS.map(chip => (
                <TouchableOpacity 
                  key={chip.title} 
                  style={[styles.chip, { backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.06)', borderColor: colors.border }]}
                  onPress={() => handleSend(chip.query)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 16 }}>{chip.icon}</Text>
                  <Text style={[styles.chipText, { color: colors.text }]}>{chip.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isGenerating && currentStream !== '' && (
          <StreamingText text={currentStream} isGenerating={isGenerating} />
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: 12, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceHighlight }]}
          placeholder="Ask Geko about your budget..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />
        <TouchableOpacity 
          onPress={() => handleSend()} 
          disabled={isGenerating || !input.trim()}
          style={[
            styles.sendButton, 
            { backgroundColor: isGenerating || !input.trim() ? colors.border : colors.primary }
          ]}
        >
          <Send color={colors.background} size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
  },
  chipsContainer: {
    gap: 12,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1,
    width: '100%',
    maxWidth: 340,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  chipText: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    fontSize: 16,
    marginRight: 12,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  }
});
