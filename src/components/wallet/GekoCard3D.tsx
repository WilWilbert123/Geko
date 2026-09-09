import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { RotateCw, Eye, EyeOff } from 'lucide-react-native';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../hooks/useCurrency';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_ASPECT = 1.586;
const CARD_WIDTH_3D = 4.8;
const CARD_HEIGHT_3D = CARD_WIDTH_3D / CARD_ASPECT; // ~2.77
const CARD_DEPTH_3D = 0.048;
const CORNER_RADIUS = 0.18;

// High-resolution bitmap font dictionary for 3D card text rendering
const FONT: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
  '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
  '$': [0x12, 0x2A, 0x7F, 0x2A, 0x24],
  '₱': [0x7F, 0x15, 0x15, 0x15, 0x0E],
  ',': [0x00, 0xA0, 0x60, 0x00, 0x00],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '•': [0x00, 0x1C, 0x1C, 0x1C, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '/': [0x60, 0x18, 0x06, 0x01, 0x00],
  'A': [0x7C, 0x12, 0x11, 0x12, 0x7C],
  'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
  'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
  'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
  'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7F, 0x02, 0x04, 0x02, 0x7F],
  'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
  'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
  'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
  'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
  'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
};

const TEX_W = 512;
const TEX_H = 324;

interface GekoCard3DProps {
  balance?: number;
  spentToday?: number;
  dailyLimit?: number;
  cardNumber?: string;
  cardholderName?: string;
  accountType?: string;
  expiryDate?: string;
  interactive?: boolean;
  height?: number;
}

export const GekoCard3D: React.FC<GekoCard3DProps> = ({
  balance = 9350,
  cardholderName = 'GEKO MEMBER',
  expiryDate = '10/29',
  height = 230,
  interactive = true,
}) => {
  const { currency } = useCurrency();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Rotation and interaction refs
  const rotX = useRef(0);
  const rotY = useRef(0);
  const targetRotX = useRef(0);
  const targetRotY = useRef(0);
  const targetFlipY = useRef(0);
  const currentFlipY = useRef(0);
  const touchActive = useRef(false);
  const lightPos = useRef({ x: 0.5, y: 0.5 });
  const targetLightPos = useRef({ x: 0.5, y: 0.5 });
  const shineIntensity = useRef(0);
  const animFrameId = useRef<number | null>(null);

  // Three.js texture ref for dynamic text updates
  const textTextureRef = useRef<THREE.DataTexture | null>(null);
  const textDataRef = useRef<Uint8Array>(new Uint8Array(TEX_W * TEX_H * 4));

  const toggleHidden = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsHidden(prev => !prev);
  };

  const flipCard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsFlipped(prev => {
      const next = !prev;
      targetFlipY.current = next ? Math.PI : 0;
      return next;
    });
  }, []);

  // Update text bitmap data onto the texture
  const updateCardText = useCallback(() => {
    const buf = textDataRef.current;
    buf.fill(0); // clear

    const drawString = (text: string, startX: number, startY: number, scale: number) => {
      let cx = startX;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i].toUpperCase();
        const cols = FONT[ch] || FONT[' '];
        for (let c = 0; c < 5; c++) {
          const colByte = cols[c];
          for (let r = 0; r < 7; r++) {
            if ((colByte >> r) & 1) {
              for (let sx = 0; sx < scale; sx++) {
                for (let sy = 0; sy < scale; sy++) {
                  const px = cx + c * scale + sx;
                  // Upright letter orientation in WebGL UV space
                  const py = startY + (6 - r) * scale + sy;
                  if (px >= 0 && px < TEX_W && py >= 0 && py < TEX_H) {
                    const idx = (py * TEX_W + px) * 4;
                    buf[idx] = 255;
                    buf[idx + 1] = 255;
                    buf[idx + 2] = 255;
                    buf[idx + 3] = 255;
                  }
                }
              }
            }
          }
        }
        cx += (5 + 1) * scale;
      }
    };

    // Draw embossed details directly onto card surface:
    // In WebGL UV coordinates: Y=0 is bottom, Y=323 is top.
    drawString('TOTAL BALANCE', 46, 155, 2);

    const balanceStr = isHidden ? '••••••••' : formatCurrency(balance);
    drawString(balanceStr, 46, 96, 4);

    drawString(cardholderName, 46, 25, 2);
    drawString(expiryDate, 380, 25, 2);

    if (textTextureRef.current) {
      textTextureRef.current.needsUpdate = true;
    }
  }, [balance, isHidden, cardholderName, expiryDate, currency]);

  useEffect(() => {
    updateCardText();
  }, [updateCardText]);

  // Touch gesture pan responder for 3D tilt & flip
  const panResponder = useMemo(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: (evt) => {
        touchActive.current = true;
        startX = evt.nativeEvent.locationX;
        startY = evt.nativeEvent.locationY;
        startTime = Date.now();

        const nx = Math.max(0, Math.min(1, startX / (SCREEN_WIDTH - 40)));
        const ny = Math.max(0, Math.min(1, 1.0 - startY / height));
        targetLightPos.current = { x: nx, y: ny };
      },
      onPanResponderMove: (evt, gestureState) => {
        touchActive.current = true;
        const normalizedX = gestureState.dx / 110;
        const normalizedY = gestureState.dy / 90;

        targetRotY.current = Math.max(-0.6, Math.min(0.6, normalizedX));
        targetRotX.current = Math.max(-0.45, Math.min(0.45, -normalizedY));

        const curX = evt.nativeEvent.locationX;
        const curY = evt.nativeEvent.locationY;
        targetLightPos.current = {
          x: Math.max(0, Math.min(1, curX / (SCREEN_WIDTH - 40))),
          y: Math.max(0, Math.min(1, 1.0 - curY / height)),
        };
      },
      onPanResponderRelease: (_, gestureState) => {
        touchActive.current = false;
        targetRotX.current = 0;
        targetRotY.current = 0;

        const duration = Date.now() - startTime;
        const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
        if (duration < 250 && distance < 10) {
          flipCard();
        }
      },
      onPanResponderTerminate: () => {
        touchActive.current = false;
        targetRotX.current = 0;
        targetRotY.current = 0;
      },
    });
  }, [flipCard, height]);

  // Three.js context initialization
  const onContextCreate = useCallback((gl: any) => {
    const width = gl.drawingBufferWidth || (SCREEN_WIDTH - 40);
    const glHeight = gl.drawingBufferHeight || height;

    const scene = new THREE.Scene();

    // Camera: positioned so the full 3D card fits with generous padding
    const aspect = width / glHeight;
    const camera = new THREE.PerspectiveCamera(68, aspect, 0.1, 100);
    camera.position.set(0, 0, 3.2);
    camera.lookAt(0, 0, 0);

    // Renderer (pixelRatio 1 because drawingBuffer is already in device pixels)
    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width,
        height: glHeight,
        style: {},
        addEventListener: () => { },
        removeEventListener: () => { },
        clientHeight: glHeight,
        clientWidth: width,
      } as any,
      context: gl,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width, glHeight, false);

    // Create Text DataTexture
    const textTexture = new THREE.DataTexture(
      textDataRef.current,
      TEX_W,
      TEX_H,
      THREE.RGBAFormat
    );
    textTexture.needsUpdate = true;
    textTextureRef.current = textTexture;
    updateCardText();

    // Card Shape with rounded corners
    const shape = new THREE.Shape();
    const x = -CARD_WIDTH_3D / 2;
    const y = -CARD_HEIGHT_3D / 2;
    const w = CARD_WIDTH_3D;
    const h = CARD_HEIGHT_3D;
    const r = CORNER_RADIUS;

    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);

    // Extrude geometry for milled platinum edges
    const edgeGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: CARD_DEPTH_3D,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.008,
    });
    edgeGeometry.center();

    // Face geometry for front and back
    const faceGeometry = new THREE.ShapeGeometry(shape);
    faceGeometry.center();

    // Compute normalized UV coordinates (0..1)
    faceGeometry.computeBoundingBox();
    const bb = faceGeometry.boundingBox!;
    const pos = faceGeometry.attributes.position;
    const uvs: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x);
      const v = (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y);
      uvs.push(u, v);
    }
    faceGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    // Front Shader Material
    const frontUniforms = {
      uTime: { value: 0 },
      uLightPos: { value: new THREE.Vector2(0.5, 0.5) },
      uTextTexture: { value: textTexture },
      uShineIntensity: { value: 0.0 },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const frontFragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uLightPos;
      uniform sampler2D uTextTexture;
      uniform float uShineIntensity;
      varying vec2 vUv;

      float sdRoundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
      }

      void main() {
        // 1. Dark Obsidian / Titanium Metallic Gradient
        vec3 darkGraphite = vec3(0.065, 0.075, 0.09);
        vec3 richObsidian = vec3(0.12, 0.135, 0.16);
        vec3 col = mix(darkGraphite, richObsidian, vUv.y * 0.8 + vUv.x * 0.2);

        // Brushed metal horizontal grain
        float brush = fract(sin(vUv.y * 1400.0) * 43758.5453) * 0.022;
        col += vec3(brush);

        // 2. Maya-Style Contour Dot Wave Matrix
        vec2 grid = vec2(68.0, 43.0);
        vec2 f = fract(vUv * grid) - 0.5;
        vec2 cellCenter = (floor(vUv * grid) + 0.5) / grid;

        float d1 = distance(cellCenter, vec2(0.88, -0.12));
        float ring1 = sin(d1 * 28.0) * 0.5 + 0.5;
        float mask1 = smoothstep(0.92, 0.18, d1);

        float d2 = distance(cellCenter, vec2(0.12, 0.98));
        float ring2 = sin(d2 * 22.0 + 0.8) * 0.5 + 0.5;
        float mask2 = smoothstep(0.88, 0.15, d2);

        float d3 = distance(cellCenter, vec2(0.95, 0.52));
        float ring3 = sin(d3 * 24.0 + 1.2) * 0.5 + 0.5;
        float mask3 = smoothstep(0.75, 0.10, d3);

        float waveFlow = sin(cellCenter.x * 6.0 - cellCenter.y * 4.0 + 1.0) * 0.5 + 0.5;

        float waveIntensity = max(ring1 * mask1, ring2 * mask2 * 0.9);
        waveIntensity = max(waveIntensity, ring3 * mask3 * 0.8);
        waveIntensity = mix(waveIntensity, waveFlow, 0.2);

        float dotRadius = mix(0.06, 0.44, pow(waveIntensity, 1.35));
        float dotDist = length(f);
        float dotMask = smoothstep(dotRadius, dotRadius - 0.07, dotDist);

        vec3 silverDull = vec3(0.55, 0.58, 0.64);
        vec3 silverBright = vec3(0.88, 0.91, 0.96);
        vec3 dotColor = mix(silverDull, silverBright, waveIntensity);

        float distToLight = length(cellCenter - uLightPos);
        float dotGlint = pow(max(0.0, 1.0 - distToLight * 1.4), 16.0) * 0.85;
        dotColor += vec3(dotGlint * 0.9, dotGlint * 0.92, dotGlint * 1.0);

        col = mix(col, dotColor, dotMask * 0.88);

        // 3. EMV Smart Chip (Top-Left)
        vec2 chipCenter = vec2(0.175, 0.68);
        vec2 chipHalfSize = vec2(0.075, 0.11);
        float dChip = sdRoundedBox(vUv - chipCenter, chipHalfSize, 0.018);
        float chipMask = smoothstep(0.002, -0.002, dChip);

        if (chipMask > 0.0) {
          vec3 chipGrad = mix(vec3(0.84, 0.80, 0.70), vec3(0.96, 0.93, 0.84), (vUv.y - 0.57) / 0.22);
          vec2 chipLocal = vUv - chipCenter;
          float grooveH = smoothstep(0.0025, 0.0, abs(chipLocal.y));
          float grooveV1 = smoothstep(0.0025, 0.0, abs(chipLocal.x + 0.038));
          float grooveV2 = smoothstep(0.0025, 0.0, abs(chipLocal.x - 0.038));
          float centerPad = sdRoundedBox(chipLocal, vec2(0.028, 0.05), 0.008);
          float centerPadGroove = smoothstep(0.0025, 0.0, abs(centerPad));

          float anyGroove = max(max(grooveH, max(grooveV1, grooveV2)), centerPadGroove);
          vec3 grooveColor = vec3(0.32, 0.28, 0.20);
          float chipBorder = smoothstep(0.006, 0.001, abs(dChip));
          vec3 chipSurface = mix(chipGrad, grooveColor, anyGroove * 0.85);
          chipSurface += vec3(chipBorder * 0.3);

          float chipLight = pow(max(0.0, 1.0 - length(vUv - uLightPos) * 2.0), 12.0) * 0.6;
          chipSurface += vec3(chipLight);

          col = mix(col, chipSurface, chipMask);
        }

        // 4. Contactless / NFC Wave
        vec2 nfcCenter = vec2(0.282, 0.68);
        vec2 nfcDelta = vUv - nfcCenter;
        float nfcDist = length(nfcDelta);
        if (nfcDelta.x > 0.002 && abs(nfcDelta.y) < nfcDelta.x * 1.3) {
          float arc1 = smoothstep(0.0035, 0.0, abs(nfcDist - 0.016));
          float arc2 = smoothstep(0.0035, 0.0, abs(nfcDist - 0.030));
          float arc3 = smoothstep(0.0035, 0.0, abs(nfcDist - 0.044));
          float arc4 = smoothstep(0.0035, 0.0, abs(nfcDist - 0.058));
          float nfcTotal = max(max(arc1, arc2), max(arc3, arc4));
          col = mix(col, vec3(0.85, 0.88, 0.94), nfcTotal * 0.9);
        }

        // 5. GEKO Modern Silver Logo (Top-Right)
        vec2 logoPos = vUv - vec2(0.80, 0.79);
        float dLogoArea = sdRoundedBox(logoPos, vec2(0.12, 0.06), 0.015);
        if (dLogoArea < 0.0) {
          vec2 gP = logoPos - vec2(-0.075, 0.0);
          float gOuter = sdRoundedBox(gP, vec2(0.018, 0.026), 0.014);
          float gInner = sdRoundedBox(gP, vec2(0.010, 0.018), 0.007);
          float gRing = max(smoothstep(0.002, -0.002, gOuter), -smoothstep(0.002, -0.002, gInner));
          if (gP.x > 0.004 && gP.y > 0.004) gRing = 0.0;
          if (gP.x > 0.0 && abs(gP.y) < 0.004) gRing = 1.0;

          vec2 eP = logoPos - vec2(-0.03, 0.0);
          float eStem = (abs(eP.x + 0.012) < 0.0038 && abs(eP.y) < 0.026) ? 1.0 : 0.0;
          float eTop = (eP.x > -0.012 && eP.x < 0.014 && abs(eP.y - 0.022) < 0.0035) ? 1.0 : 0.0;
          float eMid = (eP.x > -0.012 && eP.x < 0.009 && abs(eP.y) < 0.0032) ? 1.0 : 0.0;
          float eBot = (eP.x > -0.012 && eP.x < 0.014 && abs(eP.y + 0.022) < 0.0035) ? 1.0 : 0.0;
          float eLetter = max(max(eStem, eTop), max(eMid, eBot));

          vec2 kP = logoPos - vec2(0.015, 0.0);
          float kStem = (abs(kP.x + 0.012) < 0.0038 && abs(kP.y) < 0.026) ? 1.0 : 0.0;
          float kArmUp = (abs((kP.y - 0.004) - (kP.x + 0.008) * 1.5) < 0.004 && kP.x > -0.008 && kP.x < 0.016 && kP.y > 0.0) ? 1.0 : 0.0;
          float kArmDn = (abs((kP.y + 0.004) + (kP.x + 0.008) * 1.5) < 0.004 && kP.x > -0.008 && kP.x < 0.016 && kP.y < 0.0) ? 1.0 : 0.0;
          float kLetter = max(max(kStem, kArmUp), kArmDn);

          vec2 oP = logoPos - vec2(0.06, 0.0);
          float oOuter = sdRoundedBox(oP, vec2(0.018, 0.026), 0.014);
          float oInner = sdRoundedBox(oP, vec2(0.010, 0.018), 0.007);
          float oRing = max(smoothstep(0.002, -0.002, oOuter), -smoothstep(0.002, -0.002, oInner));

          float gekoLogo = max(max(gRing, eLetter), max(kLetter, oRing));

          vec3 logoChrome = mix(vec3(0.85, 0.88, 0.95), vec3(1.0, 1.0, 1.0), (logoPos.y + 0.06) / 0.12);
          float logoGlint = pow(max(0.0, 1.0 - length(vUv - uLightPos) * 1.6), 14.0) * 1.2;
          logoChrome += vec3(logoGlint);

          col = mix(col, logoChrome, gekoLogo);
        }

        // PLATINUM Badge beneath GEKO logo
        vec2 platPos = vUv - vec2(0.80, 0.705);
        float dPlatBorder = sdRoundedBox(platPos, vec2(0.085, 0.016), 0.007);
        float platBorderMask = smoothstep(0.0025, 0.0, abs(dPlatBorder));
        col = mix(col, vec3(0.80, 0.83, 0.90), platBorderMask * 0.75);

        // 6. VISA / Platinum Foil Emblem (Bottom-Right)
        vec2 visaPos = vUv - vec2(0.81, 0.18);
        float dVisaArea = sdRoundedBox(visaPos, vec2(0.10, 0.05), 0.01);
        if (dVisaArea < 0.0) {
          float v1 = (abs((visaPos.y - 0.015) + (visaPos.x + 0.06) * 3.5) < 0.004 && visaPos.x > -0.075 && visaPos.x < -0.045) ? 1.0 : 0.0;
          float v2 = (abs((visaPos.y - 0.015) - (visaPos.x + 0.035) * 3.5) < 0.004 && visaPos.x > -0.05 && visaPos.x < -0.02) ? 1.0 : 0.0;
          float iStem = (abs(visaPos.x - 0.0) < 0.0035 && abs(visaPos.y - 0.015) < 0.018) ? 1.0 : 0.0;
          float sTop = (abs(visaPos.y - 0.03) < 0.0035 && visaPos.x > 0.02 && visaPos.x < 0.05) ? 1.0 : 0.0;
          float sMid = (abs(visaPos.y - 0.015) < 0.0035 && visaPos.x > 0.022 && visaPos.x < 0.048) ? 1.0 : 0.0;
          float sBot = (abs(visaPos.y + 0.0) < 0.0035 && visaPos.x > 0.02 && visaPos.x < 0.05) ? 1.0 : 0.0;
          float sL = (abs(visaPos.x - 0.022) < 0.0035 && visaPos.y > 0.015 && visaPos.y < 0.03) ? 1.0 : 0.0;
          float sR = (abs(visaPos.x - 0.048) < 0.0035 && visaPos.y > -0.002 && visaPos.y < 0.015) ? 1.0 : 0.0;
          float sLetter = max(max(sTop, sMid), max(max(sBot, sL), sR));
          float aL = (abs((visaPos.y - 0.015) + (visaPos.x - 0.07) * 3.5) < 0.004 && visaPos.x > 0.055 && visaPos.x < 0.075) ? 1.0 : 0.0;
          float aR = (abs((visaPos.y - 0.015) - (visaPos.x - 0.085) * 3.5) < 0.004 && visaPos.x > 0.075 && visaPos.x < 0.095) ? 1.0 : 0.0;
          float aBar = (abs(visaPos.y - 0.01) < 0.0035 && visaPos.x > 0.065 && visaPos.x < 0.088) ? 1.0 : 0.0;
          float aLetter = max(max(aL, aR), aBar);

          float visaText = max(max(max(v1, v2), iStem), max(sLetter, aLetter));
          float platSub = (abs(visaPos.y + 0.022) < 0.0025 && abs(visaPos.x - 0.01) < 0.065) ? 1.0 : 0.0;

          vec3 visaSilver = mix(vec3(0.82, 0.85, 0.92), vec3(1.0, 1.0, 1.0), (visaPos.y + 0.05) / 0.10);
          col = mix(col, visaSilver, max(visaText, platSub * 0.85));
        }

        // 7. EMBOSSED CARD BALANCE & DETAILS (Rendered directly ON the physical card!)
        vec4 textSample = texture2D(uTextTexture, vUv);
        if (textSample.a > 0.05) {
          // Polished silver embossed foil lettering with specular gleam
          vec3 textSilver = mix(vec3(0.92, 0.94, 0.98), vec3(1.0, 1.0, 1.0), vUv.y);
          float textLightDist = length(vUv - uLightPos);
          float textGlint = pow(max(0.0, 1.0 - textLightDist * 1.5), 14.0) * 1.1;
          textSilver += vec3(textGlint);
          col = mix(col, textSilver, textSample.a);
        }

        // 8. Dynamic Shining Silver Light Sweep (only visible when held/moved)
        float sweepCoord = vUv.x + vUv.y * 0.45;
        float sweepCenter = uLightPos.x * 1.4 + 0.1;
        float sweep = smoothstep(0.24, 0.0, abs(sweepCoord - sweepCenter)) * uShineIntensity;
        
        vec3 holoRainbow = 0.5 + 0.5 * cos(6.28318 * (sweepCoord * 1.5 + uTime * 0.25 + vec3(0.0, 0.33, 0.67)));
        vec3 pureSilverSheen = vec3(0.96, 0.98, 1.0) * sweep * 0.5;
        vec3 holographicGleam = holoRainbow * sweep * 0.22;
        
        col += pureSilverSheen + holographicGleam;

        // Card Edge Rim Highlight
        float edgeD = sdRoundedBox(vUv - 0.5, vec2(0.48, 0.48), 0.04);
        float edgeRim = smoothstep(0.004, 0.0, abs(edgeD));
        col += vec3(edgeRim * 0.35);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const frontMaterial = new THREE.ShaderMaterial({
      uniforms: frontUniforms,
      vertexShader,
      fragmentShader: frontFragmentShader,
    });

    // Back Shader Material (Magnetic stripe, signature strip, hologram)
    const backUniforms = {
      uTime: { value: 0 },
      uLightPos: { value: new THREE.Vector2(0.5, 0.5) },
      uShineIntensity: { value: 0.0 },
    };

    const backFragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uLightPos;
      uniform float uShineIntensity;
      varying vec2 vUv;

      float sdRoundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
      }

      void main() {
        vec3 col = vec3(0.09, 0.10, 0.12);

        // Magnetic Stripe
        if (vUv.y > 0.70 && vUv.y < 0.88) {
          vec3 magStripe = vec3(0.03, 0.03, 0.04);
          float magGlint = smoothstep(0.18, 0.0, abs(vUv.x - uLightPos.x));
          magStripe += vec3(magGlint * 0.15);
          col = magStripe;
        }

        // Signature Panel
        vec2 sigPos = vUv - vec2(0.38, 0.51);
        float dSig = sdRoundedBox(sigPos, vec2(0.29, 0.065), 0.008);
        if (dSig < 0.0) {
          vec3 sigWhite = vec3(0.92, 0.93, 0.94);
          float securityLines = sin((vUv.x + vUv.y) * 200.0) * 0.03;
          sigWhite += vec3(securityLines);

          if (vUv.x > 0.58 && vUv.x < 0.66 && abs(vUv.y - 0.51) < 0.03) {
            float cvvText = (fract(vUv.x * 40.0) < 0.6) ? 0.2 : 0.9;
            sigWhite = mix(sigWhite, vec3(0.1, 0.1, 0.15), cvvText);
          }
          col = sigWhite;
        }

        // Holographic Security Patch
        vec2 holoPos = vUv - vec2(0.805, 0.51);
        float dHolo = sdRoundedBox(holoPos, vec2(0.07, 0.065), 0.008);
        if (dHolo < 0.0) {
          float holoWave = sin(vUv.x * 25.0 + vUv.y * 25.0 + uTime * 2.0);
          vec3 holoColor = 0.5 + 0.5 * cos(6.28318 * (holoWave * 0.4 + vec3(0.0, 0.33, 0.67)));
          float holoLight = pow(max(0.0, 1.0 - length(vUv - uLightPos) * 2.0), 8.0);
          col = holoColor * 0.75 + vec3(holoLight * 0.4);
        }

        if (vUv.y > 0.20 && vUv.y < 0.32 && vUv.x > 0.08 && vUv.x < 0.90) {
          float microText = (fract(vUv.y * 35.0) < 0.4 && fract(vUv.x * 50.0) < 0.7) ? 0.35 : 0.0;
          col = mix(col, vec3(0.55, 0.58, 0.64), microText);
        }

        float sweep = smoothstep(0.20, 0.0, abs(vUv.x - uLightPos.x)) * uShineIntensity;
        col += vec3(sweep * 0.08);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const backMaterial = new THREE.ShaderMaterial({
      uniforms: backUniforms,
      vertexShader,
      fragmentShader: backFragmentShader,
    });

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xC4C8D0,
      metalness: 0.95,
      roughness: 0.18,
    });

    const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
    const frontMesh = new THREE.Mesh(faceGeometry, frontMaterial);
    frontMesh.position.z = CARD_DEPTH_3D / 2 + 0.009;

    const backMesh = new THREE.Mesh(faceGeometry, backMaterial);
    backMesh.position.z = -CARD_DEPTH_3D / 2 - 0.009;
    backMesh.rotation.y = Math.PI;

    const cardGroup = new THREE.Group();
    cardGroup.add(edgeMesh);
    cardGroup.add(frontMesh);
    cardGroup.add(backMesh);
    scene.add(cardGroup);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xE0E8FF, 1.3);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x90B8FF, 0.9);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    const specularLight = new THREE.PointLight(0xFFFFFF, 1.5, 10);
    specularLight.position.set(0, 0, 2.5);
    scene.add(specularLight);

    const startTime = Date.now();

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const elapsedTime = (Date.now() - startTime) / 1000;

      frontUniforms.uTime.value = elapsedTime;
      backUniforms.uTime.value = elapsedTime;

      const lerpSpeed = touchActive.current ? 0.18 : 0.08;
      rotX.current += (targetRotX.current - rotX.current) * lerpSpeed;
      rotY.current += (targetRotY.current - rotY.current) * lerpSpeed;
      currentFlipY.current += (targetFlipY.current - currentFlipY.current) * 0.12;

      // Shine only activates when the user touches / holds / moves the card
      const targetShine = touchActive.current ? 1.0 : 0.0;
      shineIntensity.current += (targetShine - shineIntensity.current) * 0.14;

      frontUniforms.uShineIntensity.value = shineIntensity.current;
      backUniforms.uShineIntensity.value = shineIntensity.current;

      if (!touchActive.current) {
        // Resting stationary center light - completely remove auto shine sweep
        targetLightPos.current = { x: 0.5, y: 0.5 };
      }

      lightPos.current.x += (targetLightPos.current.x - lightPos.current.x) * 0.1;
      lightPos.current.y += (targetLightPos.current.y - lightPos.current.y) * 0.1;

      frontUniforms.uLightPos.value.set(lightPos.current.x, lightPos.current.y);
      backUniforms.uLightPos.value.set(lightPos.current.x, lightPos.current.y);

      specularLight.intensity = 0.2 + 1.3 * shineIntensity.current;
      specularLight.position.set(
        (lightPos.current.x - 0.5) * 3.5,
        (lightPos.current.y - 0.5) * 2.5,
        2.2
      );

      cardGroup.rotation.x = rotX.current;
      cardGroup.rotation.y = rotY.current + currentFlipY.current;
      cardGroup.rotation.z = 0;

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      renderer.dispose();
      edgeGeometry.dispose();
      faceGeometry.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      edgeMaterial.dispose();
      textTexture.dispose();
    };
  }, [height, updateCardText]);

  return (
    <View style={styles.outerContainer}>
      {/* Top Quick Actions: Privacy toggle & 3D Flip */}
      <View style={styles.topControlBar}>
        <View style={styles.editionBadge}>
          <Text style={styles.editionText}>GEKO PLATINUM</Text>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            onPress={toggleHidden}
            style={styles.actionBtn}
            activeOpacity={0.7}
            hitSlop={8}
          >
            {isHidden ? (
              <EyeOff size={14} color="#94A3B8" />
            ) : (
              <Eye size={14} color="#94A3B8" />
            )}
            <Text style={styles.actionBtnText}>{isHidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>


        </View>
      </View>

      {/* Full 3D WebGL Canvas */}
      <View
        style={[styles.canvasWrapper, { height }]}
        {...(interactive ? panResponder.panHandlers : {})}
      >
        <GLView
          style={{ width: '100%', height }}
          onContextCreate={onContextCreate}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 0,
  },
  topControlBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  editionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  editionText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  canvasWrapper: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    position: 'relative',
  },

});
