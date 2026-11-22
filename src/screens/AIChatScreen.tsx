import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { useRAGChat } from '../hooks/useRAGChat';
import { useCards } from '../hooks/useCards';
import { ChatBubble } from '../components/ai/ChatBubble';
import { StreamingText } from '../components/ai/StreamingText';
import { GekoWalker } from '../components/intro/GekoWalker';
import { Send, Target, BarChart3, CreditCard, Utensils, Calendar, Trash2, Mic, MicOff } from 'lucide-react-native';
import { loadModel } from '../services/ai/engine/llamaService';
import { getModelPath } from '../utils/fileSystem';
import { useSpeechToText } from '../hooks/useSpeechToText';

const PROMPT_CHIPS = [
  { icon: Target, title: 'What is my current financial goal?', query: 'What is my current financial goal?', color: '#EF4444' },
  { icon: BarChart3, title: 'Analyze my spending this week', query: 'Analyze my spending this week', color: '#3B82F6' },
  { icon: CreditCard, title: 'Check my card & wallet balances', query: 'Show all my bank card balances', color: '#EAB308' },
  { icon: Utensils, title: 'Can I afford dinner tonight?', query: 'Can I afford dinner tonight?', color: '#F97316' },
  { icon: Calendar, title: 'When is my salary cutoff?', query: 'When is my salary cutoff?', color: '#EC4899' },
];

type PeekEdge = 'right' | 'left' | 'top';
const PEEK_EDGES: PeekEdge[] = ['right', 'left', 'top'];

/* ─── Full-Body Transparent-Background Peeking & Walking Geko (Right, Left & Top!) ─── */
const ChatEdgePeeker: React.FC<{ isBusy: boolean }> = ({ isBusy }) => {
  const [edgeIdx, setEdgeIdx] = useState(0);
  const edge = PEEK_EDGES[edgeIdx % PEEK_EDGES.length];

  // 1 = tucked outside screen edge, 0.25 = head & hands peeking out, 0 = full body with feet & tail visible!
  const slideOut = useSharedValue(1);
  // 1 = legs & hands actively walking while climbing in/out, 0 = settled & looking around
  const walkGait = useSharedValue(1);
  const tilt = useSharedValue(0);

  const cycleToNextEdge = () => {
    setEdgeIdx((prev) => (prev + 1) % PEEK_EDGES.length);
  };

  useEffect(() => {
    slideOut.value = 1;
    walkGait.value = 1;
    tilt.value = 0;

    // 1. Climb out from edge (with hands, feet & tail walking!) -> pause to look around -> climb out more -> walk back in
    slideOut.value = withDelay(
      350,
      withSequence(
        withTiming(0.28, { duration: 550, easing: Easing.out(Easing.cubic) }),
        withTiming(0.25, { duration: 950, easing: Easing.inOut(Easing.quad) }),
        withSpring(0.02, { damping: 12, stiffness: 110 }),
        withTiming(0.02, { duration: 1400 }),
        withTiming(1, { duration: 550, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(cycleToNextEdge)();
        })
      )
    );

    // 2. Walk legs while climbing out, pause legs (gentle hand wave) while looking, walk legs again while climbing back
    walkGait.value = withDelay(
      350,
      withSequence(
        withTiming(1, { duration: 550 }),
        withTiming(0.15, { duration: 950 }),
        withTiming(0.85, { duration: 400 }),
        withTiming(0.15, { duration: 1200 }),
        withTiming(1, { duration: 550 })
      )
    );

    // 3. Curious head/body tilt left & right while peeking
    tilt.value = withDelay(
      850,
      withSequence(
        withTiming(-7, { duration: 350, easing: Easing.out(Easing.quad) }),
        withTiming(7, { duration: 450, easing: Easing.inOut(Easing.quad) }),
        withSpring(0, { damping: 10, stiffness: 120 })
      )
    );
  }, [edgeIdx, isBusy]);

  const peekerTransform = useAnimatedStyle(() => {
    // Full body scaled height is 250 * 0.44 = 110px
    const offset = slideOut.value * 96;
    if (edge === 'right') {
      return {
        transform: [
          { translateX: offset },
          { rotate: `${-90 + tilt.value}deg` },
        ],
      };
    }
    if (edge === 'left') {
      return {
        transform: [
          { translateX: -offset },
          { rotate: `${90 + tilt.value}deg` },
        ],
      };
    }
    // Top edge: upside-down clinging under the header bar with hands, feet & tail!
    return {
      transform: [
        { translateY: -offset },
        { rotate: `${180 + tilt.value}deg` },
      ],
    };
  });

  const posStyle =
    edge === 'right'
      ? { right: -16, top: 132 }
      : edge === 'left'
        ? { left: -16, top: 218 }
        : { right: 56, top: -18 };

  return (
    <View style={[styles.peekerAnchor, posStyle]} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
          cycleToNextEdge();
        }}
      >
        {/* 100% Transparent Background — Full Body Cartoon Geko with Hands, Feet & Tail! */}
        <Animated.View style={[styles.transparentPeekerWrap, peekerTransform]}>
          <GekoWalker walk={walkGait} scale={0.44} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

export const AIChatScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards: userCards, refresh: refreshCards } = useCards();
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(48);
  const { messages, isGenerating, currentStream, sendMessage, clearHistory, deleteMessage } = useRAGChat({
    onActionExecuted: async () => {
      await refreshCards();
    },
  });
  const scrollViewRef = useRef<ScrollView>(null);

  const [error, setError] = useState<string | null>(null);

  // Cartoon walking hero in empty state
  const heroWalk = useSharedValue(1);
  const heroPatrolX = useSharedValue(-36);

  useEffect(() => {
    heroWalk.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800 }),
        withTiming(0, { duration: 1100 }),
        withTiming(1, { duration: 1800 }),
        withTiming(0, { duration: 1100 })
      ),
      -1,
      false
    );
    heroPatrolX.value = withRepeat(
      withSequence(
        withTiming(36, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(36, { duration: 1100 }),
        withTiming(-36, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(-36, { duration: 1100 })
      ),
      -1,
      false
    );
  }, []);

  const heroPatrolStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: heroPatrolX.value }],
  }));

  useEffect(() => {
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

  const { isListening, toggleListening, stopListening } = useSpeechToText((transcript) => {
    setInput(transcript);
  });

  const handleSend = (text: string = input) => {
    if (text.trim()) {
      stopListening();
      sendMessage(text.trim());
      setInput('');
      setInputHeight(48);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Geko</Text>
          <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
        </View>

        {messages.length > 0 && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: colors.surfaceHighlight }]}
            onPress={clearHistory}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              {/* Full-Body Cartoon Walking Geko Hero Companion */}
              <Animated.View style={[styles.heroWalkerStage, heroPatrolStyle]}>
                <GekoWalker walk={heroWalk} scale={0.52} />
              </Animated.View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>How can I help?</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Record expenses in Taglish or ask anything about your budget
              </Text>
              <View style={styles.chipsContainer}>
                {PROMPT_CHIPS.map(chip => {
                  const IconComponent = chip.icon;
                  return (
                    <TouchableOpacity
                      key={chip.title}
                      style={[styles.chip, { backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.06)', borderColor: colors.border }]}
                      onPress={() => handleSend(chip.query)}
                      activeOpacity={0.8}
                    >
                      <IconComponent size={18} color={chip.color} strokeWidth={2} />
                      <Text style={[styles.chipText, { color: colors.text }]}>{chip.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} userCards={userCards} onDelete={deleteMessage} />
          ))}
          {isGenerating && currentStream !== '' && (
            <StreamingText text={currentStream} isGenerating={isGenerating} />
          )}
        </ScrollView>

        {/* Transparent-Background Full-Body Peeking & Climbing Geko (Right -> Left -> Top!) */}
        <ChatEdgePeeker isBusy={isGenerating || isListening} />
      </View>

      {isListening && (
        <View style={[styles.listeningBanner, { backgroundColor: colors.surfaceHighlight || 'rgba(255,255,255,0.06)' }]}>
          <View style={[styles.recordingDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.listeningText, { color: colors.text }]}>
            Listening... Speak your prompt now
          </Text>
        </View>
      )}

      <View style={[styles.inputContainer, { paddingBottom: 12, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={toggleListening}
          style={[
            styles.micButton,
            { backgroundColor: isListening ? colors.danger : colors.surfaceHighlight }
          ]}
          activeOpacity={0.7}
        >
          {isListening ? (
            <MicOff color="#FFF" size={20} />
          ) : (
            <Mic color={colors.textMuted} size={20} />
          )}
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surfaceHighlight,
              height: !input ? 48 : Math.min(105, Math.max(48, inputHeight)),
            }
          ]}
          multiline={true}
          maxLength={500}
          placeholder={isListening ? "Listening... Speak now" : "Ask Geko about your budget..."}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={(val) => {
            setInput(val);
            if (!val) setInputHeight(48);
          }}
          onContentSizeChange={(e) => {
            if (!input) {
              setInputHeight(48);
              return;
            }
            const contentH = e.nativeEvent.contentSize.height;
            if (contentH > 24) {
              setInputHeight(contentH + 16);
            }
          }}
          returnKeyType="default"
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
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
  headerPatrolTrack: {
    flex: 1,
    height: 38,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 12,
  },
  heroWalkerStage: {
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 22,
    textAlign: 'center',
  },
  chipsContainer: {
    gap: 12,
    alignItems: 'center',
    width: '100%',
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
  peekerAnchor: {
    position: 'absolute',
    zIndex: 20,
  },
  transparentPeekerWrap: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 12 : 11,
    paddingBottom: Platform.OS === 'ios' ? 12 : 11,
    fontSize: 15.5,
    lineHeight: 20,
    marginRight: 10,
    minHeight: 48,
    maxHeight: 105,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 1,
  },
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listeningText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
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
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
