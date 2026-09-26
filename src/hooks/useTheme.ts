import { useSyncExternalStore } from 'react';
import { getTheme, setTheme, subscribeUserStore } from '../store/userStore';
import { colors } from '../theme/colors';

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribeUserStore, getTheme);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return {
    theme,
    colors: colors[theme],
    toggleTheme,
    isDark: theme === 'dark',
  };
};
