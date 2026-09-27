import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  Image,
} from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { RotateCw, Eye, EyeOff } from 'lucide-react-native';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../hooks/useCurrency';
import { getBankTheme } from '../../utils/bankThemes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Polyfill minimal global document for Hermes & Three.js ──
if (typeof (global as any).document === 'undefined') {
  (global as any).document = {
    createElement: (tag: string) => ({
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    createElementNS: (_ns: string, tag: string) => (global as any).document.createElement(tag),
  };
}
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

// High-resolution bitmap patterns for official italicized VISA logo rasterization
const VISA_GLYPHS: Record<string, string[]> = {
  V: [
    '11111000001111', // Top row with iconic left serif/wing
    '11111000001111',
    '01111000011110',
    '01111000011110',
    '00111000111100',
    '00111000111100',
    '00011101111000',
    '00011101111000',
    '00001111110000',
    '00001111110000',
    '00000111100000',
    '00000111100000',
    '00000011000000',
    '00000011000000',
  ],
  I: [
    '1111111111',
    '1111111111',
    '0001111000',
    '0001111000',
    '0001111000',
    '0001111000',
    '0001111000',
    '0001111000',
    '0001111000',
    '0001111000',
    '0001111000',
    '0001111000',
    '1111111111',
    '1111111111',
  ],
  S: [
    '01111111110',
    '11111111111',
    '11100000111',
    '11100000000',
    '11111111000',
    '01111111100',
    '00011111110',
    '00000000111',
    '00000000111',
    '11100000111',
    '11100000111',
    '11111111111',
    '11111111110',
    '01111111100',
  ],
  A: [
    '000001100000',
    '000001100000',
    '000011110000',
    '000011110000',
    '000110011000',
    '000110011000',
    '001111111100',
    '001111111100',
    '011100001110',
    '011100001110',
    '111000000111',
    '111000000111',
    '111000000111',
    '111000000111',
  ],
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
  paymentNetwork?: 'VISA' | 'MASTERCARD' | 'OTHER';
}

const GekoCard3DComponent: React.FC<GekoCard3DProps> = ({
  balance = 9350,
  cardholderName = 'GEKO MEMBER',
  expiryDate = '10/29',
  accountType,
  bankName,
  color1 = '#0F172A',
  color2 = '#1E293B',
  height = 230,
  interactive = true,
  cornerRadius,
  paymentNetwork,
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
  const cardPropsRef = useRef({ color1, color2, accountType, bankName, paymentNetwork });
  useEffect(() => {
    cardPropsRef.current = { color1, color2, accountType, bankName, paymentNetwork };
  }, [color1, color2, accountType, bankName, paymentNetwork]);

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

    const drawVisaLogo = (startX: number, startY: number, scale: number) => {
      let cx = startX;
      const word = ['V', 'I', 'S', 'A'];
      for (const ch of word) {
        const charRows = VISA_GLYPHS[ch];
        if (!charRows) continue;
        const numRows = charRows.length;
        for (let r = 0; r < numRows; r++) {
          const rowStr = charRows[numRows - 1 - r];
          const slant = Math.round((r / (numRows - 1)) * 3 * scale);
          for (let c = 0; c < rowStr.length; c++) {
            if (rowStr[c] === '1') {
              for (let sx = 0; sx < scale; sx++) {
                for (let sy = 0; sy < scale; sy++) {
                  const px = cx + c * scale + slant + sx;
                  const py = startY + r * scale + sy;
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
        const maxColWidth = charRows[0].length;
        cx += (maxColWidth + 2) * scale;
      }
    };

    // Clear texture buffer before redrawing
    textDataRef.current.fill(0);

    // Draw embossed details directly onto card surface:
    // In WebGL UV coordinates: Y=0 is bottom, Y=323 is top.
    const currentBank = bankName || (accountType?.includes('DEBIT') ? accountType.split('•')[1]?.trim() : '');
    const theme = getBankTheme(currentBank || accountType || bankName || '');
    const effectiveNetwork = paymentNetwork || theme.network;
    const isVisa = effectiveNetwork === 'VISA' || (currentBank && currentBank.toLowerCase().includes('visa')) || (accountType && accountType.toLowerCase().includes('visa'));

    const isGeko = !currentBank || currentBank.toUpperCase() === 'GEKO' || accountType?.toUpperCase().includes('GEKO') || (!bankName && !accountType);
    const startX = 42; // Sleek left margin away from the rounded edge

    if (isGeko) {
      // ── Authentic Iconic Geko Platinum Layout ──
      drawString('TOTAL CASH BALANCE', startX, 155, 2);
      const balanceStr = isHidden ? '••••••••' : formatCurrency(balance);
      drawString(balanceStr, startX, 96, 4);

      // Bottom: Cardholder Name (Bottom-Left) & Expiry Date (Bottom-Right)
      drawString(cardholderName || 'GEKO MEMBER', startX, 25, 2);
      drawString(expiryDate || '10/29', 395, 25, 2);

      if (isVisa) {
        drawVisaLogo(365, 140, 2);
      }
    } else {
      // ── Bespoke Bank / Credit Card Layout ──
      // 1. TOP-LEFT: Card Brand / Bank Name (shifted slightly to the left)
      const brandStr = currentBank.toUpperCase();
      const brandScale = brandStr.length > 25 ? 1 : brandStr.length > 17 ? 2 : 3;
      drawString(brandStr, startX, 250, brandScale);

      // 2. BOTTOM-LEFT: Balance Label & Balance Amount (shifted slightly to the left)
      const isCredit = accountType === 'CREDIT_CARD' || currentBank.toLowerCase().includes('credit');
      const titleText = isCredit ? 'OUTSTANDING BALANCE' : 'BALANCE';
      drawString(titleText, startX, 90, 2);

      const balanceStr = isHidden ? '••••••••' : formatCurrency(balance);
      const balScale = balanceStr.length > 12 ? 3 : 4;
      drawString(balanceStr, startX, 32, balScale);

      // 3. BOTTOM-RIGHT: Payment Network Logo (VISA) (shifted slightly to the right)
      if (isVisa) {
        drawVisaLogo(365, 30, 2);
      }
    }

    if (textTextureRef.current) {
      textTextureRef.current.needsUpdate = true;
    }
  }, [balance, isHidden, cardholderName, expiryDate, currency, bankName, accountType, paymentNetwork]);

  useEffect(() => {
    updateCardText();
  }, [updateCardText]);

  // Touch gesture pan responder for 3D tilt & flip
  const panResponder = useMemo(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => interactive,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!interactive) return false;
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderTerminationRequest: (_, gestureState) => {
        // Seamlessly allow parent ScrollView to scroll if gesture is predominantly vertical
        if (Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.3 && Math.abs(gestureState.dy) > 8) {
          return true;
        }
        return false;
      },
      onPanResponderGrant: (evt) => {
        touchActive.current = true;
        startX = evt.nativeEvent.locationX;
        startY = evt.nativeEvent.locationY;
        startTime = Date.now();

        const nx = Math.max(0, Math.min(1, startX / SCREEN_WIDTH));
        const ny = Math.max(0, Math.min(1, 1.0 - startY / height));
        targetLightPos.current = { x: nx, y: ny };
      },
      onPanResponderMove: (_, gestureState) => {
        touchActive.current = true;
        // Buttery-smooth weighted 3D tilt mapping
        const normalizedX = gestureState.dx / 180;
        const normalizedY = gestureState.dy / 140;

        // Elegant physical tilt angle limits (max ~20° Y, ~14° X) to prevent edge clipping
        targetRotY.current = Math.max(-0.35, Math.min(0.35, normalizedX));
        targetRotX.current = Math.max(-0.24, Math.min(0.24, -normalizedY));

        const curX = startX + gestureState.dx;
        const curY = startY + gestureState.dy;
        targetLightPos.current = {
          x: Math.max(0, Math.min(1, curX / SCREEN_WIDTH)),
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
  }, [flipCard, height, interactive]);

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

    // Camera setup:
    // Small cards (height < 200) use 2.30z to fill edge-to-edge.
    // Full-size Home card uses fov 46 and baseCameraZ calculated to maintain exact wide width (~93%)
    const isSmallCard = height < 200;
    const fov = isSmallCard ? 65 : 46;
    const aspect = width / glHeight;

    let baseCameraZ = 2.30;
    if (!isSmallCard) {
      // Calculate base camera distance so the 3D card (CARD_WIDTH_3D = 4.8) occupies ~93% of the canvas width
      const fillFractionX = 0.93;
      const tanHalfFov = Math.tan((fov * Math.PI) / 360);
      baseCameraZ = CARD_WIDTH_3D / (2 * fillFractionX * tanHalfFov * aspect);
    }

    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    camera.position.set(0, 0, baseCameraZ);
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

    const getNetworkInt = (net?: string, accType?: string, bName?: string): number => {
      const str = `${net || ''} ${accType || ''} ${bName || ''}`.toLowerCase();
      if (str.includes('geko') || (!net && !accType && !bName)) return 0;
      if (net === 'OTHER') return 0;
      // Physical cash / non-card wallets have no card payment network logo
      const isPhysicalCash = !str.includes('gcash') && (/\bcash\b/i.test(str) || str.includes('pera') || str.includes('bulsa'));
      if (isPhysicalCash) return 0;
      // Prepaid RFID and Membership cards have no payment network logo
      if (
        str.includes('autosweep') ||
        str.includes('easytrip') ||
        str.includes('starbucks') ||
        str.includes('landers') ||
        str.includes('mercury') ||
        str.includes('puregold') ||
        str.includes('robinsons') ||
        str.includes('smac') ||
        str.includes('bistro') ||
        str.includes('national') ||
        str.includes('cliqq') ||
        str.includes('7-eleven') ||
        str.includes('7eleven') ||
        str.includes('cebuana') ||
        str.includes('beep')
      ) return 0;
      if (net === 'VISA' || str.includes('visa')) return 2;
      if (net === 'MASTERCARD' || str.includes('mastercard') || str.includes('mc')) return 1;
      return 2;
    };

    const getCardTypeInt = (accType?: string, bName?: string): number => {
      const str = `${accType || ''} ${bName || ''}`.toLowerCase();

      // 1. Default GEKO Card (checked first so it never conflicts with keywords)
      if (str.includes('geko') || (!accType && !bName) || (bName && bName.toLowerCase() === 'geko')) return 0;

      // 2. GCash E-Wallet STRICTLY CHECKED FIRST (Never, ever treat GCash as physical cash!)
      if (str.includes('gcash')) {
        if (str.includes('black')) return 22; // GCash Black Edition Tech Hazard
        return 1; // GCash Classic Blue ripples
      }

      // 3. E-wallets and Fintech
      if (str.includes('zed')) return 21; // ZED Electric Yellow Cyber Lightning
      if (str.includes('gotyme')) return 2; // GoTyme
      if (str.includes('maya') || str.includes('paymaya')) return 4; // Maya
      if (str.includes('luvit')) return 33; // Luvit Neon Ribbon Loop
      if (str.includes('palawan')) return 32; // PalawanPay Solar Geodesic Lattice
      if (str.includes('paypal')) return 31; // PayPal Dynamic Dual Flow Waves
      if (str.includes('wise')) return 18; // Wise Electric Lime & Giant Faded '7' Arrow
      if (str.includes('grab')) return 48; // GrabPay Emerald Green
      if (str.includes('paymongo')) return 18;
      if (str.includes('shopee') || str.includes('maribank') || str.includes('seabank')) return 8;

      // 4. Digital Banks
      if (str.includes('cimb')) return 38; // CIMB 3D Intertwined Tubular Ribbons
      if (str.includes('salmon')) return 27; // Salmon Sunset Strata Dunes
      if (str.includes('komo')) return 26; // Komo Electric Turquoise Curves
      if (str.includes('tonik')) return 25; // Tonik Ultraviolet Neon Pulse
      if (str.includes('ownbank')) return 34; // OwnBank Kinetic Ascending Arcs
      if (str.includes('diskartech')) return 35; // DiskarTech Dual Swirl
      if (str.includes('uno')) return 28; // UNO Digital Aurora Ribbon
      if (str.includes('uniondigital')) return 30; // UnionDigital Lavender & Giant Faded 'UD' Watermark
      if (str.includes('ofbank')) return 36; // OFBank Global Meridian Arcs
      if (str.includes('netbank')) return 37; // Netbank Chiseled Metallic Monolith

      // 5. Prepaid & Transit Cards
      if (str.includes('starbucks')) return 23; // Starbucks Siren Wave & Celestial Stardust
      if (str.includes('autosweep')) return 24; // Autosweep Highway Speed Ribbons
      if (str.includes('easytrip')) return 39; // Easytrip Hyper-Speed Prismatic Light Beams
      if (str.includes('beep')) return 29; // beep™ Modern Tribal Kinetic Weave

      // 6. Membership & Loyalty Cards
      if (str.includes('bistro')) return 40; // The Bistro Group Obsidian & Gold Twin Crescents
      if (str.includes('landers')) return 41; // Landers Molten Bronze Dunes
      if (str.includes('mercury')) return 42; // Mercury Drug Pearl Silver & Regal Crest
      if (str.includes('puregold')) return 43; // Puregold Forest & Gold Guilloche Contours
      if (str.includes('robinsons')) return 44; // Robinsons Dynamic Fluid Silk Ribbons
      if (str.includes('smac') || str.includes('sm advantage')) return 45; // SM SMAC Deep Cobalt Concentric Waves
      if (str.includes('7-eleven') || str.includes('7eleven') || str.includes('cliqq')) return 46; // 7-Eleven Sunrise Speed Ribbons
      if (str.includes('national') || str.includes('laking')) return 47; // Laking National Graphic Layered Strata

      // 7. Physical Cash Wallet ONLY (Strictly on-hand cash, physical wallet)
      const isPhysicalCash = !str.includes('gcash') && (/\bcash\b/i.test(str) || str.includes('pera') || str.includes('bulsa') || str.includes('physical cash'));
      if (isPhysicalCash) return 13;

      // 8. Bespoke High-End Credit Card Motifs
      if (str.includes('signature') || str.includes('infinite') || str.includes('black card') || str.includes('maya black') || str.includes('world mastercard')) return 15;
      if (str.includes('platinum') || str.includes('titanium')) return 14;
      if (str.includes('gold') || str.includes('24k') || str.includes('cebuana')) return 6;
      if (str.includes('amore') || str.includes('everyday') || str.includes('hsbc red') || str.includes('cash back') || str.includes('cashback')) return 16;
      if (str.includes('airasia') || str.includes('mabuhay') || str.includes('miles')) return 17;
      if (str.includes('m free') || str.includes('ze-lo') || str.includes('wave')) return 20;

      // 9. Universal & Commercial Banks
      if (str.includes('bpi')) return 3;
      if (str.includes('landbank')) return 5;
      if (str.includes('pnb')) return 6;
      if (str.includes('bdo')) return 7;
      if (str.includes('metrobank')) return 9;
      if (str.includes('unionbank') || str.includes('unibank')) return 10;
      if (str.includes('security')) return 11;
      if (str.includes('visa')) return 12;

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
      uNetwork: { value: getNetworkInt(paymentNetwork, accountType, bankName) },
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
      uniform int uNetwork;
      varying vec2 vUv;

      float sdRoundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
      }

      void main() {
        // 1. Dynamic Base Gradient & Brushed Metallic Surface
        vec3 col = mix(uColor1, uColor2, vUv.y * 0.75 + vUv.x * 0.25);

        // Micro-etched Brushed Metallic Grain
        float customGrain = fract(sin(vUv.x * 880.0 + vUv.y * 1240.0) * 43758.54) * 0.030;
        col += vec3(customGrain);

        // Double Beveled Metallic Frame Border
        vec2 framePos = vUv - vec2(0.5, 0.5);
        float dFrame = sdRoundedBox(framePos, vec2(0.47, 0.46), 0.03);
        float frameBorder = smoothstep(0.003, 0.0, abs(dFrame));
        col = mix(col, vec3(1.0), frameBorder * 0.18);

        // Dynamic Anisotropic Specular Light Sheen
        float customSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
        col += vec3(0.9, 0.95, 1.0) * customSheen * 0.35;

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
          // ── MAYA REAL-WORLD VIBRANT PINK 3D SHADER MOTIF ──
          // Signature Vibrant Magenta Pink + GIANT 3D Faded Textured 'm' Arch Watermark & Sparkling Glitters
          vec3 mayaMagentaDark = vec3(0.68, 0.05, 0.35); // #AD1457
          vec3 mayaMagentaBright = vec3(0.92, 0.08, 0.45); // #E91E63
          col = mix(mayaMagentaDark, mayaMagentaBright, vUv.y * 0.6 + vUv.x * 0.4);

          // 1. Multi-layered 3D Radial Center Light Gradient
          float distCenter = length(vUv - vec2(0.42, 0.52));
          float radialGlow = smoothstep(0.75, 0.0, distCenter);
          col += vec3(0.18, 0.04, 0.12) * radialGlow;

          // 2. Fine Stardust Micro-Texture
          float mayaGrain = fract(sin(vUv.x * 927.0 + vUv.y * 531.0) * 43758.54) * 0.038;
          col += vec3(mayaGrain * 0.6, mayaGrain * 0.2, mayaGrain * 0.4);

          // 3. GIANT 3D Faded Textured 'm' Arch Watermark (Right Half of Card)
          if (vUv.x > 0.30) {
            vec2 mPos = (vUv - vec2(0.70, 0.42)) * vec2(1.25, 1.0);
            
            float loop1 = sdRoundedBox(mPos - vec2(-0.16, -0.05), vec2(0.12, 0.32), 0.12);
            float loop2 = sdRoundedBox(mPos - vec2(0.16, -0.05), vec2(0.12, 0.32), 0.12);
            float mArchShape = min(loop1, loop2);
            
            float mWatermark = smoothstep(0.06, -0.02, mArchShape);
            
            // 3D Luminous Bevel Edge Highlight for the 'm' Arch
            float mBevel = smoothstep(0.06, 0.01, abs(mArchShape)) * smoothstep(0.0, 0.08, abs(mArchShape));
            
            // Micro-guilloche & stardust noise inside watermark
            float mTexture = sin(vUv.x * 140.0 + vUv.y * 90.0 + uTime * 0.1) * 0.12 + 0.88;
            vec3 watermarkPink = vec3(0.98, 0.62, 0.78); // Soft faded translucent light pink
            col = mix(col, watermarkPink * mTexture, mWatermark * 0.45);
            col += vec3(1.0, 0.82, 0.94) * mBevel * 0.40; // Luminous 3D arch edge glow
          }

          // 4. Maya Signature Micro-Glitters & Subtle Star Flare Sparkles
          vec2 mGlitterUv = vUv * vec2(160.0, 100.0);
          vec2 mGlitterId = floor(mGlitterUv);
          float mSeed = fract(sin(dot(mGlitterId, vec2(12.9898, 78.233))) * 43758.5453);
          
          if (mSeed > 0.935) {
            // Base static micro-glitter flake
            vec3 microGlitterCol = mix(vec3(1.0, 0.82, 0.92), vec3(1.0, 0.95, 0.70), fract(mSeed * 17.0));
            float staticGleam = (mSeed - 0.935) * 12.0;
            col += microGlitterCol * staticGleam;

            // Subtle 4-Point Star Flare Sparkle on select glitters (slight & elegant)
            if (mSeed > 0.975) {
              vec2 starCenter = (mGlitterId + 0.5) / vec2(160.0, 100.0);
              vec2 dStar = abs(vUv - starCenter) * vec2(1.586, 1.0);
              
              float starBeamH = smoothstep(0.0022, 0.0, dStar.y) * smoothstep(0.035, 0.0, dStar.x);
              float starBeamV = smoothstep(0.0022, 0.0, dStar.x) * smoothstep(0.035, 0.0, dStar.y);
              float starCross = max(starBeamH, starBeamV);

              // Gentle slight breathing shimmer
              float starPulse = sin(uTime * 1.5 + mSeed * 12.0) * 0.22 + 0.78;
              vec3 starColor = vec3(1.0, 0.96, 0.88); // Soft diamond white / champagne glow
              col += starColor * starCross * starPulse * 0.45;
            }
          }

          // 5. Smooth Specular Sheen Reflection
          float mayaSheen = smoothstep(0.24, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(1.0, 0.85, 0.95) * mayaSheen * 0.35;

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
          // ── 6. PNB / BPI / BDO 24K BRUSHED GOLD + CONCENTRIC RADIAL RIPPLE ARCS (Inspired by User Image 4) ──
          vec3 pnbGoldDeep = vec3(0.72, 0.54, 0.14);      // Rich Bronze Gold Depth
          vec3 pnbGoldMid = vec3(0.92, 0.76, 0.26);       // 24K Gold Body
          vec3 pnbGoldBright = vec3(1.0, 0.90, 0.48);    // Champagne Gold Highlight
          
          col = mix(pnbGoldDeep, pnbGoldMid, vUv.y * 0.6 + vUv.x * 0.4);

          // Brushed 24K Gold Metallic Grain
          float goldGrain = fract(sin(vUv.x * 920.0 + vUv.y * 1480.0) * 43758.54) * 0.030;
          col += vec3(goldGrain * 0.45, goldGrain * 0.38, goldGrain * 0.12);

          // 1. Concentric Radial Ripple Arcs radiating from Chip (Center at vec2(0.24, 0.52)) (inspired by User Image 4)
          vec2 chipCenter = vec2(0.24, 0.52);
          float distChip = length((vUv - chipCenter) * vec2(1.586, 1.0));
          float radialArcs = sin(distChip * 54.0) * 0.5 + 0.5;
          float arcMask = smoothstep(0.12, 0.85, distChip) * smoothstep(0.95, 0.20, vUv.x);
          
          vec3 arcGold = mix(pnbGoldMid, pnbGoldBright, radialArcs);
          col = mix(col, arcGold, arcMask * 0.35);

          // 2. Flowing Liquid Gold Wave Ribbon across center
          float waveCenter = 0.48 + sin(vUv.x * 5.0 - uTime * 0.12) * 0.08 + cos(vUv.x * 9.0 + uTime * 0.05) * 0.04;
          float distToWave = abs(vUv.y - waveCenter);
          float waveRibbon = smoothstep(0.095, 0.0, distToWave);

          if (waveRibbon > 0.0) {
            float wavePhase = sin(vUv.x * 12.0 - uTime * 0.15) * 0.5 + 0.5;
            vec3 liquidGoldCore = mix(vec3(0.94, 0.72, 0.18), vec3(1.0, 0.95, 0.62), wavePhase);
            float waveStrands = sin((vUv.y - waveCenter) * 110.0 + vUv.x * 20.0) * 0.5 + 0.5;
            vec3 strandColor = mix(liquidGoldCore, vec3(1.0, 0.98, 0.85), waveStrands * 0.60);
            float edgeGlow = smoothstep(0.095, 0.02, distToWave);
            col = mix(col, strandColor, edgeGlow * 0.85);
          }

          // 3. Gold Specular Light Sheen
          float goldGlint = smoothstep(0.2, 0.0, abs((vUv.x + vUv.y * 0.5) - (uLightPos.x + 0.2))) * (uShineIntensity + 0.35);
          col += vec3(1.0, 0.95, 0.60) * goldGlint * 0.55;

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

        } else if (uCardType == 14) {
          // ── 14. LUXURY ENGRAVED MECHANICAL WATCH MOVEMENT & TITANIUM PLATINUM (Inspired by User Image 2) ──
          vec3 slateBase = mix(uColor1, uColor2, vUv.y * 0.7 + vUv.x * 0.3);
          vec3 darkMetal = mix(vec3(0.06, 0.07, 0.09), slateBase, 0.50);
          vec3 metallicSilver = vec3(0.85, 0.88, 0.95);

          col = darkMetal;

          // Brushed titanium grain
          float tGrain = fract(sin(vUv.x * 950.0 + vUv.y * 1350.0) * 43758.54) * 0.028;
          col += vec3(tGrain);

          // 1. Right Side Large Master Watch Gear (Center at vec2(0.72, 0.42))
          vec2 gearCenter1 = vUv - vec2(0.72, 0.42);
          float distGear1 = length(gearCenter1 * vec2(1.586, 1.0));
          float gearAngle1 = atan(gearCenter1.y, gearCenter1.x);

          // Gear outer teeth
          float teeth1 = sin(gearAngle1 * 32.0) * 0.012;
          float outerRing1 = abs(distGear1 - (0.34 + teeth1));
          float lineOuter1 = smoothstep(0.005, 0.0, outerRing1);

          // Concentric precision etched circles
          float ringA1 = smoothstep(0.004, 0.0, abs(distGear1 - 0.28));
          float ringB1 = smoothstep(0.004, 0.0, abs(distGear1 - 0.22));
          float ringC1 = smoothstep(0.004, 0.0, abs(distGear1 - 0.15));
          float ringCenter1 = smoothstep(0.005, 0.0, abs(distGear1 - 0.05));

          // Radial gear spokes (6 main spokes)
          float spokeAngle1 = sin(gearAngle1 * 6.0);
          float spoke1 = smoothstep(0.98, 1.0, spokeAngle1) * step(0.06, distGear1) * step(distGear1, 0.28);

          // 2. Left Side Secondary Interlocking Watch Gear (Center at vec2(0.28, 0.75))
          vec2 gearCenter2 = vUv - vec2(0.28, 0.75);
          float distGear2 = length(gearCenter2 * vec2(1.586, 1.0));
          float gearAngle2 = atan(gearCenter2.y, gearCenter2.x);
          float teeth2 = sin(gearAngle2 * 24.0) * 0.010;
          float outerRing2 = abs(distGear2 - (0.22 + teeth2));
          float lineOuter2 = smoothstep(0.005, 0.0, outerRing2);
          float ringA2 = smoothstep(0.004, 0.0, abs(distGear2 - 0.16));

          // 3. Fine Horizontal Parallel Engraved Striped Lines (Left Side)
          float stripeRegion = step(vUv.x, 0.42) * step(0.48, vUv.y);
          float fineStripes = sin(vUv.y * 180.0) * 0.5 + 0.5;
          float stripePattern = smoothstep(0.40, 0.60, fineStripes) * stripeRegion;

          // Combine gear engravings & pinstripes
          float totalEngraving = max(max(lineOuter1, max(ringA1, max(ringB1, max(ringC1, ringCenter1)))), spoke1);
          totalEngraving = max(totalEngraving, max(lineOuter2, ringA2));
          totalEngraving = max(totalEngraving, stripePattern * 0.65);

          // Engraved Metallic Specular Highlight (catches ambient 3D lighting)
          float lightReflection = smoothstep(0.35, 0.0, length(vUv - uLightPos)) * (uShineIntensity + 0.45);
          vec3 engravedGleam = mix(metallicSilver * 0.65, vec3(1.0, 0.98, 0.92), lightReflection);

          col = mix(col, engravedGleam, totalEngraving * 0.85);

          // Platinum Specular Anisotropic Light Streak
          float platStreak = smoothstep(0.18, 0.0, abs((vUv.x * 1.2 + vUv.y * 0.4) - (uLightPos.x * 1.4))) * (uShineIntensity + 0.35);
          col += vec3(0.9, 0.95, 1.0) * platStreak * 0.45;

        } else if (uCardType == 15) {
          // ── 15. BLACK ONYX LUXURY + SWEEPING LIQUID GOLD RIBBONS & GLITTER STARDUST (Inspired by User Image 3 & 5) ──
          vec3 onyxBlack = vec3(0.04, 0.04, 0.06);
          col = onyxBlack;

          // 1. Sparkling Gold Glitter / Micro-Dust Texture (inspired by Image 3)
          float goldGlitter = fract(sin(vUv.x * 1420.0 + vUv.y * 1180.0) * 43758.54);
          float dustMask = step(0.92, goldGlitter);
          vec3 dustColor = mix(vec3(1.0, 0.84, 0.30), vec3(1.0, 0.96, 0.65), fract(goldGlitter * 10.0));

          // 2. Sweeping Dynamic Liquid Gold Waves (Bottom-Right Arcs)
          float strand1 = smoothstep(0.04, 0.0, abs(vUv.y - (0.08 + sin(vUv.x * 3.8 + 0.2) * 0.28)));
          float strand2 = smoothstep(0.03, 0.0, abs(vUv.y - (0.02 + sin(vUv.x * 4.2 - 0.3) * 0.24)));
          float strand3 = smoothstep(0.06, 0.0, abs(vUv.y - (0.16 + sin(vUv.x * 3.2 + 0.6) * 0.32)));

          // Liquid Gold Band with Sparkling Glitter Body
          float bandGlitter = dustMask * strand3 * 0.85;
          vec3 goldCore = vec3(0.96, 0.78, 0.22);      // Rich 24K Gold
          vec3 goldHighlight = vec3(1.0, 0.94, 0.62); // Champagne Gold

          col = mix(col, goldCore, (strand1 + strand2 * 0.8) * 0.90);
          col += dustColor * bandGlitter * 0.95;

          // 3. Infinite loop golden filigree (Top-Right)
          vec2 infC = vUv - vec2(0.78, 0.72);
          float rL = length(infC - vec2(-0.08, 0.0));
          float rR = length(infC - vec2(0.08, 0.0));
          float loop1 = smoothstep(0.005, 0.0, abs(rL - 0.10));
          float loop2 = smoothstep(0.005, 0.0, abs(rR - 0.10));
          float allLoops = max(loop1, loop2);
          col = mix(col, goldHighlight, allLoops * 0.75);

          // 4. Obsidian Anisotropic Specular Light Gleam
          float onyxGleam = smoothstep(0.20, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.30);
          col += vec3(1.0, 0.90, 0.65) * onyxGleam * 0.40;

        } else if (uCardType == 16) {
          // ── 16. CASHBACK / VITALITY CORALS & FACETS (BPI Amore Cashback, UnionBank Cash Back, EastWest EveryDay, HSBC Red) ──
          vec2 fUv = vUv * vec2(12.0, 7.0);
          vec2 fCell = fract(fUv) - 0.5;
          float tri = abs(fCell.x + fCell.y);
          float facetGlow = sin((floor(fUv.x) + floor(fUv.y)) * 0.6 + uTime * 0.2) * 0.5 + 0.5;
          vec3 facetHighlight = mix(vec3(1.0, 0.8, 0.9), vec3(1.0, 0.95, 0.8), facetGlow);
          col = mix(col, facetHighlight, smoothstep(0.4, 0.5, tri) * 0.25);

          // Dynamic light bounce lens sweep
          float sweepF = smoothstep(0.25, 0.0, abs((vUv.x + vUv.y) - (uLightPos.x * 1.5 + 0.2))) * (uShineIntensity + 0.25);
          col += vec3(1.0, 0.85, 0.75) * sweepF * 0.35;

        } else if (uCardType == 17) {
          // ── 17. AVIATION FLIGHT & SUPERSONIC TRAILS (UnionBank Miles+, RCBC AirAsia, PNB Mabuhay Miles) ──
          float jetArc1 = smoothstep(0.008, 0.0, abs(vUv.y - (0.2 + pow(vUv.x, 2.2) * 0.65)));
          float jetArc2 = smoothstep(0.006, 0.0, abs(vUv.y - (0.32 + pow(vUv.x, 2.0) * 0.55)));
          float jetArc3 = smoothstep(0.005, 0.0, abs(vUv.y - (0.12 + pow(vUv.x, 2.5) * 0.75)));
          float allArcs = max(max(jetArc1, jetArc2), jetArc3);

          vec3 trailGold = vec3(1.0, 0.85, 0.40);
          col = mix(col, trailGold, allArcs * 0.85);

          // Speed pinstripes
          float speedLines = sin(vUv.y * 120.0 + vUv.x * 40.0);
          col += vec3(0.08, 0.12, 0.22) * smoothstep(0.4, 0.6, speedLines) * (1.0 - vUv.x);

        } else if (uCardType == 18) {
          // ── 18. DIGITAL NEO GREEN & CYBER TRAILS (GrabPay, Wise, PayMongo, Tonik, OwnBank) ──
          vec2 cGrid = fract(vUv * vec2(20.0, 12.0)) - 0.5;
          float cLine = smoothstep(0.04, 0.0, abs(cGrid.y));
          float pulseSpeed = sin(vUv.x * 15.0 - uTime * 0.4) * 0.5 + 0.5;
          vec3 neonLime = vec3(0.25, 1.0, 0.45);
          col += neonLime * cLine * pulseSpeed * 0.35;

          // Dynamic angular sweep
          float angSweep = smoothstep(0.05, 0.0, abs((vUv.x * 2.0 - vUv.y) - (sin(uTime * 0.2) * 0.6 + 0.8)));
          col += vec3(0.6, 1.0, 0.7) * angSweep * 0.45;

        } else if (uCardType == 19) {
          // ── 19. TRANSIT & E-WALLET ARCS (Beep Card, 7-Eleven CLiQQ, PalawanPay, Payoneer, PayPal) ──
          vec2 tCenter = vec2(0.72, 0.52);
          float tDist = distance(vUv, tCenter);
          float tRipple = sin(tDist * 36.0 - uTime * 0.2) * 0.5 + 0.5;
          float tMask = smoothstep(0.55, 0.10, tDist);
          vec3 transitGold = vec3(1.0, 0.82, 0.25);
          col = mix(col, transitGold, tRipple * tMask * 0.35);

          // Curved signature transit arc
          float bArc = smoothstep(0.012, 0.0, abs(length(vUv - vec2(0.2, -0.1)) - 0.85));
          col = mix(col, vec3(1.0, 0.95, 0.8), bArc * 0.65);

        } else if (uCardType == 20) {
          // ── 20. MINIMALIST PEARL & ICE FROST (Metrobank M Free, PNB Ze-Lo, Security Bank Wave) ──
          float iceWave = sin(vUv.x * 8.0 + sin(vUv.y * 6.0 + uTime * 0.15)) * 0.5 + 0.5;
          vec3 prismCol = 0.5 + 0.5 * cos(6.28318 * (vUv.x * 0.8 + vUv.y * 0.5 + uTime * 0.08 + vec3(0.0, 0.33, 0.67)));
          col = mix(col, prismCol, iceWave * 0.22);

          float frostSheen = smoothstep(0.22, 0.0, abs((vUv.x * 0.8 + vUv.y * 0.6) - uLightPos.x)) * (uShineIntensity + 0.3);
          col += vec3(0.9, 0.95, 1.0) * frostSheen * 0.45;

        } else if (uCardType == 21) {
          // ── 21. ZED HIGH-VOLTAGE CYBER GOLD & LIGHTNING CHEVRON ──
          vec3 zedAmberDark = vec3(0.92, 0.62, 0.05);
          vec3 zedAmberBright = vec3(1.0, 0.82, 0.12);
          col = mix(zedAmberDark, zedAmberBright, vUv.y * 0.7 + vUv.x * 0.3);

          float zHatch = sin((vUv.x * 0.866 + vUv.y * 0.5) * 180.0) * 0.025;
          col += vec3(zHatch);

          vec2 boltUv = vUv - vec2(0.68, 0.52);
          float boltDist = 99.0;
          if (boltUv.y > 0.05) {
            boltDist = abs(boltUv.x - boltUv.y * 0.45);
          } else if (boltUv.y > -0.05) {
            boltDist = abs(boltUv.x + boltUv.y * 0.6 - 0.04);
          } else {
            boltDist = abs(boltUv.x - boltUv.y * 0.5 - 0.08);
          }
          if (abs(boltUv.y) < 0.28) {
            float boltGlow = exp(-boltDist * 42.0);
            float boltCore = smoothstep(0.012, 0.0, boltDist);
            col = mix(col, vec3(0.10, 0.08, 0.04), boltCore * 0.95);
            col += vec3(1.0, 0.95, 0.6) * boltGlow * 0.45;
          }

          float zGlint = smoothstep(0.20, 0.0, abs((vUv.x + vUv.y * 0.4) - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(1.0, 0.96, 0.70) * zGlint * 0.45;

        } else if (uCardType == 22) {
          // ── 22. GCASH BLACK EDITION CYBER HAZARD ──
          vec3 gBlackBase = vec3(0.06, 0.06, 0.08);
          float gCarbon = sin(vUv.x * 300.0) * sin(vUv.y * 300.0) * 0.02;
          col = gBlackBase + vec3(gCarbon);

          float bandCoord = (vUv.x * 0.707 + vUv.y * 0.707) * 9.0;
          float bandFract = fract(bandCoord);
          float bandLine = smoothstep(0.18, 0.22, bandFract) * smoothstep(0.82, 0.78, bandFract);

          vec3 redHazard = vec3(0.92, 0.05, 0.12);
          if (bandLine > 0.5) {
            col = mix(col, redHazard, 0.88);
            float nodePulse = sin((floor(bandCoord) * 4.0 + (vUv.x - vUv.y) * 22.0) - uTime * 0.25);
            float dotApp = smoothstep(0.15, 0.0, abs(nodePulse));
            col = mix(col, vec3(0.08, 0.04, 0.05), dotApp * 0.85);
            col += vec3(1.0, 0.4, 0.4) * dotApp * 0.45;
          }

          float gSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.25);
          col += vec3(0.8, 0.85, 0.95) * gSheen * 0.30;

        } else if (uCardType == 23) {
          // ── 23. STARBUCKS SIREN WAVE & CELESTIAL STARDUST ──
          vec3 sbDarkGreen = vec3(0.01, 0.18, 0.12);
          vec3 sbEmerald = vec3(0.02, 0.45, 0.28);
          col = mix(sbDarkGreen, sbEmerald, vUv.x * 0.6 + vUv.y * 0.4);

          vec2 sirenCenter = vec2(0.92, 0.50);
          float distSiren = length(vUv - sirenCenter);
          float waves = sin(distSiren * 34.0 - uTime * 0.15) * 0.5 + 0.5;
          float waveMask = smoothstep(0.85, 0.15, distSiren);
          vec3 waveColor = mix(sbEmerald, vec3(0.12, 0.68, 0.45), waves);
          col = mix(col, waveColor, waveMask * 0.42);

          float starDust = fract(sin(vUv.x * 920.0 + vUv.y * 450.0) * 43758.54);
          if (starDust > 0.985) {
            col += vec3(0.95, 0.88, 0.60) * 0.55;
          }

          float sbSheen = smoothstep(0.25, 0.0, abs((vUv.x * 1.2 + vUv.y * 0.3) - (uLightPos.x * 1.3))) * (uShineIntensity + 0.35);
          col += vec3(0.4, 0.95, 0.70) * sbSheen * 0.40;

        } else if (uCardType == 24) {
          // ── 24. AUTOSWEEP RFID HIGHWAY SPEED RIBBONS ──
          vec3 asCream1 = vec3(0.94, 0.95, 0.92);
          vec3 asCream2 = vec3(0.88, 0.90, 0.86);
          col = mix(asCream1, asCream2, vUv.y * 0.7 + vUv.x * 0.3);

          float waveH1 = 0.28 + sin(vUv.x * 4.2 - uTime * 0.10) * 0.08 + cos(vUv.x * 8.0) * 0.03;
          float dW1 = abs(vUv.y - waveH1);
          float ribbon1 = smoothstep(0.05, 0.0, dW1);

          float waveH2 = 0.22 + sin(vUv.x * 4.2 + 0.6 - uTime * 0.10) * 0.07;
          float dW2 = abs(vUv.y - waveH2);
          float ribbon2 = smoothstep(0.045, 0.0, dW2);

          vec3 asEmerald = vec3(0.06, 0.58, 0.32);
          vec3 asGold = vec3(0.92, 0.72, 0.20);
          col = mix(col, asGold, ribbon2 * 0.55);
          col = mix(col, asEmerald, ribbon1 * 0.75);

          float asGlint = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.3);
          col += vec3(0.98, 0.98, 1.0) * asGlint * 0.35;

        } else if (uCardType == 25) {
          // ── 25. TONIK ULTRAVIOLET & GIANT FADED 't' CROSS WATERMARK ──
          vec3 tonikIndigo = vec3(0.42, 0.25, 0.72); // #673AB7
          vec3 tonikViolet = vec3(0.55, 0.32, 0.85); // #7E57C2
          col = mix(tonikIndigo, tonikViolet, vUv.y * 0.7 + vUv.x * 0.3);

          // GIANT Faded 't' Cross Watermark (Right Half)
          if (vUv.x > 0.38) {
            vec2 tPos = vUv - vec2(0.72, 0.48);
            float tPillar = smoothstep(0.08, 0.0, abs(tPos.x));
            float tCross = smoothstep(0.07, 0.0, abs(tPos.y - 0.08)) * smoothstep(0.32, 0.0, length(tPos));
            float tWatermark = max(tPillar, tCross);

            vec3 softLilac = vec3(0.92, 0.88, 0.98);
            col = mix(col, softLilac, tWatermark * 0.32);
          }

          float tSheen = smoothstep(0.24, 0.0, abs((vUv.x * 1.1 + vUv.y * 0.4) - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(0.9, 0.6, 1.0) * tSheen * 0.45;

        } else if (uCardType == 26) {
          // ── 26. KOMO ELECTRIC TURQUOISE & GIANT FADED 'k' WATERMARK ──
          vec3 komoTeal = vec3(0.0, 0.65, 0.75); // #00ACC1
          vec3 komoCyan = vec3(0.0, 0.78, 0.88); // #00BCD4
          col = mix(komoTeal, komoCyan, vUv.x * 0.7 + vUv.y * 0.3);

          // GIANT Faded 'k' Watermark (Right Half)
          if (vUv.x > 0.40) {
            vec2 kPos = vUv - vec2(0.72, 0.48);
            float kStem = smoothstep(0.06, 0.0, abs(kPos.x + 0.12));
            float kUpper = smoothstep(0.06, 0.0, abs((kPos.y - 0.02) - kPos.x * 1.2)) * smoothstep(0.0, 0.28, kPos.x);
            float kLower = smoothstep(0.06, 0.0, abs((kPos.y + 0.02) + kPos.x * 1.2)) * smoothstep(0.0, 0.28, kPos.x);
            float kWatermark = max(kStem, max(kUpper, kLower));

            vec3 softIceCyan = vec3(0.85, 0.96, 0.98);
            col = mix(col, softIceCyan, kWatermark * 0.32);
          }

          float komoSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(0.65, 0.98, 1.0) * komoSheen * 0.45;

        } else if (uCardType == 27) {
          // ── 27. SALMON SUNSET & GIANT FADED WAVE DUNES WATERMARK ──
          vec3 salmonDeep = vec3(0.96, 0.38, 0.38); // Coral pink
          vec3 salmonPeach = vec3(0.98, 0.52, 0.48);
          col = mix(salmonDeep, salmonPeach, vUv.y * 0.6 + vUv.x * 0.4);

          // GIANT Faded Smooth Curved Wave Dunes Watermark
          float dune = sin(vUv.x * 4.2 + sin(vUv.y * 5.0) * 1.2 - uTime * 0.15) * 0.5 + 0.5;
          float duneMask = smoothstep(0.32, 0.68, dune) * smoothstep(0.25, 0.95, vUv.x);
          vec3 rosePeach = vec3(1.0, 0.82, 0.80);
          col = mix(col, rosePeach, duneMask * 0.35);

          float salmonGlint = smoothstep(0.20, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(1.0, 0.88, 0.88) * salmonGlint * 0.40;

        } else if (uCardType == 28) {
          // ── 28. UNO DIGITAL AURORA RIBBON ON OBSIDIAN ──
          vec3 unoBlack = vec3(0.04, 0.04, 0.06);
          col = unoBlack;

          float ribbonPath = 0.46 + sin(vUv.x * 4.0 - uTime * 0.12) * 0.22 + cos(vUv.x * 8.0) * 0.06;
          float distRibbon = abs(vUv.y - ribbonPath);
          float auroraMask = smoothstep(0.08, 0.0, distRibbon);

          vec3 auroraGrad = 0.5 + 0.5 * cos(6.28318 * (vUv.x * 1.2 + uTime * 0.08 + vec3(0.0, 0.33, 0.67)));
          col = mix(col, auroraGrad, auroraMask * 0.85);

          float softGlow = smoothstep(0.26, 0.0, distRibbon);
          col += auroraGrad * softGlow * 0.35;

        } else if (uCardType == 29) {
          // ── 29. BEEP™ MODERN TRIBAL KINETIC WEAVE ──
          vec3 beepNavy = vec3(0.06, 0.08, 0.28);
          vec3 beepCobalt = vec3(0.12, 0.24, 0.62);
          col = mix(beepNavy, beepCobalt, vUv.y * 0.6 + vUv.x * 0.4);

          if (vUv.x > 0.35 && vUv.y < 0.75) {
            vec2 tribalUv = (vUv - vec2(0.35, 0.0)) * vec2(28.0, 16.0);
            vec2 tCell = fract(tribalUv) - 0.5;
            float triShape = abs(tCell.x * 1.6) + abs(tCell.y);
            float triMask = smoothstep(0.45, 0.35, triShape);

            float pulseRow = sin(floor(tribalUv.y) * 1.2 + uTime * 0.2) * 0.5 + 0.5;
            vec3 copperOrange = mix(vec3(0.95, 0.45, 0.15), vec3(0.98, 0.75, 0.25), pulseRow);
            col = mix(col, copperOrange, triMask * 0.55);
          }

          float beepSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.3);
          col += vec3(0.65, 0.85, 1.0) * beepSheen * 0.40;

        } else if (uCardType == 30) {
          // ── 30. UNIONDIGITAL LAVENDER & GIANT FADED 'UD' WATERMARK ──
          vec3 udLavender = vec3(0.52, 0.55, 0.82); // #7986CB
          vec3 udViolet = vec3(0.38, 0.42, 0.72); // #5C6BC0
          col = mix(udLavender, udViolet, vUv.y * 0.7 + vUv.x * 0.3);

          // GIANT Faded 'UD' Overlapping Arches Watermark (Right Half)
          if (vUv.x > 0.38) {
            vec2 udPos = vUv - vec2(0.70, 0.48);
            float uArch = smoothstep(0.06, 0.0, abs(length(udPos - vec2(-0.10, 0.05)) - 0.18));
            float dArch = smoothstep(0.06, 0.0, abs(length(udPos - vec2(0.10, -0.05)) - 0.18));
            float udWatermark = max(uArch, dArch);

            vec3 softLilacWhite = vec3(0.92, 0.93, 0.98);
            col = mix(col, softLilacWhite, udWatermark * 0.32);
          }

          float udSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(0.85, 0.88, 1.0) * udSheen * 0.45;

        } else if (uCardType == 31) {
          // ── 31. PAYPAL ROYAL NAVY & GIANT FADED DOUBLE 'P' LOGO WATERMARK ──
          vec3 ppDarkBlue = vec3(0.00, 0.11, 0.39); // #001C64
          vec3 ppLightBlue = vec3(0.00, 0.19, 0.53); // #003087
          col = mix(ppDarkBlue, ppLightBlue, vUv.y * 0.7 + vUv.x * 0.3);

          // GIANT Faded Double 'P' Logo Watermark (Right Half)
          if (vUv.x > 0.35) {
            vec2 p1Pos = vUv - vec2(0.68, 0.46);
            float p1Stem = smoothstep(0.06, 0.0, abs(p1Pos.x + 0.08)) * smoothstep(-0.25, 0.25, p1Pos.y);
            float p1Loop = smoothstep(0.06, 0.0, abs(length(p1Pos - vec2(0.0, 0.08)) - 0.12));
            float p1Watermark = max(p1Stem, p1Loop);

            vec2 p2Pos = vUv - vec2(0.76, 0.40);
            float p2Stem = smoothstep(0.06, 0.0, abs(p2Pos.x + 0.08)) * smoothstep(-0.25, 0.25, p2Pos.y);
            float p2Loop = smoothstep(0.06, 0.0, abs(length(p2Pos - vec2(0.0, 0.08)) - 0.12));
            float p2Watermark = max(p2Stem, p2Loop);

            vec3 cyanP = vec3(0.0, 0.44, 0.73);
            vec3 skyP = vec3(0.0, 0.61, 0.87);
            col = mix(col, cyanP, p1Watermark * 0.35);
            col = mix(col, skyP, p2Watermark * 0.40);
          }

          float ppSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(0.6, 0.85, 1.0) * ppSheen * 0.40;

        } else if (uCardType == 32) {
          // ── 32. PALAWANPAY SOLAR GEODESIC LATTICE ──
          vec3 palForest = vec3(0.02, 0.28, 0.18);
          vec3 palEmerald = vec3(0.04, 0.52, 0.32);
          col = mix(palForest, palEmerald, vUv.y * 0.7 + vUv.x * 0.3);

          vec2 sphereCenter = vec2(0.76, 0.48);
          float dSph = length(vUv - sphereCenter);
          if (dSph < 0.36) {
            float lat1 = abs(sin(dSph * 48.0 - uTime * 0.15));
            float lon1 = abs(sin(atan(vUv.y - sphereCenter.y, vUv.x - sphereCenter.x) * 12.0));
            float latticeMask = smoothstep(0.12, 0.0, lat1 * lon1);
            vec3 palGold = vec3(0.96, 0.82, 0.25);
            col = mix(col, palGold, latticeMask * (1.0 - dSph / 0.36) * 0.65);
          }

        } else if (uCardType == 33) {
          // ── 33. LUVIT NEON RIBBON INFINITY LOOP ──
          vec3 luvitDark = vec3(0.02, 0.18, 0.09);
          col = luvitDark;

          vec2 luvUv = (vUv - vec2(0.72, 0.48)) * vec2(1.8, 1.0);
          float dLoop = abs(length(luvUv - vec2(0.15, 0.0)) * length(luvUv + vec2(0.15, 0.0)) - 0.08);
          float loopMask = smoothstep(0.035, 0.0, dLoop);
          vec3 neonLime = vec3(0.45, 0.98, 0.15);
          col = mix(col, neonLime, loopMask * 0.85);
          col += neonLime * smoothstep(0.12, 0.0, dLoop) * 0.30;

        } else if (uCardType == 34) {
          // ── 34. OWNBANK VIVID GREEN & GIANT FADED ARROW LOOP WATERMARK ──
          vec3 ownDarkGreen = vec3(0.0, 0.62, 0.26); // #009E43
          vec3 ownBrightGreen = vec3(0.0, 0.78, 0.33); // #00C853
          col = mix(ownDarkGreen, ownBrightGreen, vUv.y * 0.6 + vUv.x * 0.4);

          // GIANT Faded Circular Arrow Loop 'O' Watermark (Right Half)
          if (vUv.x > 0.35) {
            vec2 ownPos = vUv - vec2(0.72, 0.48);
            float ownLoop = smoothstep(0.08, 0.0, abs(length(ownPos) - 0.26));
            
            vec3 glowingChartreuse = vec3(0.80, 1.0, 0.56); // #CCFF90
            col = mix(col, glowingChartreuse, ownLoop * 0.38);
          }

          float ownSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(0.8, 1.0, 0.7) * ownSheen * 0.45;

        } else if (uCardType == 35) {
          // ── 35. DISKARTECH TEAL-LIME GRADIENT & GIANT FADED 'd' SWIRL WATERMARK ──
          vec3 dtTeal = vec3(0.0, 0.55, 0.62); // #00897B
          vec3 dtLime = vec3(0.55, 0.75, 0.12); // #8BC34A
          col = mix(dtTeal, dtLime, vUv.x * 0.75 + vUv.y * 0.25);

          // GIANT Faded Swirling 'd' Watermark (Right Half)
          if (vUv.x > 0.38) {
            vec2 dtPos = vUv - vec2(0.72, 0.46);
            float dLoop = smoothstep(0.07, 0.0, abs(length(dtPos) - 0.22));
            float dStem = smoothstep(0.06, 0.0, abs(dtPos.x - 0.18)) * smoothstep(-0.25, 0.28, dtPos.y);
            float dtWatermark = max(dLoop, dStem);

            vec3 softPaleCyan = vec3(0.88, 0.97, 0.98);
            col = mix(col, softPaleCyan, dtWatermark * 0.32);
          }

          float dtSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(0.85, 1.0, 0.85) * dtSheen * 0.45;

        } else if (uCardType == 36) {
          // ── 36. OFBANK GLOBAL MERIDIAN ARCS ──
          vec3 ofNavyDark = vec3(0.0, 0.12, 0.42);
          vec3 ofNavyLight = vec3(0.0, 0.35, 0.75);
          col = mix(ofNavyDark, ofNavyLight, vUv.y * 0.7 + vUv.x * 0.3);

          vec2 globePos = vUv - vec2(0.72, 0.44);
          float rGlobe = length(globePos);
          if (rGlobe < 0.40) {
            float m1 = smoothstep(0.008, 0.0, abs(globePos.y - sin(globePos.x * 5.0) * 0.10));
            float m2 = smoothstep(0.008, 0.0, abs(globePos.x - sin(globePos.y * 5.0) * 0.12));
            vec3 ofGold = vec3(0.96, 0.82, 0.35);
            col = mix(col, ofGold, max(m1, m2) * (1.0 - rGlobe / 0.40) * 0.65);
          }

        } else if (uCardType == 37) {
          // ── 37. NETBANK DARK CHARCOAL & GIANT FADED 'N' GEOMETRIC WATERMARK ──
          vec3 nbGunmetal = vec3(0.12, 0.14, 0.16); // #1F2428
          vec3 nbGraphite = vec3(0.22, 0.25, 0.28); // #37474F
          col = mix(nbGunmetal, nbGraphite, vUv.y * 0.8 + vUv.x * 0.2);

          // GIANT Faded Geometric 'N' Watermark (Right Half)
          if (vUv.x > 0.38) {
            vec2 nPos = vUv - vec2(0.72, 0.50);
            float nLeft = smoothstep(0.06, 0.0, abs(nPos.x + 0.14));
            float nRight = smoothstep(0.06, 0.0, abs(nPos.x - 0.14));
            float nDiag = smoothstep(0.07, 0.0, abs((nPos.y / 0.6) + (nPos.x / 0.28)));
            float nWatermark = max(max(nLeft, nRight), nDiag) * smoothstep(0.32, 0.0, abs(nPos.y));

            vec3 softMetallicSlate = vec3(0.48, 0.54, 0.60);
            col = mix(col, softMetallicSlate, nWatermark * 0.38);
          }

          float nbSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(0.85, 0.90, 0.95) * nbSheen * 0.40;

        } else if (uCardType == 38) {
          // ── 38. CIMB DYNAMIC 3D INTERTWINED TUBULAR RIBBONS ──
          vec3 cimbRedDark = vec3(0.52, 0.04, 0.08);
          vec3 cimbRedBright = vec3(0.85, 0.08, 0.14);
          col = mix(cimbRedDark, cimbRedBright, vUv.y * 0.7 + vUv.x * 0.3);

          float tube1 = smoothstep(0.05, 0.0, abs(vUv.y - (0.50 + sin(vUv.x * 5.0 - uTime * 0.15) * 0.22)));
          float tube2 = smoothstep(0.045, 0.0, abs(vUv.y - (0.42 + cos(vUv.x * 6.0 + 0.8) * 0.20)));
          
          vec3 tubeGold = vec3(0.98, 0.78, 0.25);
          vec3 tubeMagenta = vec3(0.85, 0.15, 0.55);
          col = mix(col, tubeMagenta, tube2 * 0.55);
          col = mix(col, tubeGold, tube1 * 0.65);

        } else if (uCardType == 39) {
          // ── 39. EASYTRIP HYPER-SPEED PRISMATIC LIGHT BEAMS ──
          vec3 etNavy = vec3(0.04, 0.06, 0.14);
          col = etNavy;

          vec2 beamOrigin = vec2(0.15, 0.30);
          vec2 toBeam = vUv - beamOrigin;
          float beamAngle = atan(toBeam.y, toBeam.x);
          float beamFreq = sin(beamAngle * 24.0 - uTime * 0.3) * 0.5 + 0.5;
          float laserSweep = pow(beamFreq, 6.0);

          vec3 laserCyan = vec3(0.05, 0.75, 1.0);
          vec3 laserWhite = vec3(0.9, 0.95, 1.0);
          col += mix(laserCyan, laserWhite, laserSweep) * laserSweep * 0.65;

        } else if (uCardType == 40) {
          // ── 40. THE BISTRO GROUP OBSIDIAN & GOLD TWIN CRESCENTS ──
          vec3 bistroBlack = vec3(0.04, 0.04, 0.05);
          col = bistroBlack;

          vec2 cres1 = vUv - vec2(0.68, 0.42);
          float dC1 = abs(length(cres1) - 0.32);
          float cresMask1 = smoothstep(0.015, 0.0, dC1);

          vec2 cres2 = vUv - vec2(0.74, 0.38);
          float dC2 = abs(length(cres2) - 0.24);
          float cresMask2 = smoothstep(0.012, 0.0, dC2);

          vec3 bGold = vec3(0.94, 0.75, 0.28);
          col = mix(col, bGold, max(cresMask1, cresMask2) * 0.85);

        } else if (uCardType == 41) {
          // ── 41. LANDERS MOLTEN BRONZE DUNES ──
          vec3 landersDeepBronze = vec3(0.24, 0.12, 0.04);
          vec3 landersWarmGold = vec3(0.58, 0.35, 0.12);
          col = mix(landersDeepBronze, landersWarmGold, vUv.y * 0.6 + vUv.x * 0.4);

          float duneH1 = 0.42 + sin(vUv.x * 4.0 - uTime * 0.10) * 0.12;
          float duneMask1 = smoothstep(0.08, 0.0, abs(vUv.y - duneH1));
          vec3 goldDune = vec3(0.85, 0.62, 0.22);
          col = mix(col, goldDune, duneMask1 * 0.48);

        } else if (uCardType == 42) {
          // ── 42. MERCURY DRUG PEARL SILVER & REGAL CREST ──
          vec3 mercPearl = vec3(0.95, 0.96, 0.98);
          col = mercPearl;

          float blueTrim = smoothstep(0.005, 0.0, vUv.y - (0.18 - vUv.x * 0.12));
          vec3 mercBlue = vec3(0.00, 0.18, 0.52);
          col = mix(col, mercBlue, blueTrim);

          float secWave = sin(vUv.y * 120.0 + sin(vUv.x * 8.0) * 4.0) * 0.03;
          col += vec3(secWave);

        } else if (uCardType == 43) {
          // ── 43. PUREGOLD FOREST & GOLD GUILLOCHE CONTOURS ──
          vec3 pureDark = vec3(0.01, 0.18, 0.10);
          vec3 pureMid = vec3(0.03, 0.32, 0.18);
          col = mix(pureDark, pureMid, vUv.y * 0.7 + vUv.x * 0.3);

          float guilloche = sin(vUv.y * 65.0 + sin(vUv.x * 12.0) * 3.0) * 0.5 + 0.5;
          float gMask = smoothstep(0.35, 0.65, guilloche);
          vec3 pgGold = vec3(0.95, 0.80, 0.30);
          col = mix(col, pgGold, gMask * 0.25);

        } else if (uCardType == 44) {
          // ── 44. ROBINSONS REWARDS VIBRANT RED & GIANT FADED 'R' SWIRL ARCS WATERMARK ──
          vec3 robRedDeep = vec3(0.72, 0.04, 0.08); // #B71C1C
          vec3 robRedBright = vec3(0.85, 0.08, 0.12); // #D32F2F
          col = mix(robRedDeep, robRedBright, vUv.y * 0.6 + vUv.x * 0.4);

          // GIANT Faded Orange Sweeping 'R' Swirl Arcs Watermark (Right Half)
          if (vUv.x > 0.35) {
            vec2 robPos = vUv - vec2(0.72, 0.46);
            float rArc1 = smoothstep(0.08, 0.0, abs(length(robPos) - 0.28));
            float rArc2 = smoothstep(0.06, 0.0, abs(length(robPos - vec2(0.08, -0.08)) - 0.20));
            float rWatermark = max(rArc1, rArc2);

            vec3 warmOrange = vec3(1.0, 0.43, 0.0); // #FF6D00
            col = mix(col, warmOrange, rWatermark * 0.42);
          }

          float robSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(1.0, 0.85, 0.80) * robSheen * 0.40;

        } else if (uCardType == 45) {
          // ── 45. SMAC DEEP COBALT & GIANT FADED 'SM' WATERMARK ──
          vec3 smacNavyDark = vec3(0.05, 0.25, 0.60); // #0D47A1
          vec3 smacCobalt = vec3(0.08, 0.38, 0.78); // #1565C0
          col = mix(smacNavyDark, smacCobalt, vUv.y * 0.7 + vUv.x * 0.3);

          // GIANT Faded Stylized 'SM' Letters Watermark (Right Half)
          if (vUv.x > 0.40) {
            vec2 smPos = vUv - vec2(0.72, 0.46);
            float sCurve = smoothstep(0.07, 0.0, abs(sin(smPos.y * 12.0) - smPos.x * 2.5));
            float mPillar = smoothstep(0.06, 0.0, abs(smPos.x - 0.12));
            float smWatermark = max(sCurve, mPillar) * smoothstep(0.30, 0.0, abs(smPos.y));

            vec3 skyBlue = vec3(0.39, 0.71, 0.96); // #64B5F6
            col = mix(col, skyBlue, smWatermark * 0.38);
          }

          float smacSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(0.75, 0.90, 1.0) * smacSheen * 0.40;

        } else if (uCardType == 46) {
          // ── 46. 7-ELEVEN SUNRISE SPEED RIBBONS ──
          vec3 seForest = vec3(0.02, 0.25, 0.16);
          col = seForest;

          float ribbonCoord = vUv.y - (0.35 + sin(vUv.x * 3.5 - uTime * 0.10) * 0.10);
          if (ribbonCoord > 0.03 && ribbonCoord < 0.08) {
            col = vec3(0.96, 0.45, 0.05); // Orange
          } else if (ribbonCoord > -0.03 && ribbonCoord <= 0.03) {
            col = vec3(0.02, 0.65, 0.35); // Green
          } else if (ribbonCoord > -0.08 && ribbonCoord <= -0.03) {
            col = vec3(0.88, 0.08, 0.12); // Red
          }

        } else if (uCardType == 47) {
          // ── 47. LAKING NATIONAL GRAPHIC LAYERED STRATA ──
          vec3 nbsRed = vec3(0.78, 0.06, 0.10);
          col = nbsRed;

          float spineLines = sin((vUv.x * 0.5 + vUv.y) * 45.0);
          float sMask = smoothstep(0.2, 0.8, spineLines);
          col += vec3(0.12, 0.02, 0.02) * sMask;

          float goldLine = smoothstep(0.005, 0.0, abs(vUv.y - 0.22));
          col = mix(col, vec3(0.98, 0.85, 0.40), goldLine * 0.75);

        } else if (uCardType == 48) {
          // ── 48. GRABPAY VIVID EMERALD GREEN ──
          vec3 grabGreenDark = vec3(0.0, 0.55, 0.24); // #008C3E
          vec3 grabGreenBright = vec3(0.0, 0.69, 0.31); // #00B14F
          col = mix(grabGreenDark, grabGreenBright, vUv.y * 0.6 + vUv.x * 0.4);

          float grabSheen = smoothstep(0.22, 0.0, abs(vUv.x - uLightPos.x)) * (uShineIntensity + 0.35);
          col += vec3(0.85, 1.0, 0.85) * grabSheen * 0.40;

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

        // 3. EMV Smart Chip - Rendered for all cards (disabled only for Physical Cash Wallet)
        bool hasChip = (uCardType != 13);
        if (hasChip) {
          vec2 chipCenter = (uCardType == 0) ? vec2(0.185, 0.68) : vec2(0.190, 0.54);
          vec2 chipHalfSize = (uCardType == 0) ? vec2(0.075, 0.11) : vec2(0.062, 0.085);
          float dChip = sdRoundedBox(vUv - chipCenter, chipHalfSize, (uCardType == 0) ? 0.018 : 0.015);
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

        // 4. Contactless / NFC Wave - Only for cards with EMV chip
        if (hasChip) {
          vec2 nfcCenter = (uCardType == 0) ? vec2(0.300, 0.68) : vec2(0.285, 0.54);
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

        // 5. GEKO Modern Silver Chrome Logo (Top-Right) - For default GEKO Total card
        if (uCardType == 0) {
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
        }

        // 6. Payment Network Logo (Disabled for GEKO Card and Cash Wallet)
        if (uCardType != 0 && uCardType != 13) {
          if (uNetwork == 1) {
            // Mastercard Red & Yellow Interlocking Circles Emblem
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
        }

        // 7. EMBOSSED CARD BALANCE & DETAILS (Rendered directly ON the physical card!)
        vec4 textSample = texture2D(uTextTexture, vUv);
        if (textSample.a > 0.05) {
          vec3 textColor;
          if (uCardType == 2 && vUv.y < 0.40) {
            // GoTyme: Sleek dark obsidian lettering on bottom electric cyan half (matching real card)
            textColor = vec3(0.06, 0.08, 0.12);
          } else if (uCardType == 6) {
            // PNB Gold Visa: Deep obsidian / navy black embossed lettering for contrast on Gold
            textColor = vec3(0.08, 0.06, 0.02);
          } else if (uNetwork == 2 && vUv.x > 0.70 && vUv.y < 0.25) {
            // Visa Embossed Letters: Pure bright white with metallic gleam (transparent background)
            vec3 visaWhite = mix(vec3(0.96, 0.98, 1.0), vec3(1.0, 1.0, 1.0), vUv.y);
            float visaLight = pow(max(0.0, 1.0 - length(vUv - uLightPos) * 1.5), 10.0) * 0.75;
            textColor = visaWhite + vec3(visaLight);
          } else {
            // Crisp bright white embossed lettering with specular gleam
            vec3 textWhite = mix(vec3(0.95, 0.97, 1.0), vec3(1.0, 1.0, 1.0), vUv.y);
            float textLightDist = length(vUv - uLightPos);
            float textGlint = pow(max(0.0, 1.0 - textLightDist * 1.5), 14.0) * 1.1;
            textWhite += vec3(textGlint);
            textColor = textWhite;
          }
          col = mix(col, textColor, textSample.a);
        }

        // 8. Dynamic & Ambient Shining Metallic Light Sweep (Visible resting on Home screen & when tilted)
        float sweepCoord = vUv.x + vUv.y * 0.45;
        float sweepCenter = uLightPos.x * 1.4 + 0.1;
        float baseShine = max(uShineIntensity, 0.28); // Ambient 3D metallic sheen on Home screen resting cards!
        float sweep = smoothstep(0.26, 0.0, abs(sweepCoord - sweepCenter)) * baseShine;
        
        vec3 holoRainbow = 0.5 + 0.5 * cos(6.28318 * (sweepCoord * 1.5 + uTime * 0.20 + vec3(0.0, 0.33, 0.67)));
        vec3 pureSilverSheen = vec3(0.96, 0.98, 1.0) * sweep * 0.45;
        vec3 holographicGleam = holoRainbow * sweep * 0.25;
        
        col += pureSilverSheen + holographicGleam;

        // 10. 3D Outer Bevel Rim Light & Ambient Occlusion (Makes cards pop with real 3D physical depth)
        vec2 bUv = abs(vUv - vec2(0.5)) * 2.0;
        float edgeDist = max(bUv.x, bUv.y);
        float rimGleam = smoothstep(0.92, 0.98, edgeDist) * smoothstep(1.0, 0.98, edgeDist);
        col += vec3(0.90, 0.95, 1.0) * rimGleam * 0.35;

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
      uColor1: { value: _targetC1.clone() },
      uColor2: { value: _targetC2.clone() },
      uCardType: { value: getCardTypeInt(accountType, bankName) },
    };

    const backFragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uLightPos;
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
        vec3 col = mix(uColor1, uColor2, vUv.y * 0.8 + vUv.x * 0.2);
        if (uCardType == 4) {
          col = mix(vec3(0.68, 0.05, 0.35), vec3(0.88, 0.10, 0.42), vUv.y * 0.6 + vUv.x * 0.4);
        }

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

      const { color1: curC1, color2: curC2, accountType: curAcc, bankName: curBnk, paymentNetwork: curNet } = cardPropsRef.current;

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
      frontUniforms.uNetwork.value = getNetworkInt(curNet, curAcc, curBnk);

      backUniforms.uColor1.value.copy(frontUniforms.uColor1.value);
      backUniforms.uColor2.value.copy(frontUniforms.uColor2.value);
      backUniforms.uCardType.value = frontUniforms.uCardType.value;

      if (interactive) {
        // Silky smooth damped lerping: 0.22 when dragging for buttery response, 0.12 when returning
        const lerpSpeed = touchActive.current ? 0.22 : 0.12;
        rotX.current += (targetRotX.current - rotX.current) * lerpSpeed;
        rotY.current += (targetRotY.current - rotY.current) * lerpSpeed;
        currentFlipY.current += (targetFlipY.current - currentFlipY.current) * 0.16;

        // Dynamic camera pullback along Z: as the card rotates in 3D, its leading edge moves towards the camera.
        // Pulling back smoothly ensures the rotated corners and edges never balloon in screen-space NDC,
        // keeping the entire card 100% visible with zero clipping!
        if (!isSmallCard) {
          const forwardZ =
            (CARD_WIDTH_3D / 2.0) * Math.sin(Math.abs(rotY.current)) +
            (CARD_HEIGHT_3D / 2.0) * Math.sin(Math.abs(rotX.current));
          camera.position.z = baseCameraZ + forwardZ * 0.95;
        }

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
        if (!isSmallCard) {
          camera.position.z = baseCameraZ;
        }
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
  }, [height, color1, color2, accountType, bankName, paymentNetwork, updateCardText, cornerRadius]);

  const isSmallCard = height < 200;
  const wrapperBg = 'transparent';
  const glOpacity = isSmallCard ? (isGlReady ? 1 : 0) : 1;

  return (
    <View style={styles.outerContainer}>
      {/* Full 3D WebGL Canvas */}
      <View
        style={[
          styles.canvasWrapper,
          {
            height,
            backgroundColor: wrapperBg,
            borderRadius: isSmallCard ? 12 : 0,
            overflow: isSmallCard ? 'hidden' : 'visible',
          },
        ]}
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
    overflow: 'visible',
    position: 'relative',
    backgroundColor: 'transparent',
  },
});
