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
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';

/**
 * Top-down "real" climbing gecko drawn in the style of assets/images/Geko.png
 * (lime bubble eyes, mint skin, green/yellow spots, smile + blush, dark outline).
 *
 * Legs, tail, body and eyes are separate layers animated on the UI thread:
 *  - diagonal trot gait (front-left + back-right swing together)
 *  - body wiggle + counter-swaying tail
 *  - blinking eyes
 */

export const GEKO_W = 160;
export const GEKO_H = 300;

const OUTLINE = '#0B3D2E';
const SKIN = '#6FD487';
const SKIN_LIGHT = '#A6EFA8';
const SKIN_DARK = '#4CC27A';
const SPOT_GREEN = '#2FA56C';
const SPOT_LIME = '#D4F25A';
const EYE = '#C8F04A';

const LEG_BOX = 72;
const STRIDE_MS = 560;

interface GekoWalkerProps {
  /** 0 = standing still, 1 = full walking gait. Animate this to start/stop walking. */
  walk: SharedValue<number>;
  /** Scale of the whole gecko (base drawing is 160x300). */
  scale?: number;
}

/* ───────────────────────── Leg ───────────────────────── */

const LegShape = () => (
  <Svg width={LEG_BOX} height={LEG_BOX} viewBox="0 0 72 72">
    {/* toes */}
    {[
      [3, 19],
      [4, 8],
      [12, 2],
      [22, 4],
    ].map(([x, y], i) => (
      <G key={i}>
        <Line x1={14} y1={16} x2={x} y2={y} stroke={OUTLINE} strokeWidth={5} strokeLinecap="round" />
        <Line x1={14} y1={16} x2={x} y2={y} stroke={SKIN} strokeWidth={2.4} strokeLinecap="round" />
        <Circle cx={x} cy={y} r={3.8} fill={SKIN_LIGHT} stroke={OUTLINE} strokeWidth={2} />
      </G>
    ))}
    {/* limb */}
    <Line x1={36} y1={36} x2={14} y2={16} stroke={OUTLINE} strokeWidth={14} strokeLinecap="round" />
    <Line x1={36} y1={36} x2={14} y2={16} stroke={SKIN} strokeWidth={8} strokeLinecap="round" />
    <Circle cx={26} cy={27} r={1.8} fill={SPOT_LIME} />
  </Svg>
);

const Leg: React.FC<{
  x: number;
  y: number;
  flipX?: boolean;
  flipY?: boolean;
  sign: 1 | -1;
  phase: SharedValue<number>;
  walk: SharedValue<number>;
}> = ({ x, y, flipX, flipY, sign, phase, walk }) => {
  const style = useAnimatedStyle(() => {
    const s = Math.sin(phase.value * Math.PI * 2);
    return { transform: [{ rotate: `${sign * 24 * s * walk.value}deg` }] };
  });

  return (
    <Animated.View style={[styles.abs, { left: x - LEG_BOX / 2, top: y - LEG_BOX / 2 }, style]}>
      <View style={{ transform: [{ scaleX: flipX ? -1 : 1 }, { scaleY: flipY ? -1 : 1 }] }}>
        <LegShape />
      </View>
    </Animated.View>
  );
};

/* ───────────────────────── Main gecko ───────────────────────── */

export const GekoWalker: React.FC<GekoWalkerProps> = ({ walk, scale = 1 }) => {
  const phase = useSharedValue(0);
  const idle = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: STRIDE_MS, easing: Easing.linear }), -1, false);
    idle.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);

    // Blink every ~2.6s (a quick double blink feels alive & cute)
    blink.value = withDelay(
      1900,
      withRepeat(
        withSequence(
          withTiming(0.1, { duration: 70 }),
          withTiming(1, { duration: 90 }),
          withTiming(1, { duration: 120 }),
          withTiming(0.1, { duration: 70 }),
          withTiming(1, { duration: 90 }),
          withTiming(1, { duration: 2200 })
        ),
        -1,
        false
      )
    );
  }, []);

  // Whole-body wiggle while walking + gentle breathing when idle
  const bodyStyle = useAnimatedStyle(() => {
    const s = Math.sin(phase.value * Math.PI * 2);
    const breathe = 1 + (1 - walk.value) * 0.025 * idle.value;
    return {
      transform: [{ scale: scale * breathe }, { rotate: `${5 * s * walk.value}deg` }],
    };
  });

  // Tail pivots at its root (top of its box) and counter-sways the body
  const TAIL_H = 130;
  const tailStyle = useAnimatedStyle(() => {
    const s = Math.sin(phase.value * Math.PI * 2);
    const angle = -14 * s * walk.value + (1 - walk.value) * (idle.value - 0.5) * 16;
    return {
      transform: [{ translateY: -TAIL_H / 2 }, { rotate: `${angle}deg` }, { translateY: TAIL_H / 2 }],
    };
  });

  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));

  return (
    <View style={{ width: GEKO_W * scale, height: GEKO_H * scale, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: GEKO_W, height: GEKO_H }, bodyStyle]}>
        {/* Tail (behind body) */}
        <Animated.View style={[styles.abs, { left: 40, top: 186 }, tailStyle]}>
          <Svg width={80} height={TAIL_H} viewBox="0 0 80 130">
            <Path
              d="M27 2 C19 48 56 78 45 125 C44 129 40 129 40 125 C42 84 26 58 53 2 Z"
              fill={SKIN}
              stroke={OUTLINE}
              strokeWidth={4}
              strokeLinejoin="round"
            />
            <Circle cx={38} cy={24} r={3.5} fill={SPOT_LIME} />
            <Circle cx={43} cy={48} r={3} fill={SPOT_GREEN} />
            <Circle cx={46} cy={72} r={2.6} fill={SPOT_LIME} />
            <Circle cx={44} cy={96} r={2} fill={SPOT_GREEN} />
          </Svg>
        </Animated.View>

        {/* Legs (behind body so shoulders are hidden) — diagonal trot gait */}
        <Leg x={50} y={118} sign={1} phase={phase} walk={walk} />
        <Leg x={110} y={118} flipX sign={1} phase={phase} walk={walk} />
        <Leg x={54} y={180} flipY sign={-1} phase={phase} walk={walk} />
        <Leg x={106} y={180} flipX flipY sign={-1} phase={phase} walk={walk} />

        {/* Body + head */}
        <Svg width={GEKO_W} height={GEKO_H} viewBox="0 0 160 300" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={SKIN_LIGHT} />
              <Stop offset="1" stopColor={SKIN_DARK} />
            </LinearGradient>
          </Defs>

          {/* torso */}
          <Ellipse cx={80} cy={152} rx={33} ry={52} fill="url(#skin)" stroke={OUTLINE} strokeWidth={4} />
          <Ellipse cx={72} cy={142} rx={9} ry={30} fill="#FFFFFF" opacity={0.2} />
          <Circle cx={80} cy={128} r={5} fill={SPOT_GREEN} />
          <Circle cx={67} cy={150} r={4} fill={SPOT_LIME} />
          <Circle cx={95} cy={146} r={4.5} fill={SPOT_GREEN} />
          <Circle cx={79} cy={170} r={3.6} fill={SPOT_LIME} />
          <Circle cx={92} cy={184} r={3} fill={SPOT_GREEN} />
          <Circle cx={70} cy={118} r={3} fill={SPOT_LIME} />

          {/* head */}
          <Ellipse cx={80} cy={80} rx={40} ry={36} fill="url(#skin)" stroke={OUTLINE} strokeWidth={4} />
          <Circle cx={80} cy={62} r={4.5} fill={SPOT_GREEN} />
          <Circle cx={69} cy={74} r={3} fill={SPOT_LIME} />
          <Circle cx={92} cy={72} r={3.6} fill={SPOT_GREEN} />
          {/* nostrils */}
          <Ellipse cx={73} cy={50} rx={2.6} ry={2} fill={OUTLINE} />
          <Ellipse cx={87} cy={50} rx={2.6} ry={2} fill={OUTLINE} />
          {/* blush + smile */}
          <Circle cx={55} cy={96} r={6} fill="#FF9DB0" opacity={0.55} />
          <Circle cx={105} cy={96} r={6} fill="#FF9DB0" opacity={0.55} />
          <Path d="M58 90 Q80 110 102 90" stroke={OUTLINE} strokeWidth={4} fill="none" strokeLinecap="round" />
        </Svg>

        {/* Bubble eyes (separate layer so they can blink) */}
        <Animated.View style={[styles.abs, { left: 20, top: 40 }, eyeStyle]}>
          <Svg width={120} height={46} viewBox="0 0 120 46">
            {[30, 90].map((cx) => (
              <G key={cx}>
                <Circle cx={cx} cy={23} r={19} fill={EYE} stroke={OUTLINE} strokeWidth={4} />
                <Circle cx={cx} cy={24} r={12} fill={OUTLINE} />
                <Circle cx={cx - 4} cy={18} r={5} fill="#FFFFFF" />
                <Circle cx={cx + 5} cy={29} r={2.4} fill="#FFFFFF" />
              </G>
            ))}
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
