import { formatDistanceToNow } from 'date-fns';
import { getCurrency } from '../store/userStore';

export const formatCurrency = (amount: number, customCurrency?: 'PHP' | 'USD'): string => {
  const currency = customCurrency || getCurrency();
  const absAmount = Math.abs(amount || 0);
  const formattedNumber = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const symbol = currency === 'PHP' ? '₱' : '$';
  return `${amount < 0 ? '-' : ''}${symbol}${formattedNumber}`;
};

export const formatRelativeTime = (timestamp: number): string => {
  return formatDistanceToNow(timestamp, { addSuffix: true });
};
