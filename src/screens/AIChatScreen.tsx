import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useRAGChat } from '../hooks/useRAGChat';
import { ChatBubble } from '../components/ai/ChatBubble';
import { StreamingText } from '../components/ai/StreamingText';
import { ModelStatusBadge } from '../components/ai/ModelStatusBadge';
import { Send, ShieldCheck } from 'lucide-react-native';
import { loadModel } from '../services/ai/engine/llamaService';
import { getModelPath } from '../utils/fileSystem';
import { Button } from '../components/common/Button';

const PROMPT_CHIPS = [
  "Analyze my grocery spending this week",
  "Can I afford dinner tonight?",
  "Export monthly summary"
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
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <View style={styles.badgeContainer}>
          <ShieldCheck size={16} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>100% Offline & Private</Text>
        </View>
        <ModelStatusBadge />
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
                  key={chip} 
                  style={[styles.chip, { backgroundColor: colors.surfaceHighlight }]}
                  onPress={() => handleSend(chip)}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{chip}</Text>
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

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 110, borderTopColor: colors.border, backgroundColor: colors.background }]}>
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between'
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
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
