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
const CORNER_RADIUS = 0.24;

const parseColorToVec3 = (hex?: string, fallback: string = '#000000'): THREE.Vector3 => {
  const c = new THREE.Color(hex || fallback);
  return new THREE.Vector3(c.r, c.g, c.b);
};

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
  '(': [0x1C, 0x22, 0x41, 0x00, 0x00],
  ')': [0x00, 0x00, 0x41, 0x22, 0x1C],
  'A': [0x7C, 0x12, 0x11, 0x12, 0x7C],
  'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
  'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
  'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
  'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
  'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7F, 0x02, 0x04, 0x02, 0x7F],
  'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
  'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
  'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
  'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
  'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
  'W': [0x7F, 0x20, 0x10, 0x20, 0x7F],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
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
  bankName?: string;
  expiryDate?: string;
  color1?: string;
  color2?: string;
  interactive?: boolean;
  height?: number;
  cornerRadius?: number;
}

const GekoCard3DComponent: React.FC<GekoCard3DProps> = ({
  balance = 9350,
  cardholderName = 'GEKO MEMBER',
  expiryDate = '',
  accountType,
  bankName,
  color1 = '#0F172A',
  color2 = '#1E293B',
  height = 230,
  interactive = true,
  cornerRadius,
}) => {
  const { currency } = useCurrency();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isGlReady, setIsGlReady] = useState(false);

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

  // Props ref so WebGL animation frame closure always accesses fresh props
  const cardPropsRef = useRef({ color1, color2, accountType, bankName });
  useEffect(() => {
    cardPropsRef.current = { color1, color2, accountType, bankName };
  }, [color1, color2, accountType, bankName]);

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

    // Clear texture buffer before redrawing
    textDataRef.current.fill(0);

    // Draw embossed details directly onto card surface:
    // In WebGL UV coordinates: Y=0 is bottom, Y=323 is top.
    const currentBank = bankName || (accountType?.includes('DEBIT') ? accountType.split('•')[1]?.trim() : '');
    const isGeko = !currentBank || currentBank.toLowerCase().includes('geko') || currentBank.toLowerCase().includes('all') || currentBank.toLowerCase().includes('platinum');

    // 1. TOP-LEFT: Card Brand / Bank Name
    const brandStr = isGeko ? 'GEKO' : currentBank.toUpperCase();
    drawString(brandStr, 35, 250, 3);

    // 2. BOTTOM-LEFT: Balance Label & Balance Amount
    const titleText = isGeko ? 'TOTAL BALANCE' : `${currentBank.toUpperCase()} BALANCE`;
    drawString(titleText, 35, 90, 2);

    const balanceStr = isHidden ? '••••••••' : formatCurrency(balance);
    drawString(balanceStr, 35, 32, 4);

    if (textTextureRef.current) {
      textTextureRef.current.needsUpdate = true;
    }
  }, [balance, isHidden, currency, bankName, accountType]);

  useEffect(() => {
    updateCardText();
  }, [updateCardText]);

  // Touch gesture pan responder for 3D tilt & flip
  const panResponder = useMemo(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes so vertical screen scrolling is buttery-smooth
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        return isHorizontal && Math.abs(gestureState.dx) > 8;
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
        // Direct, ultra-responsive 1:1 rotation mapping (no sluggish lag delay)
        const normalizedX = gestureState.dx / 120;
        const normalizedY = gestureState.dy / 100;

        targetRotY.current = Math.max(-0.65, Math.min(0.65, normalizedX));
        targetRotX.current = Math.max(-0.50, Math.min(0.50, -normalizedY));

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
    // Polyfill getShaderPrecisionFormat to avoid Hermes crash when expo-gl returns null
    const origGetShaderPrecisionFormat = gl.getShaderPrecisionFormat ? gl.getShaderPrecisionFormat.bind(gl) : null;
    gl.getShaderPrecisionFormat = (shaderType: number, precisionType: number) => {
      try {
        const res = origGetShaderPrecisionFormat ? origGetShaderPrecisionFormat(shaderType, precisionType) : null;
        if (res && typeof res.precision === 'number') {
          return res;
        }
      } catch (e) { }
      return { rangeMin: 127, rangeMax: 127, precision: 23 };
    };

    const width = gl.drawingBufferWidth || (SCREEN_WIDTH - 40);
    const glHeight = gl.drawingBufferHeight || height;

    const scene = new THREE.Scene();

    // Camera setup: Home card (height >= 200) keeps unzoomed camera (3.2z, 68 fov), small cards use 2.30z so card fills canvas edge-to-edge without background container
    const isSmallCard = height < 200;
    const fov = isSmallCard ? 65 : 68;
    const cameraZ = isSmallCard ? 2.30 : 3.2;

    const aspect = width / glHeight;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    camera.position.set(0, 0, cameraZ);
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
    renderer.setClearColor(0x000000, 0);
    if (gl.clearColor) {
      gl.clearColor(0, 0, 0, 0);
    }

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
    const r = cornerRadius !== undefined ? cornerRadius : (isSmallCard ? 0.08 : CORNER_RADIUS);

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

    const _tempColor = new THREE.Color();
    const _targetC1 = new THREE.Vector3();
    const _targetC2 = new THREE.Vector3();

    const updateColorVec3 = (outVec: THREE.Vector3, hex?: string, fallback = '#0F172A') => {
      try {
        _tempColor.set(hex || fallback);
        outVec.set(_tempColor.r, _tempColor.g, _tempColor.b);
      } catch (e) {
        _tempColor.set(fallback);
        outVec.set(_tempColor.r, _tempColor.g, _tempColor.b);
      }
    };

    const getCardTypeInt = (accType?: string, bName?: string): number => {
      const str = `${accType || ''} ${bName || ''}`.toLowerCase();
      if (str.includes('gcash')) return 1;
      if (str.includes('gotyme')) return 2;
      if (str.includes('bpi')) return 3;
      if (str.includes('maya') || str.includes('paymaya')) return 4;
      if (str.includes('landbank')) return 5;
      if (str.includes('pnb')) return 6;
      if (str.includes('bdo')) return 7;
      if (str.includes('maribank') || str.includes('mari')) return 8;
      if (str.includes('metrobank')) return 9;
      if (str.includes('unionbank') || str.includes('unibank') || str.includes('union')) return 10;
      if (str.includes('security')) return 11;
      if (str.includes('visa')) return 12;
      if (str.includes('cash') || str.includes('pera') || str.includes('bulsa')) return 13;
      return 0;
    };

    updateColorVec3(_targetC1, color1, '#0B0F19');
    updateColorVec3(_targetC2, color2, '#1E293B');

    // Front Shader Material
    const frontUniforms = {
      uTime: { value: 0 },
      uLightPos: { value: new THREE.Vector2(0.5, 0.5) },
      uTextTexture: { value: textTexture },
      uShineIntensity: { value: 0.0 },
      uColor1: { value: _targetC1.clone() },
      uColor2: { value: _targetC2.clone() },
      uCardType: { value: getCardTypeInt(accountType, bankName) },
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
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform int uCardType;
      varying vec2 vUv;

      float sdRoundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
      }

      void main() {
        // 1. Dynamic Base Gradient
        vec3 col = mix(uColor1, uColor2, vUv.y * 0.8 + vUv.x * 0.2);

        // Brushed metal horizontal grain
        float brush = fract(sin(vUv.y * 1400.0) * 43758.5453) * 0.022;
        col += vec3(brush);

        if (uCardType == 1) {
          // ── GCASH BESPOKE 3D SHADER MOTIF (Slightly Darker Royal Navy Blue) ──
          // Concentric ripples radiating from G halo emblem (inspired by GCash Visa)
          vec2 gCenter = vec2(0.5, 0.45);
          float distG = distance(vUv, gCenter);

          float ripples = sin(distG * 42.0 - uTime * 0.15) * 0.5 + 0.5;
          float ringGlow = smoothstep(0.65, 0.05, distG);

          float gOuterRing = sdRoundedBox(vUv - gCenter, vec2(0.18, 0.18), 0.14);
          float gInnerRing = sdRoundedBox(vUv - gCenter, vec2(0.11, 0.11), 0.09);
          float gRingMask = max(smoothstep(0.005, -0.005, gOuterRing), -smoothstep(0.005, -0.005, gInnerRing));

          vec2 gLocal = vUv - gCenter;
          if (gLocal.x > 0.01 && gLocal.y > 0.01) gRingMask = 0.0;
          if (gLocal.x > 0.0 && abs(gLocal.y + 0.005) < 0.012 && gLocal.x < 0.12) gRingMask = 1.0;

          // Rich slightly darker Royal Navy Blue gradient
          vec3 gcashNavyDark = vec3(0.0, 0.16, 0.65);
          vec3 gcashBlueMid = vec3(0.0, 0.45, 0.90);

          vec3 rippleCol = mix(gcashNavyDark, gcashBlueMid, ripples * ringGlow);
          col = mix(col, rippleCol, 0.82 + ripples * 0.18);
          col = mix(col, vec3(0.85, 0.92, 1.0), gRingMask * 0.35);

        } else if (uCardType == 2) {
          // ── GOTYME REAL-WORLD BESPOKE 3D SHADER MOTIF ──
          // Sleek Dark Obsidian Top + Electric Cyan/Teal Bottom + Expanding Horizontal Line Grid & Slow Holographic Wave
          vec3 gotymeDark = vec3(0.05, 0.07, 0.10);
          vec3 gotymeCyan = vec3(0.0, 0.85, 0.82);

          // 1. Vertical Split Background (Dark Top half, Electric Cyan Bottom half)
          float cyanCoverage = smoothstep(0.48, 0.40, vUv.y);
          col = mix(gotymeDark, gotymeCyan, cyanCoverage);

          // 2. Iconic GoTyme Horizontal Stripe Transition Grid
          if (vUv.y > 0.38 && vUv.y < 0.92) {
            float lineFreq = 68.0;
            float linePattern = sin(vUv.y * lineFreq);
            // Line gaps expand as vUv.y moves higher up the card
            float lineProgress = (vUv.y - 0.38) / 0.54;
            float threshold = mix(-0.25, 0.65, lineProgress);
            float stripeMask = smoothstep(threshold, threshold + 0.08, linePattern);
            
            // Slow, ultra-smooth ambient breathing pulse on stripes
            float slowPulse = sin(uTime * 0.3) * 0.06 + 0.94;

            if (vUv.y >= 0.42) {
              col = mix(col, gotymeCyan * slowPulse, stripeMask * 0.95);
            } else {
              col = mix(col, gotymeDark, (1.0 - stripeMask) * 0.85);
            }
          }

          // 3. Ultra-Slow Holographic Laser Wave Sweep (Slow-mo Elegant Effect)
          float wavePhase = sin((vUv.x * 2.8 + vUv.y * 1.6) - uTime * 0.22) * 0.5 + 0.5;
          float holoGlow = pow(wavePhase, 4.0) * 0.28;
          vec3 holoShimmer = mix(vec3(0.0, 0.95, 0.85), vec3(0.15, 0.75, 1.0), wavePhase);
          col += holoShimmer * holoGlow;

          // 4. Smooth Specular Sheen & Light Glint
          float lightGlint = sin(vUv.x * 4.0 - uTime * 0.15) * 0.5 + 0.5;
          float gotymeSheen = smoothstep(0.22, 0.0, abs((vUv.x + vUv.y * 0.3) - (uLightPos.x + 0.1))) * (uShineIntensity + 0.35);
          col += vec3(0.25, 0.95, 0.90) * gotymeSheen * 0.38 * (0.85 + lightGlint * 0.3);

        } else if (uCardType == 3) {
          // ── BPI BESPOKE REAL-WORLD 3D SHADER MOTIF ──
          // Woven geometric 3D crimson red ribbons with golden lens flare rays & crest watermark
          
          // 1. Diagonal UV Rotation (~40 degrees)
          vec2 rotUv = vec2(
            vUv.x * 0.766 + vUv.y * 0.643,
            -vUv.x * 0.643 + vUv.y * 0.766
          );

          // 2. Intersecting Woven Diagonal Ribbons
          float ribbonScale = 14.0;
          float r1 = fract(rotUv.x * ribbonScale);
          float r2 = fract(rotUv.y * ribbonScale);

          // Bevel & depth shadow on ribbon edges
          float edge1 = smoothstep(0.0, 0.12, r1) * smoothstep(1.0, 0.88, r1);
          float edge2 = smoothstep(0.0, 0.12, r2) * smoothstep(1.0, 0.88, r2);
          float ribbonShading = mix(0.65, 1.15, edge1 * edge2);

          // Alternating woven band highlights
          float bandIndex1 = floor(rotUv.x * ribbonScale);
          float bandIndex2 = floor(rotUv.y * ribbonScale);
          float weavePattern = mod(bandIndex1 + bandIndex2, 2.0);

          vec3 bpiMaroonDark = vec3(0.24, 0.02, 0.04);   // Deep Maroon (#3D050A)
          vec3 bpiMaroonMid = vec3(0.42, 0.04, 0.08);    // Rich Maroon (#6B0A14)
          vec3 bpiMaroonSoft = vec3(0.55, 0.07, 0.11);   // Elegant Burgundy (#8C121C)

          vec3 baseRibbon = mix(bpiMaroonDark, bpiMaroonMid, weavePattern * 0.5 + 0.5);
          baseRibbon = mix(baseRibbon, bpiMaroonSoft, (vUv.x + vUv.y) * 0.3);
          col = baseRibbon * ribbonShading;

          // Drop shadow cast by overlapping ribbons
          float overlapShadow = smoothstep(0.0, 0.25, r1) * smoothstep(0.0, 0.25, r2);
          col *= 0.82 + 0.18 * overlapShadow;

          // 3. Golden Diagonal Lens Flare Rays (cutting across the maroon ribbons)
          float lightRay1 = smoothstep(0.035, 0.0, abs((vUv.x * 1.1 + vUv.y) - (0.65 + sin(uTime * 0.08) * 0.08)));
          float lightRay2 = smoothstep(0.025, 0.0, abs((vUv.x * 1.1 + vUv.y) - (1.15 + cos(uTime * 0.06) * 0.08)));
          float lightRay3 = smoothstep(0.045, 0.0, abs((vUv.x * 1.1 + vUv.y) - (0.35 - sin(uTime * 0.07) * 0.06)));

          vec3 goldRayColor = vec3(0.92, 0.78, 0.38);
          col += goldRayColor * (lightRay1 * 0.35 + lightRay2 * 0.25 + lightRay3 * 0.15);

        } else if (uCardType == 4) {
          // ── MAYA REAL-WORLD BLACK 3D SHADER MOTIF ──
          // Sleek Matte Obsidian Black + Giant 'm' Watermark & Subtle Cyber Sheen
          vec3 mayaObsidian = vec3(0.05, 0.06, 0.08);
          float mayaGrain = fract(sin(vUv.x * 927.0 + vUv.y * 531.0) * 43758.54) * 0.032;
          col = mayaObsidian + vec3(mayaGrain);

          // 1. Giant Dark Graphite 'm' Watermark Emblem (Bottom-Left)
          vec2 mPos = vUv - vec2(0.24, 0.18);
          float arch1 = sdRoundedBox(mPos - vec2(-0.07, 0.0), vec2(0.045, 0.16), 0.04);
          float arch2 = sdRoundedBox(mPos - vec2(0.07, 0.0), vec2(0.045, 0.16), 0.04);
          float mWatermark = min(arch1, arch2);
          if (mWatermark < 0.0 && vUv.y < 0.40) {
            col = mix(col, vec3(0.20, 0.22, 0.28), 0.70);
          }

          // 2. Gentle Cyber Wave Glow
          vec3 neonGreen = vec3(0.0, 0.95, 0.45);
          float cyberWave = sin(vUv.x * 8.0 + vUv.y * 5.0 - uTime * 0.12) * 0.5 + 0.5;
          col += neonGreen * cyberWave * 0.05;

          // 3. Smooth Specular Sheen Reflection
          float mayaSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * uShineIntensity;
          col += vec3(0.8, 1.0, 0.9) * mayaSheen * 0.35;

        } else if (uCardType == 5) {
          // ── LANDBANK REAL-WORLD 3D SHADER MOTIF ──
          // Dual-Tone Forest Teal to Lime Green + Overlapping Organic Leaf Arcs & Security Lines
          vec3 lbForestDark = vec3(0.0, 0.28, 0.22);
          vec3 lbLimeBright = vec3(0.42, 0.65, 0.16);
          col = mix(lbLimeBright, lbForestDark, vUv.x * 0.75 + (1.0 - vUv.y) * 0.25);

          // 1. Large Central Organic Petal Leaf Arc
          float arcCenter1 = length(vUv - vec2(-0.15, 0.25));
          float leaf1 = smoothstep(0.72, 0.71, arcCenter1);
          vec3 leaf1Color = vec3(0.14, 0.52, 0.26);
          col = mix(col, leaf1Color, leaf1 * 0.75);

          // 2. Upper-Left Lime Petal Arc
          float arcCenter2 = length(vUv - vec2(0.10, 0.95));
          float leaf2 = smoothstep(0.60, 0.59, arcCenter2);
          vec3 leaf2Color = vec3(0.48, 0.72, 0.20);
          col = mix(col, leaf2Color, leaf2 * 0.50);

          // 3. Silver/White Guilloche Security Arc Lines
          float arcBorder1 = smoothstep(0.005, 0.0, abs(arcCenter1 - 0.72));
          float arcBorder2 = smoothstep(0.004, 0.0, abs(arcCenter2 - 0.60));
          col = mix(col, vec3(0.92, 0.98, 0.92), max(arcBorder1, arcBorder2) * 0.85);

          // 4. Fine Diagonal Hatching Grain (Left Side)
          float hatch = sin((vUv.x * 0.707 + vUv.y * 0.707) * 180.0) * 0.5 + 0.5;
          col += vec3(0.06, 0.10, 0.03) * hatch * (1.0 - vUv.x) * 0.18;

          // 5. Specular Sheen Reflection
          float lbSheen = smoothstep(0.20, 0.0, abs((vUv.x + vUv.y * 0.5) - (uLightPos.x + 0.2))) * uShineIntensity;
          col += vec3(0.5, 0.9, 0.5) * lbSheen * 0.35;

        } else if (uCardType == 6) {
          // ── PNB REAL-WORLD 24K GOLD 3D SHADER MOTIF ──
          // Premium 24K Brushed Gold + Molten Liquid Gold & Champagne Wave across center
          vec3 pnbGoldDeep = vec3(0.68, 0.52, 0.15);      // Rich Bronze Gold Depth
          vec3 pnbGoldMid = vec3(0.88, 0.72, 0.28);       // 24K Gold Body
          vec3 pnbGoldBright = vec3(0.98, 0.86, 0.42);    // Champagne Gold Highlight
          
          col = mix(pnbGoldDeep, pnbGoldMid, vUv.y * 0.6 + vUv.x * 0.4);
          float goldGrain = fract(sin(vUv.x * 850.0 + vUv.y * 420.0) * 43758.54) * 0.025;
          col += vec3(goldGrain * 0.4, goldGrain * 0.35, goldGrain * 0.1);

          // Flowing Liquid Gold Wave across center (Pure Champagne & Molten Gold)
          float waveCenter = 0.48 + sin(vUv.x * 5.0 - uTime * 0.12) * 0.08 + cos(vUv.x * 9.0 + uTime * 0.05) * 0.04;
          float distToWave = abs(vUv.y - waveCenter);
          float waveRibbon = smoothstep(0.095, 0.0, distToWave);

          if (waveRibbon > 0.0) {
            // Luxurious Molten Gold & Metallic Platinum Strand Gradient
            float wavePhase = sin(vUv.x * 12.0 - uTime * 0.15) * 0.5 + 0.5;
            vec3 liquidGoldCore = mix(vec3(0.92, 0.70, 0.20), vec3(1.0, 0.92, 0.58), wavePhase);
            
            // Shimmering Platinum White Specular Strands
            float waveStrands = sin((vUv.y - waveCenter) * 110.0 + vUv.x * 20.0) * 0.5 + 0.5;
            vec3 strandColor = mix(liquidGoldCore, vec3(1.0, 0.98, 0.85), waveStrands * 0.60);

            // Soft Gold Glow Edge
            float edgeGlow = smoothstep(0.095, 0.02, distToWave);
            col = mix(col, strandColor, edgeGlow * 0.85);
          }

          // Gold Specular Light Sheen
          float goldGlint = smoothstep(0.2, 0.0, abs((vUv.x + vUv.y * 0.5) - (uLightPos.x + 0.2))) * uShineIntensity;
          col += vec3(1.0, 0.92, 0.55) * goldGlint * 0.55;

        } else if (uCardType == 7) {
          // ── BDO REAL-WORLD VIRTUAL/DEBIT 3D SHADER MOTIF ──
          // Cobalt Royal Blue + Glowing Intersecting Light Grid & Rounded Node Squares
          vec3 bdoNavyDark = vec3(0.0, 0.12, 0.42);
          vec3 bdoNavyCobalt = vec3(0.0, 0.26, 0.68);
          col = mix(bdoNavyDark, bdoNavyCobalt, vUv.y * 0.7 + vUv.x * 0.3);

          // 1. Intersecting Electric Cyan Light Grid Lines
          vec2 gridUv = vUv * vec2(7.0, 4.5);
          vec2 gridCell = fract(gridUv) - 0.5;
          float lineH = smoothstep(0.035, 0.0, abs(gridCell.y));
          float lineV = smoothstep(0.035, 0.0, abs(gridCell.x));
          float gridLines = max(lineH, lineV);

          float linePulse = sin((floor(gridUv.x) + floor(gridUv.y)) * 0.4 - uTime * 0.12) * 0.5 + 0.5;
          vec3 cyanGlow = vec3(0.35, 0.78, 1.0);
          col += cyanGlow * gridLines * (0.30 + linePulse * 0.25);

          // 2. Glowing Floating Rounded Node Squares (matching real BDO Virtual card)
          vec2 sqPos1 = fract(vUv * vec2(4.5, 3.0) + vec2(0.1, 0.15)) - 0.5;
          float dSq1 = sdRoundedBox(sqPos1, vec2(0.22, 0.22), 0.07);
          float borderSq1 = smoothstep(0.018, 0.0, abs(dSq1));

          vec2 sqPos2 = fract(vUv * vec2(3.5, 2.2) + vec2(0.6, 0.4)) - 0.5;
          float dSq2 = sdRoundedBox(sqPos2, vec2(0.26, 0.26), 0.08);
          float borderSq2 = smoothstep(0.018, 0.0, abs(dSq2));

          float allSqBorders = max(borderSq1, borderSq2);
          float sqPulse = sin(vUv.x * 5.0 + vUv.y * 4.0 - uTime * 0.10) * 0.5 + 0.5;
          col += cyanGlow * allSqBorders * (0.35 + sqPulse * 0.30);

          // 3. Luminous Intersection Node Flares (Light points at grid junctions)
          float nodeDist = length(gridCell);
          float nodeFlare = pow(max(0.0, 0.35 - nodeDist), 2.8) * 10.0;
          float flarePulse = 0.65 + 0.35 * sin(floor(gridUv.x) * 2.5 + floor(gridUv.y) * 1.8 + uTime * 0.14);
          vec3 nodeWhite = vec3(0.92, 0.96, 1.0);
          col += nodeWhite * nodeFlare * flarePulse * 0.55;

          // 4. Smooth Specular Sheen
          float bdoGlint = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * uShineIntensity;
          col += vec3(0.4, 0.8, 1.0) * bdoGlint * 0.35;

        } else if (uCardType == 8) {
          // ── MARIBANK BESPOKE 3D SHADER MOTIF ──
          // 1. Rich Deep Crimson-Coral to Sunset Tangerine Liquid Gradient
          vec3 mariDeepCrimson = vec3(0.48, 0.06, 0.02);
          vec3 mariSunsetOrange = vec3(0.98, 0.32, 0.06);
          vec3 mariGoldenPeach = vec3(1.00, 0.58, 0.20);

          float gradMix = vUv.y * 0.65 + vUv.x * 0.35;
          col = mix(mariDeepCrimson, mariSunsetOrange, gradMix);

          // 2. Flowing Fluid Metallic Waves across top-right region
          vec2 waveUv = vUv * vec2(1.586, 1.0);
          float wave1 = sin(waveUv.x * 7.0 - waveUv.y * 4.0 + uTime * 0.3) * 0.5 + 0.5;
          float wave2 = cos(waveUv.x * 11.0 + waveUv.y * 6.0 - uTime * 0.2) * 0.5 + 0.5;
          float fluidWave = smoothstep(0.35, 0.65, wave1 * 0.6 + wave2 * 0.4);

          float rightRegion = smoothstep(0.25, 0.95, vUv.x + vUv.y * 0.4);
          col = mix(col, mariGoldenPeach, fluidWave * rightRegion * 0.38);

          // 3. Micro-Guilloche Curved Ribbon Pinstripes
          float ribbon = sin((vUv.x * 16.0 + sin(vUv.y * 12.0 + uTime * 0.2) * 2.0)) * 0.5 + 0.5;
          float ribbonMask = smoothstep(0.48, 0.52, ribbon);
          vec3 goldSpecular = vec3(1.0, 0.88, 0.50);
          col = mix(col, goldSpecular, ribbonMask * rightRegion * 0.18);

          // 4. Outer Metallic Pinstripe Border Frame
          vec2 framePos = vUv - vec2(0.5, 0.5);
          float dFrame = sdRoundedBox(framePos, vec2(0.47, 0.45), 0.04);
          float pinstripe = smoothstep(0.003, 0.0, abs(dFrame));
          col = mix(col, vec3(1.0, 0.82, 0.40), pinstripe * 0.55);

          // 5. Dynamic Interactive Golden Sunburst Reflection
          float sunGlint = smoothstep(0.30, 0.0, length(vUv - uLightPos)) * uShineIntensity;
          col += vec3(1.0, 0.85, 0.50) * sunGlint * 0.45;

        } else if (uCardType == 9) {
          // ── METROBANK BESPOKE 3D SHADER MOTIF ──
          // Royal Sapphire Blue + Diamond Crystal Lattice Matrix
          vec3 mbBlueDark = vec3(0.0, 0.14, 0.48);
          vec3 mbBlueLight = vec3(0.0, 0.32, 0.85);
          col = mix(mbBlueDark, mbBlueLight, vUv.y * 0.8 + vUv.x * 0.2);

          vec2 mbGrid = vUv * vec2(24.0, 15.0);
          vec2 fGrid = fract(mbGrid) - 0.5;
          float diamond = abs(fGrid.x) + abs(fGrid.y);
          float diamondMask = smoothstep(0.42, 0.36, diamond);
          vec3 mbGold = vec3(1.0, 0.82, 0.25);
          col = mix(col, mbGold, diamondMask * 0.35);

        } else if (uCardType == 10) {
          // ── UNIBANK / UNIONBANK REAL-WORLD VISA INFINITE BLACK 3D SHADER MOTIF ──
          // Deep Onyx Black + Engraved Metallic Gold Roman Vault Architectural Arches & Pillars
          vec3 ubOnyxDark = vec3(0.04, 0.04, 0.06);
          float ubStipple = fract(sin(vUv.x * 780.0 + vUv.y * 420.0) * 43758.54) * 0.025;
          col = ubOnyxDark + vec3(ubStipple);

          // 1. Classical Architectural Vault Arches (Right & Center)
          vec2 archC1 = vUv - vec2(0.55, 0.28);
          float dA1 = abs(length(archC1) - 0.38);
          float archLine1 = smoothstep(0.006, 0.0, dA1);

          vec2 archC2 = vUv - vec2(0.82, 0.28);
          float dA2 = abs(length(archC2) - 0.32);
          float archLine2 = smoothstep(0.006, 0.0, dA2);

          vec2 archC3 = vUv - vec2(0.32, 0.28);
          float dA3 = abs(length(archC3) - 0.44);
          float archLine3 = smoothstep(0.006, 0.0, dA3);

          // 2. Pillar Column Lines
          float colLeft = smoothstep(0.005, 0.0, abs(vUv.x - 0.72));
          float colRight = smoothstep(0.005, 0.0, abs(vUv.x - 0.92));
          float colMid = smoothstep(0.005, 0.0, abs(vUv.x - 0.38));

          // 3. Detailed Vault Filigree Line Work
          float filigree1 = sin((vUv.x * 0.707 + vUv.y * 0.707) * 140.0) * 0.5 + 0.5;
          float filigree2 = sin((-vUv.x * 0.707 + vUv.y * 0.707) * 140.0) * 0.5 + 0.5;
          float filigreeHatch = smoothstep(0.35, 0.65, filigree1 * filigree2);

          float allArches = max(max(archLine1, archLine2), max(archLine3, max(colLeft, colRight)));
          float archRegion = smoothstep(0.20, 0.98, vUv.x) * smoothstep(0.12, 0.98, vUv.y);

          // Metallic UnionBank Orange Engraving
          vec3 ubOrange = mix(vec3(0.95, 0.42, 0.05), vec3(1.0, 0.65, 0.15), (vUv.x + vUv.y) * 0.5);
          float orangeGlow = 0.75 + 0.25 * sin(vUv.x * 8.0 - uTime * 0.10);
          col = mix(col, ubOrange * orangeGlow, (allArches + filigreeHatch * archRegion * 0.50) * 0.85);

          // 4. Vibrant Orange Square Badge Logo (Top-Left)
          vec2 bPos = vUv - vec2(0.12, 0.82);
          float dBadge = sdRoundedBox(bPos, vec2(0.038, 0.038), 0.008);
          if (abs(dBadge) < 0.003) {
            col = mix(col, ubOrange, 0.90);
          }

          // 5. Specular Sheen Reflection
          float ubSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * uShineIntensity;
          col += vec3(1.0, 0.55, 0.15) * ubSheen * 0.40;

        } else if (uCardType == 11) {
          // ── SECURITY BANK BESPOKE 3D SHADER MOTIF ──
          // Deep Forest Teal & Gold + Security Guilloche Lattice
          vec3 secTealDark = vec3(0.0, 0.28, 0.30);
          vec3 secTealLight = vec3(0.0, 0.52, 0.55);
          col = mix(secTealDark, secTealLight, vUv.y * 0.8 + vUv.x * 0.2);

          float secLattice = sin(vUv.x * 35.0 + vUv.y * 35.0) * cos(vUv.x * 35.0 - vUv.y * 35.0);
          vec3 secGold = vec3(0.95, 0.80, 0.30);
          col = mix(col, secGold, smoothstep(0.2, 0.8, secLattice) * 0.30);

        } else if (uCardType == 12) {
          // ── VISA REAL-WORLD 3D SHADER MOTIF ──
          // Deep Royal Cobalt Blue with halftone security matrix & golden glint
          vec3 visaNavyDark = vec3(0.0, 0.16, 0.58);
          vec3 visaNavyBright = vec3(0.0, 0.38, 0.88);
          col = mix(visaNavyDark, visaNavyBright, vUv.y * 0.7 + vUv.x * 0.3);

          // Halftone Dot Security Matrix
          vec2 grid = vec2(52.0, 32.0);
          vec2 fCell = fract(vUv * grid) - 0.5;
          vec2 cellCenter = (floor(vUv * grid) + 0.5) / grid;
          float distToLight = length(cellCenter - uLightPos);
          float matrixGlow = pow(max(0.0, 1.0 - distToLight * 1.2), 3.0);
          float dotRadius = mix(0.08, 0.38, matrixGlow);
          float dotMask = smoothstep(dotRadius, dotRadius - 0.05, length(fCell));
          vec3 dotCol = mix(vec3(0.2, 0.5, 0.95), vec3(0.7, 0.88, 1.0), matrixGlow);
          col = mix(col, dotCol, dotMask * 0.45);

          // Specular Sheen Reflection
          float visaSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * uShineIntensity;
          col += vec3(0.6, 0.85, 1.0) * visaSheen * 0.40;

        } else if (uCardType == 13) {
          // ── EXACT 3D BIFOLD PURE BLACK WALLET WITH GOLD BUTTON SNAP & TOP CARDS ──
          // Inspired by 3D bifold onyx black wallet with top cards poking out & yellow snap button
          
          vec3 walletCharcoalDark = vec3(0.04, 0.04, 0.05);  // Pure Onyx Black (#0A0A0D)
          vec3 walletCharcoalMid = vec3(0.09, 0.09, 0.11);   // Sleek Soft Black (#17171C)
          vec3 walletStitchColor = vec3(0.01, 0.01, 0.02);   // Dark Inset Seam
          vec3 goldButtonColor = vec3(0.96, 0.65, 0.12);     // Gold/Yellow Snap Button (#F59E0B)
          vec3 cardDarkColor = vec3(0.07, 0.07, 0.09);       // Dark Top Card Body (#121217)
          vec3 cardGoldTab = vec3(0.98, 0.74, 0.18);         // Gold Rectangular Tab (#FBBF24)

          // Background outside top cards & wallet
          col = mix(walletCharcoalDark, walletCharcoalMid, vUv.y * 0.6 + 0.2);

          // 1. TOP CARDS STICKING OUT FROM WALLET POCKET (vUv.y > 0.64)
          if (vUv.y > 0.64) {
            // Card 1 (Back Left Angled Card)
            vec2 c1Center = vec2(0.48, 0.78);
            vec2 c1Rot = vec2(
              (vUv.x - c1Center.x) * 0.92 - (vUv.y - c1Center.y) * 0.38,
              (vUv.x - c1Center.x) * 0.38 + (vUv.y - c1Center.y) * 0.92
            );
            float dCard1 = sdRoundedBox(c1Rot, vec2(0.24, 0.18), 0.04);

            // Card 2 (Front Right Angled Card)
            vec2 c2Center = vec2(0.62, 0.74);
            vec2 c2Rot = vec2(
              (vUv.x - c2Center.x) * 0.97 - (vUv.y - c2Center.y) * 0.22,
              (vUv.x - c2Center.x) * 0.22 + (vUv.y - c2Center.y) * 0.97
            );
            float dCard2 = sdRoundedBox(c2Rot, vec2(0.22, 0.16), 0.04);

            if (dCard1 < 0.0) {
              col = cardDarkColor;
              // Gold Rectangular Chip Tab on Card 1
              float dTab1 = sdRoundedBox(c1Rot - vec2(0.08, 0.08), vec2(0.05, 0.022), 0.008);
              if (dTab1 < 0.0) col = cardGoldTab;
            }

            if (dCard2 < 0.0) {
              col = cardDarkColor * 1.1;
              // Gold Rectangular Chip Tab on Card 2
              float dTab2 = sdRoundedBox(c2Rot - vec2(0.06, 0.06), vec2(0.05, 0.022), 0.008);
              if (dTab2 < 0.0) col = cardGoldTab;
            }
          }

          // 2. MAIN 3D BIFOLD WALLET BODY (vUv.y <= 0.72)
          vec2 walletCenter = vec2(0.46, 0.36);
          float dWallet = sdRoundedBox(vUv - walletCenter, vec2(0.44, 0.34), 0.08);

          if (vUv.y <= 0.72) {
            // Soft rounded 3D clay lighting gradient on wallet body
            float clayShade = smoothstep(-0.35, 0.35, vUv.x) * 0.25 + smoothstep(-0.25, 0.25, vUv.y) * 0.15;
            vec3 walletBodyCol = mix(walletCharcoalDark, walletCharcoalMid, 0.5 + clayShade);

            // Top Wallet Opening Pocket Edge Shadow
            float topEdgeShadow = smoothstep(0.72, 0.65, vUv.y);
            walletBodyCol *= mix(0.75, 1.0, topEdgeShadow);

            col = walletBodyCol;

            // 3. Dotted Stitching Seam Line (running along right and bottom edge)
            float dStitchBorder = abs(dWallet + 0.035);
            if (dStitchBorder < 0.004 && (vUv.x > 0.40 || vUv.y < 0.25)) {
              float dashPattern = sin((vUv.x + vUv.y) * 160.0);
              if (dashPattern > 0.1) {
                col = walletStitchColor;
              }
            }
          }

          // 4. RIGHT LEATHER CLOSURE STRAP & GOLD SNAP BUTTON
          vec2 strapPos = vUv - vec2(0.85, 0.42);
          float dStrap = sdRoundedBox(strapPos, vec2(0.11, 0.09), 0.045);
          if (dStrap < 0.0) {
            col = mix(walletCharcoalDark, walletCharcoalMid, (strapPos.y + 0.09) / 0.18);
            // Strap edge outline bevel
            float strapBevel = smoothstep(-0.005, 0.0, dStrap);
            col = mix(col, vec3(0.08, 0.08, 0.10), strapBevel * 0.4);

            // Gold Circular Snap Button
            float dButton = length(strapPos - vec2(0.015, 0.0));
            if (dButton < 0.038) {
              float buttonSpec = smoothstep(0.038, 0.0, dButton);
              col = mix(goldButtonColor * 0.75, goldButtonColor, buttonSpec);
              // Inner highlight dot
              if (length(strapPos - vec2(0.005, 0.01)) < 0.012) {
                col += vec3(0.2, 0.2, 0.1);
              }
            }
          }

          // Specular Soft Sheen
          float softSheen = smoothstep(0.30, 0.0, length(vUv - uLightPos)) * (uShineIntensity + 0.20);
          col += vec3(0.25, 0.25, 0.30) * softSheen * 0.25;

        } else {
          // ── DEFAULT GEKO PLATINUM 3D SHADER MOTIF ──
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
        }

        // 3. EMV Smart Chip (Mid-Left) - Only for card assets, disabled for Cash Wallet
        if (uCardType != 13) {
          vec2 chipCenter = vec2(0.165, 0.54);
          vec2 chipHalfSize = vec2(0.062, 0.085);
          float dChip = sdRoundedBox(vUv - chipCenter, chipHalfSize, 0.015);
          float chipMask = smoothstep(0.002, -0.002, dChip);

          if (chipMask > 0.0) {
            vec3 chipGrad = mix(vec3(0.84, 0.80, 0.70), vec3(0.96, 0.93, 0.84), (vUv.y - (chipCenter.y - chipHalfSize.y)) / (chipHalfSize.y * 2.0));
            vec2 chipLocal = vUv - chipCenter;
            float grooveH = smoothstep(0.0025, 0.0, abs(chipLocal.y));
            float grooveV1 = smoothstep(0.0025, 0.0, abs(chipLocal.x + chipHalfSize.x * 0.5));
            float grooveV2 = smoothstep(0.0025, 0.0, abs(chipLocal.x - chipHalfSize.x * 0.5));
            float centerPad = sdRoundedBox(chipLocal, chipHalfSize * 0.4, 0.006);
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
        }

        // 4. Contactless / NFC Wave - Disabled for Cash Wallet
        if (uCardType != 13) {
          vec2 nfcCenter = vec2(0.250, 0.54);
          vec2 nfcDelta = vUv - nfcCenter;
          float nfcDist = length(nfcDelta);
          if (nfcDelta.x > 0.002 && abs(nfcDelta.y) < nfcDelta.x * 1.3) {
            float arc1 = smoothstep(0.0035, 0.0, abs(nfcDist - 0.014));
            float arc2 = smoothstep(0.0035, 0.0, abs(nfcDist - 0.026));
            float arc3 = smoothstep(0.0035, 0.0, abs(nfcDist - 0.038));
            float arc4 = smoothstep(0.0035, 0.0, abs(nfcDist - 0.050));
            float nfcTotal = max(max(arc1, arc2), max(arc3, arc4));
            col = mix(col, vec3(0.85, 0.88, 0.94), nfcTotal * 0.9);
          }
        }

        // 6. Mastercard Red & Yellow Interlocking Circles Emblem (Disabled for Cash Wallet)
        if (uCardType != 13) {
          vec2 mcPos = (vUv - vec2(0.84, 0.14)) * vec2(1.586, 1.0);
          float radius = 0.070;
          float dLeft = length(mcPos - vec2(-0.038, 0.0)) - radius;
          float dRight = length(mcPos - vec2(0.038, 0.0)) - radius;

          vec3 mcRed = vec3(0.92, 0.04, 0.11);    // Mastercard Red (#EB001B)
          vec3 mcYellow = vec3(0.97, 0.62, 0.10); // Mastercard Yellow (#F79E1B)
          vec3 mcOrange = vec3(0.95, 0.33, 0.08); // Interlocking Overlap Orange (#FF5F00)

          float maskLeft = smoothstep(0.003, -0.003, dLeft);
          float maskRight = smoothstep(0.003, -0.003, dRight);

          if (maskLeft > 0.0 || maskRight > 0.0) {
            if (maskLeft > 0.0 && maskRight > 0.0) {
              col = mix(col, mcOrange, max(maskLeft, maskRight));
            } else if (maskLeft > 0.0) {
              col = mix(col, mcRed, maskLeft);
            } else {
              col = mix(col, mcYellow, maskRight);
            }
          }
        }

        // 7. EMBOSSED CARD BALANCE & DETAILS (Rendered directly ON the physical card!)
        vec4 textSample = texture2D(uTextTexture, vUv);
        if (textSample.a > 0.05) {
          vec3 textColor;
          if (uCardType == 6) {
            // PNB Gold Visa: Deep obsidian / navy black embossed lettering for contrast on Gold
            textColor = vec3(0.08, 0.06, 0.02);
          } else if (uCardType == 2 && vUv.y < 0.40) {
            // GoTyme: Sleek dark obsidian lettering on bottom electric cyan half (matching real card)
            textColor = vec3(0.06, 0.08, 0.12);
          } else {
            // Crisp bright white embossed lettering with specular gleam (GCash, BPI, BDO, GoTyme top, MariBank, etc.)
            vec3 textWhite = mix(vec3(0.95, 0.97, 1.0), vec3(1.0, 1.0, 1.0), vUv.y);
            float textLightDist = length(vUv - uLightPos);
            float textGlint = pow(max(0.0, 1.0 - textLightDist * 1.5), 14.0) * 1.1;
            textWhite += vec3(textGlint);
            textColor = textWhite;
          }
          col = mix(col, textColor, textSample.a);
        }

        // 8. Dynamic Shining Silver Light Sweep (only visible when held/moved)
        float sweepCoord = vUv.x + vUv.y * 0.45;
        float sweepCenter = uLightPos.x * 1.4 + 0.1;
        float sweep = smoothstep(0.24, 0.0, abs(sweepCoord - sweepCenter)) * uShineIntensity;
        
        vec3 holoRainbow = 0.5 + 0.5 * cos(6.28318 * (sweepCoord * 1.5 + uTime * 0.25 + vec3(0.0, 0.33, 0.67)));
        vec3 pureSilverSheen = vec3(0.96, 0.98, 1.0) * sweep * 0.5;
        vec3 holographicGleam = holoRainbow * sweep * 0.22;
        
        col += pureSilverSheen + holographicGleam;

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
      uColor1: { value: parseColorToVec3(color1, '#0B0F19') },
      uColor2: { value: parseColorToVec3(color2, '#1E293B') },
    };

    const backFragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uLightPos;
      uniform float uShineIntensity;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      varying vec2 vUv;

      float sdRoundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
      }

      void main() {
        vec3 col = mix(uColor1, uColor2, vUv.y * 0.8 + vUv.x * 0.2);

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
      const elapsedTime = (Date.now() - startTime) / 1000;

      frontUniforms.uTime.value = elapsedTime;
      backUniforms.uTime.value = elapsedTime;

      const { color1: curC1, color2: curC2, accountType: curAcc, bankName: curBnk } = cardPropsRef.current;
      updateColorVec3(_targetC1, curC1, '#0B0F19');
      updateColorVec3(_targetC2, curC2, '#1E293B');

      if (interactive) {
        frontUniforms.uColor1.value.lerp(_targetC1, 0.14);
        frontUniforms.uColor2.value.lerp(_targetC2, 0.14);
      } else {
        frontUniforms.uColor1.value.copy(_targetC1);
        frontUniforms.uColor2.value.copy(_targetC2);
      }
      frontUniforms.uCardType.value = getCardTypeInt(curAcc, curBnk);

      backUniforms.uColor1.value.copy(frontUniforms.uColor1.value);
      backUniforms.uColor2.value.copy(frontUniforms.uColor2.value);

      if (interactive) {
        const lerpSpeed = touchActive.current ? 0.48 : 0.14;
        rotX.current += (targetRotX.current - rotX.current) * lerpSpeed;
        rotY.current += (targetRotY.current - rotY.current) * lerpSpeed;
        currentFlipY.current += (targetFlipY.current - currentFlipY.current) * 0.16;

        const targetShine = touchActive.current ? 1.0 : 0.0;
        shineIntensity.current += (targetShine - shineIntensity.current) * 0.20;

        if (!touchActive.current) {
          targetLightPos.current = { x: 0.5, y: 0.5 };
        }

        lightPos.current.x += (targetLightPos.current.x - lightPos.current.x) * 0.18;
        lightPos.current.y += (targetLightPos.current.y - lightPos.current.y) * 0.18;
      } else {
        rotX.current = 0;
        rotY.current = 0;
        currentFlipY.current = 0;
        shineIntensity.current = 0;
        lightPos.current = { x: 0.5, y: 0.5 };
      }

      frontUniforms.uShineIntensity.value = shineIntensity.current;
      backUniforms.uShineIntensity.value = shineIntensity.current;

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
      setIsGlReady(true);

      // Only continue frame loop if card is interactive (interactive = true)
      if (interactive) {
        animFrameId.current = requestAnimationFrame(animate);
      }
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
  }, [height, color1, color2, accountType, bankName, updateCardText, cornerRadius]);

  const isSmallCard = height < 200;
  const isCashCard = (bankName || '').toLowerCase().includes('cash') || (accountType || '').toLowerCase().includes('cash');
  const wrapperBg = 'transparent';
  const glOpacity = isSmallCard ? (isGlReady ? 1 : 0) : 1;

  return (
    <View style={styles.outerContainer}>
      {/* Full 3D WebGL Canvas */}
      <View
        style={[styles.canvasWrapper, { height, backgroundColor: wrapperBg, borderRadius: isSmallCard ? 12 : 24 }]}
        {...(interactive ? panResponder.panHandlers : {})}
      >
        <GLView
          style={{
            width: '100%',
            height,
            backgroundColor: 'transparent',
            opacity: glOpacity,
          }}
          onContextCreate={onContextCreate}
        />
      </View>
    </View>
  );
};

export const GekoCard3D = React.memo(GekoCard3DComponent);

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  canvasWrapper: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
  },
});
