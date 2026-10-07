import { useState, useCallback } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const speak = useCallback((id: string, text: string) => {
    // Disabled Text-to-Speech
  }, []);

  const stop = useCallback(() => {
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  return { speak, stop, isSpeaking, speakingId };
};
