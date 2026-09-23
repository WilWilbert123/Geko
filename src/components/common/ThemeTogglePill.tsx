import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Sun, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ThemeTogglePillProps {
  isDark: boolean;
  onToggle: () => void;
}

export const ThemeTogglePill: React.FC<ThemeTogglePillProps> = ({ isDark, onToggle }) => {
  const [activeDark, setActiveDark] = useState(isDark);
  const offset = useSharedValue(isDark ? 31 : 0);

  useEffect(() => {
    setActiveDark(isDark);
    offset.value = withSpring(isDark ? 31 : 0, {
      stiffness: 350,
      damping: 25,
      mass: 0.7,
    });
  }, [isDark]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextDark = !activeDark;
    setActiveDark(nextDark);
    offset.value = withSpring(nextDark ? 31 : 0, {
      stiffness: 350,
      damping: 25,
      mass: 0.7,
    });

    // Defer global tree re-render to allow UI-thread spring to animate at 60 FPS
    requestAnimationFrame(() => {
      setTimeout(() => {
        onToggle();
      }, 40);
    });
  };

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value }],
    };
  });

  return (
    <TouchableOpacity
      style={[
        styles.track,
        {
          backgroundColor: activeDark ? '#1E293B' : '#E2E8F0',
          borderColor: activeDark ? '#334155' : '#CBD5E1',
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Sliding White Circular Thumb */}
      <Animated.View
        style={[
          styles.thumb,
          thumbAnimatedStyle,
          {
            backgroundColor: activeDark ? '#0F172A' : '#FFFFFF',
          },
        ]}
      />

      {/* Sun Icon on Left */}
      <View style={styles.iconSlot}>
        <Sun
          size={14}
          color={!activeDark ? '#EAB308' : '#64748B'}
          strokeWidth={!activeDark ? 2.5 : 1.8}
        />
      </View>

      {/* Moon Icon on Right */}
      <View style={styles.iconSlot}>
        <Moon
          size={14}
          color={activeDark ? '#818CF8' : '#64748B'}
          strokeWidth={activeDark ? 2.5 : 1.8}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 65,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1,
  },
  iconSlot: {
    width: 29,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
