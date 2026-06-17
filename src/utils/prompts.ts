// ============================================================
// SMART PROMPT SUGGESTIONS
// Generate contextual AI prompts based on user's current health data
// ============================================================

import type { Profile } from '../types';

export interface SuggestedPrompt {
  text: string;
  icon: string;
  category: 'hydration' | 'sleep' | 'habits' | 'nutrition' | 'general';
  priority: number; // 1-10, higher = show first
}

/**
 * Generate smart prompts based on user's health metrics
 * These help users know what to ask Aurora
 */
export function generateSmartPrompts(
  profile: Profile | null,
  todayStats: {
    hydrationPct: number;
    sleepHrs: number;
    sleepPct: number;
    habitsCompleted: number;
    habitsTotal: number;
    habitsPct: number;
    nutritionCalories: number;
    nutritionLogged: boolean;
  }
): SuggestedPrompt[] {
  const prompts: SuggestedPrompt[] = [];

  // ── HYDRATION PROMPTS
  if (todayStats.hydrationPct < 30) {
    prompts.push({
      text: "You're only " + Math.round(todayStats.hydrationPct) + "% hydrated - how can I catch up?",
      icon: 'Droplet',
      category: 'hydration',
      priority: 10, // URGENT
    });
  } else if (todayStats.hydrationPct < 60) {
    prompts.push({
      text: 'Tips to reach my water goal today?',
      icon: 'Droplet',
      category: 'hydration',
      priority: 8,
    });
  } else if (todayStats.hydrationPct >= 100) {
    prompts.push({
      text: 'I crushed my hydration goal! What next?',
      icon: 'Droplet',
      category: 'hydration',
      priority: 5,
    });
  }

  // ── SLEEP PROMPTS
  if (todayStats.sleepHrs > 0 && todayStats.sleepHrs < 6) {
    prompts.push({
      text: 'Why did I sleep poorly? How can I improve?',
      icon: 'Moon',
      category: 'sleep',
      priority: 9,
    });
  } else if (todayStats.sleepHrs >= 8 && todayStats.sleepHrs < 9) {
    prompts.push({
      text: 'Great sleep last night! What helped?',
      icon: 'Moon',
      category: 'sleep',
      priority: 6,
    });
  } else if (todayStats.sleepHrs >= 9) {
    prompts.push({
      text: 'I slept over 9 hours - is that healthy?',
      icon: 'Moon',
      category: 'sleep',
      priority: 5,
    });
  }

  // ── HABIT PROMPTS
  if (todayStats.habitsTotal > 0 && todayStats.habitsPct === 0) {
    prompts.push({
      text: "I haven't started habits yet. Any motivation?",
      icon: 'CheckSquare',
      category: 'habits',
      priority: 8,
    });
  } else if (todayStats.habitsPct > 0 && todayStats.habitsPct < 50) {
    prompts.push({
      text: 'How to stay consistent with habits?',
      icon: 'CheckSquare',
      category: 'habits',
      priority: 7,
    });
  } else if (todayStats.habitsTotal > 0 && todayStats.habitsPct >= 100) {
    prompts.push({
      text: 'Completed all habits! Ask Aurora for next challenge',
      icon: 'CheckSquare',
      category: 'habits',
      priority: 6,
    });
  }

  // ── NUTRITION PROMPTS
  if (!todayStats.nutritionLogged) {
    prompts.push({
      text: 'Log my meals and get nutrition insights',
      icon: 'Salad',
      category: 'nutrition',
      priority: 6,
    });
  } else if (todayStats.nutritionCalories > 0 && todayStats.nutritionCalories < 1200) {
    prompts.push({
      text: "I've eaten very little. Should I eat more?",
      icon: 'Salad',
      category: 'nutrition',
      priority: 7,
    });
  } else if (todayStats.nutritionCalories > 3000) {
    prompts.push({
      text: 'How many calories did I eat today?',
      icon: 'Salad',
      category: 'nutrition',
      priority: 5,
    });
  }

  // ── GENERAL WELLNESS PROMPTS
  prompts.push({
    text: 'How am I doing overall today?',
    icon: 'Target',
    category: 'general',
    priority: 4,
  });

  prompts.push({
    text: 'What should I focus on this week?',
    icon: 'Target',
    category: 'general',
    priority: 3,
  });

  // ── SORT BY PRIORITY & RETURN TOP 3
  return prompts
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

/**
 * Get a smart greeting based on time and user data
 */
export function getSmartGreeting(name: string, todayStats: {
  hydrationPct: number;
  habitsPct: number;
  sleepHrs: number;
}): string {
  const hour = new Date().getHours();

  let timeGreeting = '';
  if (hour < 12) timeGreeting = 'Good morning';
  else if (hour < 17) timeGreeting = 'Good afternoon';
  else timeGreeting = 'Good evening';

  // Add context based on performance
  if (todayStats.habitsPct === 100 && todayStats.hydrationPct >= 80) {
    return `${timeGreeting}, ${name}! 🔥 You're on fire today!`;
  } else if (todayStats.hydrationPct < 30) {
    return `${timeGreeting}, ${name}. Let's boost that hydration! 💧`;
  } else if (todayStats.sleepHrs > 0 && todayStats.sleepHrs < 6) {
    return `${timeGreeting}, ${name}. Rest up today! 😴`;
  } else {
    return `${timeGreeting}, ${name} ✦`;
  }
}

/**
 * Generate micro-copy for the voice button based on user state
 */
export function getVoiceButtonText(todayStats: {
  hydrationPct: number;
  habitsPct: number;
  sleepHrs: number;
}): string {
  if (todayStats.habitsPct === 100 && todayStats.hydrationPct >= 80) {
    return 'Ask Aurora for next challenge';
  } else if (todayStats.hydrationPct < 30) {
    return 'Ask how to catch up on water';
  } else if (todayStats.habitsPct === 0) {
    return 'Ask Aurora to motivate you';
  } else {
    return 'Speak to Aurora AI Companion';
  }
}
