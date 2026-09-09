import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── In-memory cache (synchronous reads for useTheme & useCurrency) ───────
let _theme: 'light' | 'dark' = 'dark';
let _displayName: string | undefined = undefined;
let _currency: 'PHP' | 'USD' = 'PHP';
const _listeners = new Set<() => void>();

const notify = () => _listeners.forEach((fn) => fn());

// ─── Load persisted values on startup ─────────────────────────────────────
export const initUserStore = async () => {
  try {
    const [theme, name, currency] = await AsyncStorage.multiGet(['theme', 'displayName', 'currency']);
    if (theme[1]) _theme = theme[1] as 'light' | 'dark';
    if (name[1]) _displayName = name[1];
    if (currency[1]) _currency = currency[1] as 'PHP' | 'USD';
    notify();
  } catch (e) {
    console.warn('userStore: failed to load persisted values', e);
  }
};

// ─── Subscribe helper (for useSyncExternalStore) ───────────────────────────
export const subscribeUserStore = (listener: () => void) => {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
};

// ─── Theme ─────────────────────────────────────────────────────────────────
export const getTheme = (): 'light' | 'dark' => _theme;

export const setTheme = (theme: 'light' | 'dark') => {
  _theme = theme;
  notify();
  AsyncStorage.setItem('theme', theme).catch(console.warn);
};

// ─── Currency ──────────────────────────────────────────────────────────────
export const getCurrency = (): 'PHP' | 'USD' => _currency;

export const setCurrency = (currency: 'PHP' | 'USD') => {
  _currency = currency;
  notify();
  AsyncStorage.setItem('currency', currency).catch(console.warn);
};

// ─── Display name ──────────────────────────────────────────────────────────
export const getDisplayName = (): string | undefined => _displayName;

export const setDisplayName = (name: string) => {
  _displayName = name;
  notify();
  AsyncStorage.setItem('displayName', name).catch(console.warn);
};
