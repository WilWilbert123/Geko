import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Bot } from 'lucide-react-native';

interface StreamingTextProps {
  text: string;
  isGenerating: boolean;
}

export const StreamingText: React.FC<StreamingTextProps> = ({ text, isGenerating }) => {
  const { colors } = useTheme();
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (isGenerating) {
      cursorOpacity.value = withRepeat(
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cursorOpacity.value = 1;
    }
  }, [isGenerating]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  if (!text && !isGenerating) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: colors.surfaceHighlight }]}>
        <Bot size={16} color={colors.primary} />
      </View>
      <View style={[styles.bubble, { backgroundColor: colors.surfaceHighlight }]}>
        <Text style={[styles.text, { color: colors.text }]}>
          {text}
          {isGenerating && (
            <Animated.View style={[styles.cursor, { backgroundColor: colors.primary }, cursorStyle]} />
          )}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    maxWidth: '90%',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginRight: 8,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    width: 6,
    height: 14,
    marginLeft: 2,
    top: 2,
  }
});
