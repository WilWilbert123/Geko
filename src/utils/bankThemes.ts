import { findPresetByName, ALL_CARD_PRESETS } from './cardPresets';

export interface BankTheme {
  bg1: string;
  bg2: string;
  textColor: string;
  isDark: boolean;
  network: 'VISA' | 'MASTERCARD' | 'OTHER';
  logoText: string;
}

export const BANK_THEMES: Record<string, BankTheme> = {
  gcash: { bg1: '#0026B3', bg2: '#0055FF', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'GCash' },
  gotyme: { bg1: '#0F172A', bg2: '#00D2C8', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'GoTyme Bank' },
  bpi: { bg1: '#8B0000', bg2: '#C8102E', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'BPI' },
  maya: { bg1: '#0B0E14', bg2: '#00E676', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'maya' },
  unionbank: { bg1: '#C2410C', bg2: '#EA580C', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'UnionBank' },
  ub: { bg1: '#C2410C', bg2: '#EA580C', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'UnionBank' },
  rcbc: { bg1: '#1E3A8A', bg2: '#3B82F6', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'RCBC' },
  gold: { bg1: '#7A5B0B', bg2: '#C8981A', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'RCBC' },
  wise: { bg1: '#14532D', bg2: '#84CC16', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'Wise' },
  pnb: { bg1: '#854D0E', bg2: '#EAB308', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'PNB' },
  bdo: { bg1: '#002B66', bg2: '#004080', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'BDO' },
  maribank: { bg1: '#7A0F05', bg2: '#FA5210', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'MariBank' },
  seabank: { bg1: '#C2410C', bg2: '#FF6B00', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'SeaBank' },
  metrobank: { bg1: '#002277', bg2: '#0044CC', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'Metrobank' },
  landbank: { bg1: '#004D25', bg2: '#0A8A43', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'Landbank' },
  security: { bg1: '#003830', bg2: '#007366', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'Security Bank' },
  eastwest: { bg1: '#4A044E', bg2: '#86198F', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'EastWest' },
  hsbc: { bg1: '#7F1D1D', bg2: '#DC2626', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'HSBC' },
  chinabank: { bg1: '#7F1D1D', bg2: '#B91C1C', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'Chinabank' },
  grabpay: { bg1: '#022C22', bg2: '#059669', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'GrabPay' },
  shopee: { bg1: '#9A3412', bg2: '#EA580C', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'ShopeePay' },
  payoneer: { bg1: '#1E1B4B', bg2: '#F97316', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'Payoneer' },
  paypal: { bg1: '#003087', bg2: '#0079C1', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'PayPal' },
  beep: { bg1: '#1E1B4B', bg2: '#2563EB', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'beep™' },
  cliqq: { bg1: '#18181B', bg2: '#EA580C', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: '7-Eleven CLiQQ' },
  cimb: { bg1: '#7F1D1D', bg2: '#DC2626', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'CIMB Bank' },
  tonik: { bg1: '#3B0764', bg2: '#9333EA', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'Tonik' },
  ownbank: { bg1: '#14532D', bg2: '#22C55E', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'OwnBank' },
  komo: { bg1: '#0E7490', bg2: '#06B6D4', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'Komo' },
  salmon: { bg1: '#9F1239', bg2: '#F43F5E', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'Salmon' },
  diskartech: { bg1: '#0F766E', bg2: '#84CC16', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'DiskarTech' },
  uno: { bg1: '#0B0B10', bg2: '#1E1B4B', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'UNO Bank' },
  uniondigital: { bg1: '#4C1D95', bg2: '#7C3AED', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'UnionDigital' },
  ofbank: { bg1: '#002277', bg2: '#0284C7', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'OFBank' },
  netbank: { bg1: '#18181B', bg2: '#3F3F46', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'Netbank' },
  zed: { bg1: '#713F12', bg2: '#EAB308', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'ZED' },
  starbucks: { bg1: '#022C22', bg2: '#059669', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Starbucks' },
  autosweep: { bg1: '#334155', bg2: '#10B981', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Autosweep RFID' },
  easytrip: { bg1: '#09090B', bg2: '#0284C7', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Easytrip RFID' },
  bistro: { bg1: '#0A0A0A', bg2: '#171717', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'The Bistro Group' },
  landers: { bg1: '#2E1A09', bg2: '#784D1E', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Landers' },
  mercury: { bg1: '#0F172A', bg2: '#DC2626', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Mercury Drug' },
  national: { bg1: '#7F1D1D', bg2: '#DC2626', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Laking National' },
  puregold: { bg1: '#022C22', bg2: '#064E3B', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Puregold Perks' },
  robinsons: { bg1: '#7F1D1D', bg2: '#EF4444', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Robinsons Rewards' },
  smac: { bg1: '#1E3A8A', bg2: '#2563EB', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'SM SMAC' },
  luvit: { bg1: '#052E16', bg2: '#166534', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'Luvit' },
  cash: { bg1: '#0B0D12', bg2: '#171A1F', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Physical Cash' },
  visa: { bg1: '#1A1F71', bg2: '#0055FF', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'Visa' },
};

export const getBankTheme = (bankName: string, fallbackC1?: string, fallbackC2?: string): BankTheme => {
  const raw = (bankName || '').trim();
  const lower = raw.toLowerCase();

  // 1. Direct or partial preset lookup
  const preset = findPresetByName(raw);
  if (preset) {
    return {
      bg1: fallbackC1 || preset.color1,
      bg2: fallbackC2 || preset.color2,
      textColor: '#FFFFFF',
      isDark: true,
      network: preset.network,
      logoText: preset.shortName,
    };
  }

  // 2. Direct E-Wallet match for GCash (Never match with physical cash!)
  if (lower.includes('gcash')) {
    const theme = BANK_THEMES.gcash;
    let resolvedNetwork: 'VISA' | 'MASTERCARD' | 'OTHER' = theme.network;
    if (lower.includes('mastercard') || lower.includes('mc')) resolvedNetwork = 'MASTERCARD';
    else if (lower.includes('visa')) resolvedNetwork = 'VISA';

    return {
      bg1: fallbackC1 || theme.bg1,
      bg2: fallbackC2 || theme.bg2,
      textColor: theme.textColor,
      isDark: theme.isDark,
      network: resolvedNetwork,
      logoText: 'GCash',
    };
  }

  // 3. Keyword scan in BANK_THEMES
  for (const [k, theme] of Object.entries(BANK_THEMES)) {
    if (k === 'cash' && lower.includes('gcash')) continue;
    if (lower.includes(k)) {
      // Determine if name specifies Visa or Mastercard explicitly
      let resolvedNetwork = theme.network;
      if (lower.includes('visa')) resolvedNetwork = 'VISA';
      else if (lower.includes('mastercard') || lower.includes('mc')) resolvedNetwork = 'MASTERCARD';

      return {
        bg1: fallbackC1 || theme.bg1,
        bg2: fallbackC2 || theme.bg2,
        textColor: theme.textColor,
        isDark: theme.isDark,
        network: resolvedNetwork,
        logoText: raw || theme.logoText,
      };
    }
  }

  // 4. Network detection fallback
  const isVisa = lower.includes('visa');
  const isMC = lower.includes('mastercard') || lower.includes('mc');
  const isTransitOrCash = lower.includes('beep') || lower.includes('transit') || (!lower.includes('gcash') && lower.includes('cash')) || lower.includes('cliqq');

  return {
    bg1: fallbackC1 || '#1E293B',
    bg2: fallbackC2 || '#334155',
    textColor: '#FFFFFF',
    isDark: true,
    network: isTransitOrCash ? 'OTHER' : isVisa ? 'VISA' : isMC ? 'MASTERCARD' : 'MASTERCARD',
    logoText: raw,
  };
};
