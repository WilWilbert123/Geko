export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface InferenceMetrics {
  evalTokensPerSecond: number;
  promptTokensPerSecond: number;
  totalTokens: number;
  ramUsageMB: number;
}
