import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Pressable } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const MASCOT_SIZE = Math.min(SCREEN_W * 0.56, 240);
const MIN_DURATION = 2600;
export const INTRO_BG_TOP = '#3DDC84';
export const INTRO_BG_BOTTOM = '#0C6B4E';

interface IntroSplashProps {
  /** True once the app (DB, stores) is ready to be shown */
  ready: boolean;
  /** Called after the exit animation completes */
  onFinish: () => void;
}

/* ───────────────────────── Floating decorations ───────────────────────── */

type FloatieKind = 'coin' | 'leaf' | 'sparkle';

const FLOATIES: { kind: FloatieKind; x: number; y: number; size: number; delay: number; drift: number }[] = [
  { kind: 'coin', x: 0.12, y: 0.18, size: 30, delay: 200, drift: 14 },
  { kind: 'leaf', x: 0.82, y: 0.14, size: 26, delay: 400, drift: 18 },
  { kind: 'sparkle', x: 0.7, y: 0.28, size: 10, delay: 700, drift: 10 },
  { kind: 'leaf', x: 0.08, y: 0.62, size: 22, delay: 550, drift: 16 },
  { kind: 'coin', x: 0.86, y: 0.6, size: 24, delay: 300, drift: 12 },
  { kind: 'sparkle', x: 0.22, y: 0.36, size: 8, delay: 900, drift: 8 },
  { kind: 'sparkle', x: 0.78, y: 0.78, size: 9, delay: 1000, drift: 10 },
  { kind: 'leaf', x: 0.3, y: 0.84, size: 18, delay: 800, drift: 12 },
];

const Floatie: React.FC<(typeof FLOATIES)[number]> = ({ kind, x, y, size, delay, drift }) => {
  const appear = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    appear.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 120 }));
    bob.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1800 + delay, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: appear.value * (kind === 'sparkle' ? interpolate(bob.value, [0, 1], [0.35, 1]) : 0.95),
    transform: [
      { translateY: interpolate(bob.value, [0, 1], [-drift / 2, drift / 2]) },
      { scale: appear.value },
      { rotate: `${interpolate(bob.value, [0, 1], kind === 'leaf' ? [-18, 18] : [-6, 6])}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.floatie, { left: `${x * 100}%`, top: `${y * 100}%` }, style]}>
      {kind === 'coin' && (
        <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.coinText, { fontSize: size * 0.5 }]}>₱</Text>
        </View>
      )}
      {kind === 'leaf' && (
        <View
          style={[
            styles.leaf,
            { width: size, height: size * 0.62, borderTopLeftRadius: size, borderBottomRightRadius: size },
          ]}
        />
      )}
      {kind === 'sparkle' && (
        <View style={[styles.sparkle, { width: size, height: size, borderRadius: size / 2 }]} />
      )}
    </Animated.View>
  );
};

/* ───────────────────────── Loading dots ───────────────────────── */

const Dot: React.FC<{ index: number }> = ({ index }) => {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      index * 160,
      withRepeat(withSequence(withTiming(1, { duration: 360 }), withTiming(0, { duration: 360 })), -1, false)
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 1], [0.4, 1]),
    transform: [{ translateY: interpolate(v.value, [0, 1], [0, -7]) }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
};

/* ───────────────────────── Main intro ───────────────────────── */

export const IntroSplash: React.FC<IntroSplashProps> = ({ ready, onFinish }) => {
  const [minTimeDone, setMinTimeDone] = useState(false);
  const exiting = useRef(false);

  const mascotIn = useSharedValue(0);
  const mascotBob = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const glow = useSharedValue(0);
  const tagline = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    // Mascot pops in, waves hello, then gently bobs
    mascotIn.value = withSpring(1, { damping: 8, stiffness: 90, mass: 0.9 });
    wiggle.value = withDelay(
      550,
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(-1, { duration: 160 }),
        withTiming(1, { duration: 160 }),
        withTiming(0, { duration: 140 })
      )
    );
    mascotBob.value = withDelay(
      900,
      withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
    glow.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
    tagline.value = withDelay(1250, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));

    const t = setTimeout(() => setMinTimeDone(true), MIN_DURATION);
    return () => clearTimeout(t);
  }, []);

  const finish = () => {
    if (exiting.current) return;
    exiting.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    exit.value = withTiming(1, { duration: 520, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(onFinish)();
    });
  };

  useEffect(() => {
    if (ready && minTimeDone) finish();
  }, [ready, minTimeDone]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(exit.value, [0, 1], [1, 0]),
  }));

  const mascotStyle = useAnimatedStyle(() => ({
    opacity: mascotIn.value,
    transform: [
      { translateY: interpolate(mascotBob.value, [0, 1], [-6, 6]) + interpolate(exit.value, [0, 1], [0, -40]) },
      { scale: interpolate(mascotIn.value, [0, 1], [0.3, 1]) * interpolate(exit.value, [0, 1], [1, 1.15]) },
      { rotate: `${wiggle.value * 7}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.35, 0.75]) * mascotIn.value,
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.92, 1.12]) }],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: mascotIn.value * 0.35,
    transform: [{ scaleX: interpolate(mascotBob.value, [0, 1], [1.08, 0.88]) }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [14, 0]) }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => ready && finish()}>
        {/* Background gradient — sized to the container, never to Dimensions, so it can't leave a gap */}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={INTRO_BG_TOP} />
              <Stop offset="0.55" stopColor="#1FA971" />
              <Stop offset="1" stopColor={INTRO_BG_BOTTOM} />
            </LinearGradient>
            <RadialGradient id="halo" cx="50%" cy="42%" r="55%">
              <Stop offset="0" stopColor="#D9FFB0" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#D9FFB0" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" />
          <Rect width="100%" height="100%" fill="url(#halo)" />
          <Circle cx="10%" cy="8%" r={120} fill="#FFFFFF" opacity={0.06} />
          <Circle cx="95%" cy="92%" r={160} fill="#FFFFFF" opacity={0.05} />
        </Svg>

        {FLOATIES.map((f, i) => (
          <Floatie key={i} {...f} />
        ))}

        <View style={styles.center}>
          {/* Fixed-size stage keeps glow perfectly centered behind Geko */}
          <View style={styles.stage}>
            <Animated.View style={[styles.glow, glowStyle]} />
            <Animated.View style={[styles.mascotWrap, mascotStyle]}>
              <Image
                source={require('../../../assets/images/geko_mascot.png')}
                style={styles.mascot}
                resizeMode="cover"
                fadeDuration={0}
              />
            </Animated.View>
          </View>

          <Animated.View style={[styles.shadow, shadowStyle]} />

          <Animated.View style={[styles.titleContainer, taglineStyle]}>
            <Text style={styles.cleanBrandTitle}>Geko Budget Tracker</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            <Dot index={0} />
            <Dot index={1} />
            <Dot index={2} />
          </View>
          <Text style={styles.footerText}>{ready ? 'Tap to continue' : 'Waking up Geko…'}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    zIndex: 999,
    elevation: 999,
    backgroundColor: INTRO_BG_BOTTOM,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  stage: {
    width: MASCOT_SIZE * 1.45,
    height: MASCOT_SIZE * 1.45,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -MASCOT_SIZE * 0.225,
  },
  glow: {
    position: 'absolute',
    width: MASCOT_SIZE * 1.45,
    height: MASCOT_SIZE * 1.45,
    borderRadius: MASCOT_SIZE,
    backgroundColor: '#C6FF7A',
  },
  mascotWrap: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    borderRadius: MASCOT_SIZE * 0.26,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#06392A',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
    backgroundColor: '#2BB673',
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
  shadow: {
    width: MASCOT_SIZE * 0.6,
    height: 14,
    borderRadius: 10,
    backgroundColor: '#04281D',
    marginTop: 18,
  },
  titleContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  cleanBrandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(4, 50, 35, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#F0FFE4',
    textAlign: 'center',
  },
  subTagline: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(240, 255, 228, 0.75)',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  footer: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    height: 16,
    alignItems: 'flex-end',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.6,
  },
  floatie: {
    position: 'absolute',
  },
  coin: {
    backgroundColor: '#F7B733',
    borderWidth: 2,
    borderColor: '#C9861A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A4A00',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  coinText: {
    color: '#8A4B00',
    fontWeight: '900',
    marginTop: -1,
  },
  leaf: {
    backgroundColor: '#9BE564',
    borderWidth: 1.5,
    borderColor: '#5DBB3A',
  },
  sparkle: {
    backgroundColor: '#F4FFB8',
  },
});
