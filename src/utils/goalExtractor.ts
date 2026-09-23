import { Goal } from '../hooks/useGoals';

export const PRESET_GOAL_FALLBACKS: Record<string, string> = {
  drone: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=800',
  onexplayer: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=800',
  gaming: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=800',
  console: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=800',
  car: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800',
  kotse: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800',
  laptop: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800',
  macbook: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800',
  travel: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800',
  house: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800',
  bahay: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800',
  phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800',
  iphone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800',
};

export const getGoalImageUri = (goal: Goal): string => {
  if (goal.imageUrl && goal.imageUrl.trim().length > 0) {
    return goal.imageUrl;
  }
  const titleLower = (goal.title || '').toLowerCase();
  for (const [key, uri] of Object.entries(PRESET_GOAL_FALLBACKS)) {
    if (titleLower.includes(key)) {
      return uri;
    }
  }
  return 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=800';
};

export const extractGoalsFromText = (text: string, goals: Goal[]): Goal[] => {
  if (!text || goals.length === 0) return [];
  const textLower = text.toLowerCase();

  const matchedGoals: Goal[] = [];

  for (const goal of goals) {
    const titleLower = goal.title.toLowerCase();
    if (textLower.includes(titleLower)) {
      matchedGoals.push(goal);
    } else {
      const words = titleLower.split(/\s+/).filter(w => w.length >= 3);
      if (words.some(w => textLower.includes(w))) {
        matchedGoals.push(goal);
      }
    }
  }

  if (
    matchedGoals.length === 0 &&
    (textLower.includes('savings goals') ||
      textLower.includes('active savings goals') ||
      textLower.includes('goal breakdown') ||
      textLower.includes('🎯'))
  ) {
    return goals;
  }

  const uniqueMap = new Map<string, Goal>();
  matchedGoals.forEach(g => uniqueMap.set(g.id, g));
  return Array.from(uniqueMap.values());
};
