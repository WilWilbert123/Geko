import { formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatRelativeTime = (timestamp: number): string => {
  return formatDistanceToNow(timestamp, { addSuffix: true });
};
