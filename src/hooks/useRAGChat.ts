import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateStream } from '../services/ai/engine/llamaService';
import { retrieveContext } from '../services/ai/rag/retriever';
import { buildPrompt } from '../services/ai/rag/promptBuilder';
import { enforceContextWindow } from '../services/ai/memory/contextWindow';
import { ChatMessage } from '../types/ai';
import { uuidv4 } from '../utils/uuid';

import { processAIIntent } from '../services/ai/aiActionExecutor';

const STORAGE_KEY = 'geko_chat_history_v1';

export const useRAGChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStream, setCurrentStream] = useState('');

  // Load chat history from AsyncStorage on mount
  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadHistory();
    return () => { isMounted = false; };
  }, []);

  // Helper to persist messages array to AsyncStorage
  const persistMessages = async (updated: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save chat history:', err);
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    let nextMessages: ChatMessage[] = [];
    setMessages(prev => {
      nextMessages = [...prev, userMsg];
      persistMessages(nextMessages);
      return nextMessages;
    });

    setIsGenerating(true);
    setCurrentStream('');

    try {
      // 0. Check & Execute Action Intent First (accounts, goals, installments, transactions)
      const actionRes = await processAIIntent(text);
      if (actionRes.executed && actionRes.message) {
        const assistantMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: actionRes.message,
          timestamp: Date.now()
        };
        
        setMessages(prev => {
          const updated = [...prev, assistantMsg];
          persistMessages(updated);
          return updated;
        });
        return;
      }

      // 1. Retrieve Hybrid SQL + Vector Context
      const context = await retrieveContext(text);
      
      // 2. Build constrained prompt window
      const historyToUse = enforceContextWindow(nextMessages);
      const prompt = buildPrompt(text, context, historyToUse);
      
      // 3. Stream Inference
      const fullResponse = await generateStream(prompt, text, (token) => {
        setCurrentStream(prev => prev + token);
      });
      
      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now()
      };
      
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        persistMessages(updated);
        return updated;
      });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'system',
        content: 'Error: Failed to process request. Ensure model is loaded.',
        timestamp: Date.now()
      };
      setMessages(prev => {
        const updated = [...prev, errorMsg];
        persistMessages(updated);
        return updated;
      });
    } finally {
      setIsGenerating(false);
      setCurrentStream('');
    }
  }, [isGenerating]);

  const clearHistory = useCallback(async () => {
    setMessages([]);
    setCurrentStream('');
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  }, []);

  const deleteMessage = useCallback(async (id: string) => {
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== id);
      persistMessages(updated);
      return updated;
    });
  }, []);

  return { messages, isGenerating, currentStream, sendMessage, clearHistory, deleteMessage };
};
