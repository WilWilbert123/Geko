import { useSyncExternalStore } from 'react';
import { getCurrency, setCurrency, subscribeUserStore } from '../store/userStore';

export const useCurrency = () => {
  const currency = useSyncExternalStore(subscribeUserStore, getCurrency);

  const toggleCurrency = () => {
    setCurrency(currency === 'PHP' ? 'USD' : 'PHP');
  };

  return {
    currency,
    setCurrency,
    toggleCurrency,
    symbol: currency === 'PHP' ? '₱' : '$',
  };
};
