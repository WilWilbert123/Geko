import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Pressable } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
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
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const MASCOT_SIZE = Math.min(SCREEN_W * 0.64, 264);
const MIN_DURATION = 3000;

export const INTRO_BG_TOP = '#16A06B';
export const INTRO_BG_BOTTOM = '#0E7A50';

const LETTERS = ['G', 'E', 'K', 'O'] as const;

// Exact normalized coordinates from the 1024x1024 flat vector mascot artwork
const EYE_R = (104.5 / 1024) * MASCOT_SIZE;
const EYE_D = EYE_R * 2;
const LEFT_EYE_X = (301 / 1024) * MASCOT_SIZE - EYE_R;
const RIGHT_EYE_X = (721 / 1024) * MASCOT_SIZE - EYE_R;
const EYE_Y = (449 / 1024) * MASCOT_SIZE - EYE_R;

const PUPIL_R = (61 / 1024) * MASCOT_SIZE;
const PUPIL_D = PUPIL_R * 2;
const CATCHLIGHT_R = (20.5 / 1024) * MASCOT_SIZE;
const CATCHLIGHT_D = CATCHLIGHT_R * 2;
const CATCHLIGHT_OFFSET_X = (27 / 1024) * MASCOT_SIZE;
const CATCHLIGHT_OFFSET_Y = (-27 / 1024) * MASCOT_SIZE;
const MAX_LOOK_PX = (23 / 1024) * MASCOT_SIZE;

interface IntroSplashProps {
  /** True once the app (DB, stores) is ready to be shown */
  ready: boolean;
  /** Called after the exit animation completes */
  onFinish: () => void;
}

/* ─── Individual Animated Letter (Glides from Right to Center) ─── */
const AnimatedLetter: React.FC<{
  char: string;
  progress: SharedValue<number>;
}> = ({ char, progress }) => {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0.85, 1]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [54, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.84, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.letterBox, style]}>
      <Text style={styles.brandLetter}>{char}</Text>
    </Animated.View>
  );
};

export const IntroSplash: React.FC<IntroSplashProps> = ({ ready, onFinish }) => {
  const [minTimeDone, setMinTimeDone] = useState(false);
  const exiting = useRef(false);

  // Stage appearance
  const stageScale = useSharedValue(0.92);
  const stageOpacity = useSharedValue(0);

  // Bottom-to-top rise: 1 = hidden below bottom edge, 0.37 = peeking eyes only, 0 = full icon pose
  const riseProgress = useSharedValue(1);
  const headTilt = useSharedValue(0);
  const idleBob = useSharedValue(0);

  // Eye look direction (-1..1 normalized) & eyelid blink (0 = open, 1 = closed)
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(-0.7);
  const blink = useSharedValue(0);

  // Staggered right-to-center progress for G, E, K, O + gold accent dot + subtitle
  const letterG = useSharedValue(0);
  const letterE = useSharedValue(0);
  const letterK = useSharedValue(0);
  const letterO = useSharedValue(0);
  const dotIn = useSharedValue(0);
  const subtitleIn = useSharedValue(0);

  const progressFill = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    stageOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    stageScale.value = withSpring(1, { damping: 14, stiffness: 120 });

    // 1) Bottom-to-top choreography:
    //    0..500ms: Slide up from bottom to peek over the edge (eyes & top of head visible)
    //    500..1320ms: Hold peek while looking left & right
    //    1320..1900ms: Rise all the way up from bottom to top into the full mascot mark
    riseProgress.value = withSequence(
      withTiming(0.37, { duration: 500, easing: Easing.out(Easing.cubic) }),
      withTiming(0.35, { duration: 820, easing: Easing.inOut(Easing.quad) }),
      withSpring(0, { damping: 12, stiffness: 105, mass: 0.85 })
    );

    // 2) Subtle head tilt synchronized with looking left -> right -> center
    headTilt.value = withDelay(
      480,
      withSequence(
        withTiming(-2.8, { duration: 300, easing: Easing.out(Easing.quad) }),
        withTiming(-2.8, { duration: 90 }),
        withTiming(2.8, { duration: 340, easing: Easing.inOut(Easing.quad) }),
        withTiming(2.8, { duration: 90 }),
        withSpring(0, { damping: 10, stiffness: 120 })
      )
    );

    // 3) Pupils look up as Geko peeks, then glance Left -> Right -> track G E K O -> Center
    lookX.value = withDelay(
      480,
      withSequence(
        withTiming(-1, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(-1, { duration: 100 }),
        withTiming(1, { duration: 340, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) })
      )
    );

    lookY.value = withSequence(
      withTiming(-0.45, { duration: 500, easing: Easing.out(Easing.quad) }),
      withTiming(-0.2, { duration: 820 }),
      withTiming(0.3, { duration: 260, easing: Easing.out(Easing.quad) }), // briefly glance down at G E K O arriving
      withTiming(0, { duration: 380, easing: Easing.inOut(Easing.quad) })
    );

    // 4) Staggered Right-to-Center reveal for G · E · K · O
    const springCfg = { damping: 14, stiffness: 135, mass: 0.8 };
    letterG.value = withDelay(1120, withSpring(1, springCfg));
    letterE.value = withDelay(1210, withSpring(1, springCfg));
    letterK.value = withDelay(1300, withSpring(1, springCfg));
    letterO.value = withDelay(1390, withSpring(1, springCfg));
    dotIn.value = withDelay(1520, withSpring(1, { damping: 10, stiffness: 160 }));

    // 5) Subtitle glides in cleanly right after G E K O settles in the center
    subtitleIn.value = withDelay(
      1580,
      withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) })
    );

    // 6) Crisp double-blink once Geko and G E K O lock in place
    blink.value = withDelay(
      1920,
      withSequence(
        withTiming(1, { duration: 65 }),
        withTiming(0, { duration: 85 }),
        withTiming(0, { duration: 110 }),
        withTiming(1, { duration: 65 }),
        withTiming(0, { duration: 90 })
      )
    );

    // 7) Gentle idle breathing after full rise
    idleBob.value = withDelay(
      1950,
      withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true)
    );

    progressFill.value = withTiming(1, { duration: MIN_DURATION - 250, easing: Easing.out(Easing.cubic) });

    const t = setTimeout(() => setMinTimeDone(true), MIN_DURATION);
    return () => clearTimeout(t);
  }, []);

  const finish = () => {
    if (exiting.current) return;
    exiting.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    exit.value = withTiming(1, { duration: 420, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(onFinish)();
    });
  };

  useEffect(() => {
    if (ready && minTimeDone) finish();
  }, [ready, minTimeDone]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(exit.value, [0, 1], [1, 0]),
  }));

  const stageStyle = useAnimatedStyle(() => ({
    opacity: stageOpacity.value,
    transform: [
      { scale: stageScale.value * interpolate(exit.value, [0, 1], [1, 1.06]) },
      { translateY: interpolate(exit.value, [0, 1], [0, -18]) },
    ],
  }));

  // Geko character rises from the bottom of the stage (translateY: MASCOT_SIZE -> 0)
  const geckoRiseStyle = useAnimatedStyle(() => {
    const riseY = riseProgress.value * MASCOT_SIZE * 0.92;
    const bobY = interpolate(idleBob.value, [0, 1], [0, -5]);
    return {
      transform: [
        { translateY: riseY + bobY },
        { rotate: `${headTilt.value}deg` },
      ],
    };
  });

  const pupilAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: lookX.value * MAX_LOOK_PX },
      { translateY: lookY.value * MAX_LOOK_PX },
    ],
  }));

  const eyelidAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(blink.value, [0, 1], [-EYE_D, 0]) },
    ],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotIn.value,
    transform: [
      { translateX: interpolate(dotIn.value, [0, 1], [24, 0]) },
      { scale: dotIn.value },
    ],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleIn.value,
    transform: [
      { translateX: interpolate(subtitleIn.value, [0, 1], [28, 0]) },
    ],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressFill.value * 100)}%`,
  }));

  const letterProgressValues = [letterG, letterE, letterK, letterO];

  const renderAnimatedEye = (left: number) => (
    <View
      style={[
        styles.eyeSclera,
        {
          left,
          top: EYE_Y,
          width: EYE_D,
          height: EYE_D,
          borderRadius: EYE_R,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.pupil,
          {
            width: PUPIL_D,
            height: PUPIL_D,
            borderRadius: PUPIL_R,
          },
          pupilAnimatedStyle,
        ]}
      >
        <View
          style={[
            styles.catchlight,
            {
              width: CATCHLIGHT_D,
              height: CATCHLIGHT_D,
              borderRadius: CATCHLIGHT_R,
              transform: [
                { translateX: CATCHLIGHT_OFFSET_X },
                { translateY: CATCHLIGHT_OFFSET_Y },
              ],
            },
          ]}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.eyelid,
          {
            width: EYE_D,
            height: EYE_D,
            borderRadius: EYE_R,
          },
          eyelidAnimatedStyle,
        ]}
      />
    </View>
  );

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => ready && finish()}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={INTRO_BG_TOP} />
              <Stop offset="0.65" stopColor="#149664" />
              <Stop offset="1" stopColor={INTRO_BG_BOTTOM} />
            </LinearGradient>
            <RadialGradient id="ambient" cx="50%" cy="44%" r="50%">
              <Stop offset="0" stopColor="#4DDF94" stopOpacity="0.22" />
              <Stop offset="1" stopColor="#16A06B" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" />
          <Rect width="100%" height="100%" fill="url(#ambient)" />
        </Svg>

        <View style={styles.center}>
          {/* Clean squircle viewport from which Geko peeks up bottom-to-top */}
          <Animated.View style={[styles.mascotViewport, stageStyle]}>
            <Animated.View style={[styles.geckoLayer, geckoRiseStyle]}>
              <Image
                source={require('../../../assets/images/geko_mascot.png')}
                style={styles.mascotImage}
                resizeMode="cover"
                fadeDuration={0}
              />
              {/* Live animated eyes looking left, right, up, and blinking */}
              {renderAnimatedEye(LEFT_EYE_X)}
              {renderAnimatedEye(RIGHT_EYE_X)}
            </Animated.View>
          </Animated.View>

          {/* Staggered Right-to-Center G E K O Wordmark */}
          <View style={styles.titleContainer}>
            <View style={styles.lettersRow}>
              {LETTERS.map((ch, idx) => (
                <AnimatedLetter key={ch} char={ch} progress={letterProgressValues[idx]} />
              ))}

            </View>

          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, progressStyle]} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    zIndex: 999,
    elevation: 999,
    backgroundColor: INTRO_BG_TOP,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  mascotViewport: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    borderRadius: MASCOT_SIZE * 0.24,
    overflow: 'hidden',
    backgroundColor: '#16A06B',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#052E1E',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  geckoLayer: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
  mascotImage: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
  eyeSclera: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pupil: {
    backgroundColor: '#145239',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchlight: {
    backgroundColor: '#FFFFFF',
  },
  eyelid: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#4DDF94',
  },
  titleContainer: {
    marginTop: 30,
    alignItems: 'center',
    gap: 12,
  },
  lettersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 10,
  },
  letterBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLetter: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(5, 46, 30, 0.28)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  goldAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E7B83C',
    marginLeft: -2,
    marginBottom: 4,
  },
  subtitlePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1FAE5',
    letterSpacing: 2.2,
  },
  footer: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressTrack: {
    width: 112,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#4DDF94',
  },
});
