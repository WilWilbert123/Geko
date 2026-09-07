import { useSyncExternalStore } from 'react';
import { getTheme, subscribeUserStore } from '../store/userStore';
import { colors } from '../theme/colors';

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribeUserStore, getTheme);

  return {
    theme,
    colors: colors[theme],
  };
};
