import { ChatMessage } from '../../../types/ai';

const SYSTEM_PROMPT = `You are Geko, an elite, privacy-first AI financial assistant operating 100% offline.
Your persona is concise, highly analytical, and strictly focused on the user's budget.
Use the provided transaction context to answer queries accurately. Do NOT invent data.
If the answer is not in the context, state that clearly.`;

export const buildPrompt = (
  query: string,
  context: string,
  history: ChatMessage[]
): string => {
  // Simple ChatML or Llama 3 prompt format depending on the model.
  // We'll use a generic ChatML format here.
  
  let prompt = `<|im_start|>system\n${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}<|im_end|>\n`;
  
  // Add last 3 messages for context window management
  const recentHistory = history.slice(-3);
  
  recentHistory.forEach(msg => {
    prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
  });
  
  prompt += `<|im_start|>user\n${query}<|im_end|>\n<|im_start|>assistant\n`;
  
  return prompt;
};
