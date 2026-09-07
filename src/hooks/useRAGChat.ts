import { useState, useCallback } from 'react';
import { generateStream } from '../services/ai/engine/llamaService';
import { retrieveContext } from '../services/ai/rag/retriever';
import { buildPrompt } from '../services/ai/rag/promptBuilder';
import { enforceContextWindow } from '../services/ai/memory/contextWindow';
import { ChatMessage } from '../types/ai';
import { uuidv4 } from '../utils/uuid';

export const useRAGChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStream, setCurrentStream] = useState('');

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);
    setCurrentStream('');

    try {
      // 1. Retrieve Hybrid SQL + Vector Context
      const context = await retrieveContext(text);
      
      // 2. Build constrained prompt window
      const historyToUse = enforceContextWindow(messages);
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
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'system',
        content: 'Error: Failed to process request. Ensure model is loaded.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
      setCurrentStream('');
    }
  }, [messages, isGenerating]);

  const clearHistory = () => setMessages([]);

  return { messages, isGenerating, currentStream, sendMessage, clearHistory };
};
