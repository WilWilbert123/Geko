import { ChatMessage } from '../../../types/ai';

// Extremely naive token counting for safety (avg 4 chars per token)
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export const enforceContextWindow = (messages: ChatMessage[], maxTokens: number = 1024): ChatMessage[] => {
  let currentTokens = 0;
  const retained: ChatMessage[] = [];
  
  // Traverse backwards (keep newest messages)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const tokens = estimateTokens(msg.content);
    
    if (currentTokens + tokens > maxTokens) {
      break;
    }
    
    currentTokens += tokens;
    retained.unshift(msg);
  }
  
  return retained;
};
