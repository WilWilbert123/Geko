import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert, NativeModules } from 'react-native';

// Safely check if native @react-native-voice/voice module is compiled into the active app binary
const hasNativeVoiceModule = !!(NativeModules.Voice || NativeModules.RCTVoice);

let Voice: any = null;
if (hasNativeVoiceModule) {
  try {
    Voice = require('@react-native-voice/voice').default;
  } catch (e) {
    Voice = null;
  }
}

const extractSpeechText = (e: any): string | null => {
  if (!e) return null;
  if (Array.isArray(e.value) && e.value.length > 0 && typeof e.value[0] === 'string') {
    return e.value[0];
  }
  if (typeof e.value === 'string' && e.value.trim()) {
    return e.value;
  }
  if (Array.isArray(e.results) && e.results.length > 0 && typeof e.results[0] === 'string') {
    return e.results[0];
  }
  return null;
};

export const useSpeechToText = (onTranscript: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const webRecognitionRef = useRef<any>(null);
  const isStartingRef = useRef(false);

  // Store latest onTranscript callback in a ref to avoid tearing down Voice listeners on re-render
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Set up listeners for Voice (@react-native-voice/voice) once on mount
  useEffect(() => {
    if (!Voice || !hasNativeVoiceModule) return;

    const onSpeechPartialResults = (e: any) => {
      const text = extractSpeechText(e);
      if (text && text.trim()) {
        onTranscriptRef.current(text.trim());
      }
    };

    const onSpeechResults = (e: any) => {
      const text = extractSpeechText(e);
      if (text && text.trim()) {
        onTranscriptRef.current(text.trim());
      }
      setIsListening(false);
    };

    const onSpeechError = (e: any) => {
      setIsListening(false);
      isStartingRef.current = false;
      const errStr = JSON.stringify(e.error || e || '');

      // Android SpeechRecognizer transient error codes (5: client, 6: timeout, 7: no match, 8: busy)
      if (
        errStr.includes('No match') ||
        errStr.includes('"7"') ||
        errStr.includes('Client side error') ||
        errStr.includes('"5"') ||
        errStr.includes('"6"') ||
        errStr.includes('"8"')
      ) {
        return;
      }
      console.warn('Native Voice Error:', e.error);
      setSpeechError(e.error?.message || 'Voice recognition error.');
    };

    const onSpeechEnd = () => {
      setIsListening(false);
      isStartingRef.current = false;
    };

    try {
      Voice.onSpeechPartialResults = onSpeechPartialResults;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
      Voice.onSpeechEnd = onSpeechEnd;
    } catch (e) {
      console.warn('Failed to attach Voice listeners:', e);
    }

    return () => {
      try {
        if (Voice && typeof Voice.destroy === 'function') {
          Voice.destroy().then(() => {
            if (typeof Voice.removeAllListeners === 'function') {
              Voice.removeAllListeners();
            }
          });
        }
      } catch (e) {}
    };
  }, []);

  const startListening = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setSpeechError(null);

    // Mode A: @react-native-voice/voice (Native Android / iOS)
    if (Voice && hasNativeVoiceModule) {
      try {
        try { await Voice.cancel(); } catch (e) {}
        try { await Voice.stop(); } catch (e) {}

        await Voice.start('en-US', {
          EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
          EXTRA_PARTIAL_RESULTS: true,
          REQUEST_PARTIAL_RESULTS: true,
        });
        setIsListening(true);
        isStartingRef.current = false;
        return;
      } catch (e: any) {
        console.warn('Voice.start failed, resetting session...', e);
        try {
          await Voice.destroy();
          await Voice.start('en-US', {
            EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
            EXTRA_PARTIAL_RESULTS: true,
            REQUEST_PARTIAL_RESULTS: true,
          });
          setIsListening(true);
          isStartingRef.current = false;
          return;
        } catch (retryErr) {
          console.warn('Voice.start retry failed:', retryErr);
        }
      }
    }

    // Mode B: Web Speech API (Browser environment)
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognition) {
      try {
        if (webRecognitionRef.current) {
          try { webRecognitionRef.current.abort(); } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          isStartingRef.current = false;
        };

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            onTranscriptRef.current(transcript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Web Speech recognition error:', event.error);
          setIsListening(false);
          isStartingRef.current = false;
          if (event.error === 'not-allowed') {
            Alert.alert('Permission Denied', 'Microphone access was denied in browser settings.');
          } else {
            setSpeechError('Voice recognition error.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          isStartingRef.current = false;
        };

        webRecognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (e) {
        console.error('Failed to start Web Speech recognition:', e);
        setIsListening(false);
        isStartingRef.current = false;
      }
    }

    // Mode C: Fallback
    setIsListening(false);
    isStartingRef.current = false;
    Alert.alert(
      'Microphone Unavailable',
      'Voice recognition is not available or enabled on this device.',
      [{ text: 'OK' }]
    );
  }, []);

  const stopListening = useCallback(async () => {
    setIsListening(false);
    isStartingRef.current = false;

    if (Voice && hasNativeVoiceModule && typeof Voice.stop === 'function') {
      try { await Voice.stop(); } catch (e) {}
    }

    if (webRecognitionRef.current) {
      try { webRecognitionRef.current.stop(); } catch (e) {}
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { isListening, toggleListening, startListening, stopListening, speechError };
};
