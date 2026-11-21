import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/**
 * Full-Body Transparent-Background Cartoon Walking Geko
 * Matches the charming flat-vector mascot style:
 *  - Mint green skin (#4DDF94), shaded limbs (#34C27B), light toe pads (#7FF2B5)
 *  - Warm gold brow spots (#E7B83C) & deep forest pupils (#145239)
 *  - 4 animated limbs (2 hands + 2 feet with gecko toe pads) in a cartoon walk gait
 *  - Counter-swaying cartoon tail
 *  - Live looking pupils + smooth scaleY eye blink (no Android overflow artifacts!)
 *  - 100% transparent background (no green square box)
 */

export const GEKO_W = 160;
export const GEKO_H = 250;

const SKIN = '#4DDF94';
const SKIN_LIMB = '#34C27B';
const SKIN_BELLY = '#7BF0B2';
const SKIN_TOE = '#6EEAA8';
const FEATURE_DARK = '#145239';
const BROW_GOLD = '#E7B83C';
const STRIDE_MS = 460;

interface GekoWalkerProps {
  /** 0 = idle standing & looking around, 1 = full cartoon walking gait */
  walk: SharedValue<number>;
  /** Scale of the whole gecko (base drawing is 160x250) */
  scale?: number;
}

/* ─── Animated Cartoon Hand / Foot Limb with Gecko Toes ─── */
const CartoonLimb: React.FC<{
  x: number;
  y: number;
  flipX?: boolean;
  isFoot?: boolean;
  sign: 1 | -1;
  phase: SharedValue<number>;
  walk: SharedValue<number>;
}> = ({ x, y, flipX, isFoot, sign, phase, walk }) => {
  const style = useAnimatedStyle(() => {
    const s = Math.sin(phase.value * Math.PI * 2);
    // When walking: full cartoon swing; when idle: gentle subtle hand/foot wave
    const walkSwing = sign * (isFoot ? 30 : 28) * s * walk.value;
    const idleWave = sign * (isFoot ? 3 : 6) * s * (1 - walk.value);
    const stepLift = -Math.max(0, sign * s) * 6 * walk.value;
    return {
      transform: [
        { translateY: stepLift },
        { rotate: `${walkSwing + idleWave}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.abs, { left: x - 34, top: y - 34, width: 68, height: 68 }, style]}>
      <View
        style={{
          width: 68,
          height: 68,
          transform: [
            { scaleX: flipX ? -1 : 1 },
            { scaleY: isFoot ? -1 : 1 },
          ],
        }}
      >
        <Svg width={68} height={68} viewBox="0 0 68 68">
          {/* Arm / Leg with bent cartoon elbow/knee */}
          <Path
            d="M44 40 Q24 36 16 20"
            stroke={SKIN_LIMB}
            strokeWidth={13}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M44 40 Q24 36 16 20"
            stroke={SKIN}
            strokeWidth={9}
            strokeLinecap="round"
            fill="none"
          />
          {/* 4 Spread Gecko Finger/Toe Spokes + Round Toe Pads */}
          <Path
            d="M16 20 L6 23 M16 20 L8 12 M16 20 L16 8 M16 20 L25 11"
            stroke={SKIN}
            strokeWidth={4.5}
            strokeLinecap="round"
          />
          <Circle cx={5.5} cy={23.5} r={4.2} fill={SKIN_TOE} />
          <Circle cx={7.5} cy={11.5} r={4.4} fill={SKIN_TOE} />
          <Circle cx={16} cy={7.5} r={4.4} fill={SKIN_TOE} />
          <Circle cx={25.5} cy={10.5} r={4.2} fill={SKIN_TOE} />
        </Svg>
      </View>
    </Animated.View>
  );
};

export const GekoWalker: React.FC<GekoWalkerProps> = ({ walk, scale = 1 }) => {
  const phase = useSharedValue(0);
  const idle = useSharedValue(0);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const eyeOpen = useSharedValue(1); // 1 = open, 0.08 = blinked shut (uses scaleY so it never floats above head!)

  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: STRIDE_MS, easing: Easing.linear }), -1, false);
    idle.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);

    // Eyes look left -> right -> up -> center
    lookX.value = withRepeat(
      withSequence(
        withTiming(-5.5, { duration: 360, easing: Easing.out(Easing.cubic) }),
        withTiming(-5.5, { duration: 220 }),
        withTiming(5.5, { duration: 460, easing: Easing.inOut(Easing.cubic) }),
        withTiming(5.5, { duration: 220 }),
        withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 950 })
      ),
      -1,
      false
    );

    lookY.value = withRepeat(
      withSequence(
        withTiming(-2.5, { duration: 550 }),
        withTiming(2, { duration: 680 }),
        withTiming(-3, { duration: 520 }),
        withTiming(0, { duration: 800 })
      ),
      -1,
      false
    );

    // Smooth scaleY double-blink (stays strictly inside the eye socket on both iOS & Android)
    eyeOpen.value = withDelay(
      1300,
      withRepeat(
        withSequence(
          withTiming(0.08, { duration: 65 }),
          withTiming(1, { duration: 85 }),
          withTiming(1, { duration: 110 }),
          withTiming(0.08, { duration: 65 }),
          withTiming(1, { duration: 90 }),
          withTiming(1, { duration: 2400 })
        ),
        -1,
        false
      )
    );
  }, []);

  // Bouncy cartoon walk cycle + waddle
  const bodyStyle = useAnimatedStyle(() => {
    const strideAngle = phase.value * Math.PI * 2;
    const bounceY = -Math.abs(Math.sin(strideAngle)) * 6 * walk.value;
    const idleY = (1 - walk.value) * (idle.value - 0.5) * 5;
    const waddleDeg = Math.sin(strideAngle) * 5.5 * walk.value + (1 - walk.value) * (idle.value - 0.5) * 3;
    return {
      transform: [
        { scale },
        { translateY: bounceY + idleY },
        { rotate: `${waddleDeg}deg` },
      ],
    };
  });

  // Counter-swaying cartoon tail
  const tailStyle = useAnimatedStyle(() => {
    const s = Math.sin(phase.value * Math.PI * 2);
    const tailDeg = -22 * s * walk.value + (1 - walk.value) * (idle.value - 0.5) * 18;
    return {
      transform: [
        { translateY: -40 },
        { rotate: `${tailDeg}deg` },
        { translateY: 40 },
      ],
    };
  });

  const pupilStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: lookX.value },
      { translateY: lookY.value },
    ],
  }));

  const eyeBlinkStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: eyeOpen.value }],
  }));

  const outerW = GEKO_W * scale;
  const outerH = GEKO_H * scale;

  return (
    <View style={{ width: outerW, height: outerH, alignItems: 'center', justifyContent: 'center' }}>
      {/* Center the 160x250 canvas before scaling so small scales never shift out of their container */}
      <Animated.View
        style={[
          {
            width: GEKO_W,
            height: GEKO_H,
            position: 'absolute',
            left: (outerW - GEKO_W) / 2,
            top: (outerH - GEKO_H) / 2,
          },
          bodyStyle,
        ]}
      >
        {/* 1. Swaying Cartoon Tail (behind body) */}
        <Animated.View style={[styles.abs, { left: 44, top: 168, width: 72, height: 82 }, tailStyle]}>
          <Svg width={72} height={82} viewBox="0 0 72 82">
            <Path
              d="M22 2 C16 36 52 54 40 76 C37 81 30 81 29 75 C29 52 10 34 50 2 Z"
              fill={SKIN_LIMB}
            />
            <Path
              d="M25 2 C20 34 48 52 38 74 C36 78 32 78 31 73 C31 50 15 32 47 2 Z"
              fill={SKIN}
            />
            <Circle cx={35} cy={26} r={3} fill={BROW_GOLD} opacity={0.85} />
            <Circle cx={37} cy={46} r={2.4} fill={SKIN_BELLY} />
          </Svg>
        </Animated.View>

        {/* 2. Four Cartoon Limbs: 2 Front Hands + 2 Back Feet (Diagonal Trot Gait) */}
        {/* Front Left Hand & Front Right Hand */}
        <CartoonLimb x={42} y={120} sign={1} phase={phase} walk={walk} />
        <CartoonLimb x={118} y={120} flipX sign={-1} phase={phase} walk={walk} />
        {/* Back Left Foot & Back Right Foot */}
        <CartoonLimb x={44} y={168} isFoot sign={-1} phase={phase} walk={walk} />
        <CartoonLimb x={116} y={168} flipX isFoot sign={1} phase={phase} walk={walk} />

        {/* 3. Torso, Neck & Charming Flat Mascot Head */}
        <Svg width={GEKO_W} height={GEKO_H} viewBox="0 0 160 250" style={StyleSheet.absoluteFill}>
          {/* Torso & light mint belly */}
          <Ellipse cx={80} cy={148} rx={29} ry={40} fill={SKIN} />
          <Ellipse cx={80} cy={150} rx={18} ry={27} fill={SKIN_BELLY} opacity={0.55} />
          {/* Subtle back spots */}
          <Circle cx={73} cy={136} r={3} fill={SKIN_LIMB} opacity={0.5} />
          <Circle cx={88} cy={146} r={3.5} fill={SKIN_LIMB} opacity={0.5} />
          <Circle cx={76} cy={160} r={2.6} fill={BROW_GOLD} opacity={0.75} />

          {/* Charming flat mascot head silhouette */}
          <Path
            d="M30 82 C22 56 38 32 56 32 C64 32 70 37 80 37 C90 37 96 32 104 32 C122 32 138 56 130 82 C136 110 118 134 80 134 C42 134 24 110 30 82 Z"
            fill={SKIN}
          />
          {/* Warm gold brow accents */}
          <Rect x={68} y={42} width={5} height={11} rx={2.5} transform="rotate(-18 70 47)" fill={BROW_GOLD} />
          <Rect x={87} y={42} width={5} height={11} rx={2.5} transform="rotate(18 89 47)" fill={BROW_GOLD} />
          {/* Nostrils */}
          <Circle cx={72} cy={88} r={2.8} fill={FEATURE_DARK} />
          <Circle cx={88} cy={88} r={2.8} fill={FEATURE_DARK} />
          {/* Friendly curved smile */}
          <Path
            d="M44 98 Q80 117 116 98"
            stroke={FEATURE_DARK}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        {/* 4. Big Expressive Eyes with Moving Pupils & Clean scaleY Blink */}
        {[25, 91].map((leftPos, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.eyeSclera,
              {
                left: leftPos,
                top: 42,
                width: 44,
                height: 44,
                borderRadius: 22,
              },
              eyeBlinkStyle,
            ]}
          >
            <Animated.View style={[styles.pupil, pupilStyle]}>
              <View style={styles.catchlight} />
            </Animated.View>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  eyeSclera: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: FEATURE_DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchlight: {
    width: 8.5,
    height: 8.5,
    borderRadius: 4.25,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 5 }, { translateY: -5 }],
  },
});
