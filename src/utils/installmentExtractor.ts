import { Installment } from '../hooks/useInstallments';

export const PRESET_INSTALLMENT_FALLBACKS: Record<string, string> = {
  car: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800',
  kotse: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800',
  auto: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800',
  iphone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800',
  phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800',
  cellphone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800',
  laptop: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800',
  macbook: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800',
  motorcycle: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=800',
  motor: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=800',
  tv: 'https://images.unsplash.com/photo-1593784991095-87710dac9921?q=80&w=800',
  television: 'https://images.unsplash.com/photo-1593784991095-87710dac9921?q=80&w=800',
  appliance: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800',
  fridge: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800',
  aircon: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800',
  watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800',
};

export const getInstallmentImageUri = (inst: Installment): string => {
  if (inst.imageUrl && inst.imageUrl.trim().length > 0) {
    return inst.imageUrl;
  }
  const titleLower = (inst.title || '').toLowerCase();
  for (const [key, uri] of Object.entries(PRESET_INSTALLMENT_FALLBACKS)) {
    if (titleLower.includes(key)) {
      return uri;
    }
  }
  return 'https://images.unsplash.com/photo-1556742049-0a67daf4005a?q=80&w=800';
};

export const extractInstallmentsFromText = (text: string, installments: Installment[]): Installment[] => {
  if (!text || installments.length === 0) return [];
  const textLower = text.toLowerCase();

  // Require explicit installment topic context in text
  const isExplicitInstallmentText =
    textLower.includes('installment') ||
    textLower.includes('installments') ||
    textLower.includes('hulugan') ||
    textLower.includes('cut-off status') ||
    textLower.includes('/cut-off') ||
    textLower.includes('cut-off');

  if (!isExplicitInstallmentText) {
    return [];
  }

  const matched: Installment[] = [];

  for (const inst of installments) {
    const titleLower = inst.title.trim().toLowerCase();
    if (!titleLower) continue;
    
    // Exact word boundary regex to prevent "card" from matching installment named "Car"
    const escapedTitle = titleLower.replace(/[^a-z0-9]/g, '');
    const regex = new RegExp(`\\b${escapedTitle}\\b`, 'i');

    if (regex.test(textLower) || textLower.includes(`**${titleLower}**`)) {
      matched.push(inst);
    }
  }

  if (matched.length === 0) {
    return installments;
  }

  const uniqueMap = new Map<string, Installment>();
  matched.forEach(i => uniqueMap.set(i.id, i));
  return Array.from(uniqueMap.values());
};
