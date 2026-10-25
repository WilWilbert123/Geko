import React, { useMemo } from 'react';
import { View, StyleSheet, Text as RnText } from 'react-native';
import Svg, {
  Rect,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Line,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { getBankTheme } from '../../utils/bankThemes';
import { formatCurrency } from '../../utils/formatters';

export interface MiniRealCardProps {
  bankName: string;
  color1?: string;
  color2?: string;
  type?: string;
  paymentNetwork?: 'VISA' | 'MASTERCARD' | 'OTHER';
  cardNumber?: string;
  balance?: number;
  width?: number;
  height?: number;
}

/**
 * Returns a short, recognizable uppercase brand name for display on the mini card.
 */
export const getShortBankBrand = (bankName: string): string => {
  if (!bankName) return 'CARD';
  const raw = bankName.trim();
  const lower = raw.toLowerCase();

  if (lower.includes('gotyme')) return 'GOTYME BANK';
  if (lower.includes('maya')) return 'MAYA';
  if (lower.includes('gcash')) return 'GCASH';
  if (lower.includes('security')) return 'SECURITY BANK';
  if (lower.includes('physical cash') || lower === 'cash') return 'CASH WALLET';
  if (lower.includes('autosweep')) return 'AUTOSWEEP';
  if (lower.includes('easytrip')) return 'EASYTRIP';
  if (lower.includes('7-eleven') || lower.includes('7eleven') || lower.includes('cliqq')) return '7-ELEVEN';
  if (lower.includes('bpi')) return 'BPI';
  if (lower.includes('bdo')) return 'BDO';
  if (lower.includes('unionbank') || lower.includes('union bank')) return 'UNIONBANK';
  if (lower.includes('metrobank')) return 'METROBANK';
  if (lower.includes('landbank')) return 'LANDBANK';
  if (lower.includes('rcbc')) return 'RCBC';
  if (lower.includes('seabank')) return 'SEABANK';
  if (lower.includes('maribank')) return 'MARIBANK';
  if (lower.includes('cimb')) return 'CIMB BANK';
  if (lower.includes('tonik')) return 'TONIK';
  if (lower.includes('ownbank')) return 'OWNBANK';
  if (lower.includes('komo')) return 'KOMO';
  if (lower.includes('eastwest')) return 'EASTWEST';
  if (lower.includes('chinabank')) return 'CHINABANK';
  if (lower.includes('pnb')) return 'PNB';
  if (lower.includes('hsbc')) return 'HSBC';
  if (lower.includes('grab')) return 'GRABPAY';
  if (lower.includes('shopee')) return 'SHOPEE';
  if (lower.includes('wise')) return 'WISE';
  if (lower.includes('paypal')) return 'PAYPAL';
  if (lower.includes('beep')) return 'BEEP™';

  const firstWord = raw.split(' ')[0];
  if (firstWord && firstWord.length <= 12) return firstWord.toUpperCase();
  return raw.slice(0, 10).toUpperCase();
};

export const MiniRealCard: React.FC<MiniRealCardProps> = ({
  bankName,
  color1,
  color2,
  type,
  paymentNetwork,
  cardNumber,
  balance,
  width = 58,
  height = 36,
}) => {
  const theme = useMemo(() => getBankTheme(bankName, color1, color2), [bankName, color1, color2]);
  const c1 = color1 || theme.bg1 || '#0F172A';
  const c2 = color2 || theme.bg2 || '#1E293B';

  const lower = (bankName || '').toLowerCase();
  const net = (paymentNetwork || theme.network || 'OTHER').toUpperCase();

  const isGoTyme = lower.includes('gotyme') || lower.includes('go-tyme') || lower.includes('go tyme');
  const isGCash = lower.includes('gcash');
  const isMaya = lower.includes('maya');
  const isBPI = lower.includes('bpi');
  const isBDO = lower.includes('bdo');
  const isUnionBank = lower.includes('unionbank') || lower.includes('union bank');

  const isVisa =
    net === 'VISA' ||
    lower.includes('visa') ||
    isGoTyme; // GoTyme cards in the PH are Visa debit

  const isMastercard =
    !isVisa && (
      net === 'MASTERCARD' ||
      lower.includes('mastercard') ||
      lower.includes('master') ||
      lower.includes('mc')
    );

  const isCash = type === 'CASH' || (lower.includes('cash') && !lower.includes('gcash'));
  const shortBrand = useMemo(() => getShortBankBrand(bankName), [bankName]);

  // Formatted balance text for card face (matching real card display)
  const displayBalanceStr = useMemo(() => {
    if (balance !== undefined && balance !== null) {
      return formatCurrency(balance);
    }
    if (isGoTyme) return '₱3,500.00';
    return '₱1,000.00';
  }, [balance, isGoTyme]);

  // Unique ID prefix for SVG defs to avoid collisions
  const idPrefix = useMemo(() => {
    const safeStr = (bankName + c1).replace(/[^a-zA-Z0-9]/g, '');
    return `mini_card_${safeStr}_${Math.floor(Math.random() * 10000)}`;
  }, [bankName, c1]);

  const bgGradId = `${idPrefix}_bg`;
  const glossGradId = `${idPrefix}_gloss`;
  const chipGradId = `${idPrefix}_chip`;
  const gotymeCyanGradId = `${idPrefix}_gt_cyan`;

  // Dynamic proportional dimensions for elements inside the mini card
  const chipX = Math.round(width * 0.08);
  const chipY = Math.round(height * 0.28);
  const chipW = Math.max(9, Math.round(width * 0.16));
  const chipH = Math.max(7, Math.round(chipW * 0.72));

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Card Base Gradient */}
          <LinearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isGoTyme ? '#070D18' : c1} stopOpacity="1" />
            <Stop offset="100%" stopColor={isGoTyme ? '#0B0F19' : c2} stopOpacity="1" />
          </LinearGradient>

          {/* GoTyme Bottom Cyan Gradient */}
          <LinearGradient id={gotymeCyanGradId} x1="0%" y1="0%" x2="100%" y2="20%">
            <Stop offset="0%" stopColor="#00C4BA" stopOpacity="1" />
            <Stop offset="40%" stopColor="#00D2C8" stopOpacity="1" />
            <Stop offset="100%" stopColor="#00ECE3" stopOpacity="1" />
          </LinearGradient>

          {/* Diagonal Glass Sheen Highlight */}
          <LinearGradient id={glossGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
            <Stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>

          {/* Metallic Gold EMV Chip */}
          <LinearGradient id={chipGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFF1B8" stopOpacity="1" />
            <Stop offset="45%" stopColor="#F59E0B" stopOpacity="1" />
            <Stop offset="100%" stopColor="#B45309" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* 1. Base Card Surface */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={5}
          ry={5}
          fill={`url(#${bgGradId})`}
        />

        {/* ── GOTYME AUTHENTIC REAL CARD DESIGN (1:1 with real GoTyme Visa Debit) ── */}
        {isGoTyme && (
          <G>
            {/* Top dark background is handled by #070D18 base */}

            {/* Top bank identifier bar / text on line 1 */}
            <SvgText
              x={width * 0.08}
              y={height * 0.16}
              fill="#00D2C8"
              fontSize={Math.max(3.8, height * 0.085)}
              fontWeight="800"
              letterSpacing={0.4}
            >
              GOTYME BANK VISA DEBIT CARD
            </SvgText>

            {/* Iconic GoTyme Horizontal Cyan Stripes Grid */}
            <Line x1={0} y1={height * 0.20} x2={width} y2={height * 0.20} stroke="#00D2C8" strokeWidth={0.9} opacity={0.8} />
            <Line x1={0} y1={height * 0.27} x2={width} y2={height * 0.27} stroke="#00D2C8" strokeWidth={1.0} opacity={0.85} />
            <Line x1={0} y1={height * 0.34} x2={width} y2={height * 0.34} stroke="#00D2C8" strokeWidth={1.1} opacity={0.9} />
            <Line x1={0} y1={height * 0.41} x2={width} y2={height * 0.41} stroke="#00D2C8" strokeWidth={1.2} opacity={0.95} />
            <Line x1={0} y1={height * 0.47} x2={width} y2={height * 0.47} stroke="#00D2C8" strokeWidth={1.3} opacity={1.0} />

            {/* Bottom Half: Radiant Solid Electric Cyan Section */}
            <Rect
              x={0}
              y={height * 0.50}
              width={width}
              height={height * 0.50}
              fill={`url(#${gotymeCyanGradId})`}
            />

            {/* Bottom Half: "BALANCE" label in dark obsidian */}
            <SvgText
              x={width * 0.08}
              y={height * 0.64}
              fill="#070D18"
              fontSize={Math.max(3.6, height * 0.08)}
              fontWeight="800"
              letterSpacing={0.5}
            >
              BALANCE
            </SvgText>

            {/* Bottom Half: Balance Amount in dark monospace */}
            <SvgText
              x={width * 0.08}
              y={height * 0.86}
              fill="#070D18"
              fontSize={Math.max(5.0, height * 0.14)}
              fontWeight="900"
              letterSpacing={-0.2}
            >
              {displayBalanceStr}
            </SvgText>

            {/* Bottom Right: Dark Obsidian VISA logo */}
            <SvgText
              x={width - 5}
              y={height * 0.86}
              textAnchor="end"
              fill="#070D18"
              fontSize={Math.max(6.0, height * 0.17)}
              fontWeight="900"
              fontStyle="italic"
              letterSpacing={0.4}
            >
              VISA
            </SvgText>
          </G>
        )}

        {/* ── GCash: Ripple Watermark Motif ── */}
        {isGCash && (
          <G>
            <Circle cx={width * 0.82} cy={height * 0.5} r={height * 0.4} stroke="#FFFFFF" strokeWidth={0.8} strokeOpacity={0.25} fill="none" />
            <Circle cx={width * 0.82} cy={height * 0.5} r={height * 0.7} stroke="#FFFFFF" strokeWidth={0.6} strokeOpacity={0.18} fill="none" />
          </G>
        )}

        {/* ── Maya: Angular Geometric Green Wave ── */}
        {isMaya && (
          <Path
            d={`M ${width * 0.65} 0 L ${width} 0 L ${width} ${height} L ${width * 0.42} ${height} Z`}
            fill="#059669"
            opacity={0.88}
          />
        )}

        {/* ── BDO: Golden Horizon Bar ── */}
        {isBDO && (
          <Rect x={0} y={height * 0.52} width={width} height={1.8} fill="#FFC72C" opacity={0.9} />
        )}

        {/* ── BPI: Diagonal Silk Ribbon Accent ── */}
        {isBPI && (
          <Path
            d={`M ${width * 0.48} 0 L ${width * 0.82} 0 L ${width * 0.36} ${height} L 0 ${height} Z`}
            fill="rgba(255,255,255,0.09)"
          />
        )}

        {/* ── UnionBank: Vibrant Angular Accent ── */}
        {isUnionBank && (
          <Path
            d={`M ${width * 0.55} 0 L ${width} 0 L ${width} ${height} L ${width * 0.72} ${height} Z`}
            fill="#F97316"
            opacity={0.4}
          />
        )}

        {/* 2. EMV Smart Chip (for all non-cash cards) */}
        {!isCash && (
          <G>
            <Rect
              x={chipX}
              y={chipY}
              width={chipW}
              height={chipH}
              rx={1.2}
              fill={`url(#${chipGradId})`}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={0.35}
            />
            {/* Micro circuit line accents */}
            <Line
              x1={chipX}
              y1={chipY + chipH * 0.5}
              x2={chipX + chipW}
              y2={chipY + chipH * 0.5}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={0.3}
            />
            <Line
              x1={chipX + chipW * 0.48}
              y1={chipY}
              x2={chipX + chipW * 0.48}
              y2={chipY + chipH}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={0.3}
            />
          </G>
        )}

        {/* 3. Contactless Payment Waves */}
        {!isCash && (
          <G opacity={isGoTyme ? 0.95 : 0.8}>
            <Path
              d={`M ${chipX + chipW + 2.5} ${chipY + chipH * 0.18} A 2.6 2.6 0 0 1 ${chipX + chipW + 2.5} ${chipY + chipH * 0.82}`}
              fill="none"
              stroke={isGoTyme ? '#00D2C8' : '#FFFFFF'}
              strokeWidth={0.55}
              strokeLinecap="round"
            />
            <Path
              d={`M ${chipX + chipW + 4.2} ${chipY + chipH * 0.05} A 4.2 4.2 0 0 1 ${chipX + chipW + 4.2} ${chipY + chipH * 0.95}`}
              fill="none"
              stroke={isGoTyme ? '#00D2C8' : '#FFFFFF'}
              strokeWidth={0.55}
              strokeLinecap="round"
            />
          </G>
        )}

        {/* 4. Non-GoTyme Standard Face Details */}
        {!isGoTyme && (
          <G>
            {/* Brand Header */}
            <SvgText
              x={width * 0.08}
              y={height * 0.22}
              fill="#FFFFFF"
              fontSize={Math.max(4.2, height * 0.105)}
              fontWeight="800"
              letterSpacing={0.3}
            >
              {shortBrand}
            </SvgText>

            {/* Balance Label */}
            <SvgText
              x={width * 0.08}
              y={height * 0.72}
              fill="rgba(255,255,255,0.6)"
              fontSize={Math.max(3.2, height * 0.075)}
              fontWeight="700"
              letterSpacing={0.4}
            >
              BALANCE
            </SvgText>

            {/* Balance Amount */}
            <SvgText
              x={width * 0.08}
              y={height * 0.88}
              fill="#FFFFFF"
              fontSize={Math.max(4.8, height * 0.13)}
              fontWeight="900"
            >
              {displayBalanceStr}
            </SvgText>

            {/* Network Logo */}
            {isVisa && (
              <SvgText
                x={width - 5}
                y={height * 0.88}
                textAnchor="end"
                fill="#FFFFFF"
                fontSize={Math.max(5.8, height * 0.16)}
                fontWeight="900"
                fontStyle="italic"
                letterSpacing={0.3}
              >
                VISA
              </SvgText>
            )}

            {isMastercard && (
              <G>
                <Circle cx={width - 11} cy={height * 0.80} r={3.2} fill="#EB001B" />
                <Circle cx={width - 7.5} cy={height * 0.80} r={3.2} fill="#F79E1B" fillOpacity={0.92} />
              </G>
            )}
          </G>
        )}

        {/* 5. Realistic Specular Diagonal Glass Highlight */}
        <Path
          d={`M 0 0 L ${width * 0.7} 0 L 0 ${height * 0.8} Z`}
          fill={`url(#${glossGradId})`}
        />

        {/* 6. Precision 3D Outer Rim Border */}
        <Rect
          x={0.5}
          y={0.5}
          width={width - 1}
          height={height - 1}
          rx={4.5}
          ry={4.5}
          fill="none"
          stroke={isGoTyme ? 'rgba(0, 210, 200, 0.45)' : 'rgba(255,255,255,0.22)'}
          strokeWidth={0.65}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.35,
    shadowRadius: 2.5,
    elevation: 3,
    backgroundColor: '#070D18',
  },
});
