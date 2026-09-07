import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── In-memory cache (synchronous reads for useTheme) ─────────────────────
let _theme: 'light' | 'dark' = 'dark';
let _displayName: string | undefined = undefined;
const _listeners = new Set<() => void>();

const notify = () => _listeners.forEach((fn) => fn());

// ─── Load persisted values on startup ─────────────────────────────────────
export const initUserStore = async () => {
  try {
    const [theme, name] = await AsyncStorage.multiGet(['theme', 'displayName']);
    if (theme[1]) _theme = theme[1] as 'light' | 'dark';
    if (name[1]) _displayName = name[1];
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

// ─── Display name ──────────────────────────────────────────────────────────
export const getDisplayName = (): string | undefined => _displayName;

export const setDisplayName = (name: string) => {
  _displayName = name;
  notify();
  AsyncStorage.setItem('displayName', name).catch(console.warn);
};
