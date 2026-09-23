export interface BankTheme {
  bg1: string;
  bg2: string;
  textColor: string;
  isDark: boolean;
  network: 'VISA' | 'MASTERCARD' | 'OTHER';
  logoText: string;
}

export const BANK_THEMES: Record<string, BankTheme> = {
  gcash: { bg1: '#0026B3', bg2: '#0055FF', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: '(G)) GCash' },
  gotyme: { bg1: '#0F172A', bg2: '#00D2C8', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'GoTyme Bank' },
  bpi: { bg1: '#8B0000', bg2: '#C8102E', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'BPI' },
  maya: { bg1: '#6A0036', bg2: '#9C0052', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'maya' },
  unionbank: { bg1: '#D0ECE7', bg2: '#A3D9CF', textColor: '#1E293B', isDark: false, network: 'MASTERCARD', logoText: 'UnionBank' },
  ub: { bg1: '#D0ECE7', bg2: '#A3D9CF', textColor: '#1E293B', isDark: false, network: 'MASTERCARD', logoText: 'UnionBank' },
  rcbc: { bg1: '#7A5B0B', bg2: '#C8981A', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'RCBC' },
  gold: { bg1: '#7A5B0B', bg2: '#C8981A', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'RCBC' },
  wise: { bg1: '#76FF03', bg2: '#64DD17', textColor: '#0F172A', isDark: false, network: 'MASTERCARD', logoText: 'Wise' },
  pnb: { bg1: '#B8860B', bg2: '#D4AF37', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'PNB' },
  bdo: { bg1: '#002B66', bg2: '#004080', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'BDO' },
  maribank: { bg1: '#7A0F05', bg2: '#FA5210', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'MariBank' },
  seabank: { bg1: '#7A0F05', bg2: '#FA5210', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'MariBank' },
  metrobank: { bg1: '#002277', bg2: '#0044CC', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'Metrobank' },
  landbank: { bg1: '#004D25', bg2: '#0A8A43', textColor: '#FFFFFF', isDark: true, network: 'MASTERCARD', logoText: 'Landbank' },
  cash: { bg1: '#0B0D12', bg2: '#171A1F', textColor: '#FFFFFF', isDark: true, network: 'OTHER', logoText: 'Geko Cash' },
  visa: { bg1: '#1A1F71', bg2: '#0055FF', textColor: '#FFFFFF', isDark: true, network: 'VISA', logoText: 'Visa' },
};

export const getBankTheme = (bankName: string, fallbackC1?: string, fallbackC2?: string): BankTheme => {
  const key = (bankName || '').toLowerCase().trim();
  for (const [k, theme] of Object.entries(BANK_THEMES)) {
    if (key.includes(k)) return theme;
  }
  return {
    bg1: fallbackC1 || '#1E293B',
    bg2: fallbackC2 || '#334155',
    textColor: '#FFFFFF',
    isDark: true,
    network: (bankName.toLowerCase().includes('visa') ? 'VISA' : 'MASTERCARD') as 'VISA' | 'MASTERCARD' | 'OTHER',
    logoText: bankName,
  };
};
