import type { Profile, SleepLog } from '../types';

export function calculateTargetCalories(profile: Profile | null): number {
  if (!profile || !profile.weight_kg || !profile.height_cm || !profile.age) {
    return 2000; // default baseline
  }
  const weight = profile.weight_kg;
  const height = profile.height_cm;
  const age = profile.age;
  const isFemale = profile.gender === 'female';

  // Harris-Benedict Equation
  const bmr = isFemale
    ? 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    : 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);

  const multiplier: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const factor = multiplier[profile.activity_level] || 1.2;
  return Math.round(bmr * factor);
}

export interface WellnessBreakdown {
  hydration: number;
  sleep: number;
  habits: number;
  nutrition: number;
  overall: number;
}

export function calculateWellnessScore(params: {
  profile: Profile | null;
  hydrationTotal: number;
  hydrationGoal: number;
  sleepLog: SleepLog | null;
  sleepGoal: number;
  completedHabitsCount: number;
  totalHabitsCount: number;
  nutritionCalories: number;
}): WellnessBreakdown {
  const {
    profile,
    hydrationTotal,
    hydrationGoal,
    sleepLog,
    sleepGoal,
    completedHabitsCount,
    totalHabitsCount,
    nutritionCalories,
  } = params;

  // 1. Hydration Score (0-100)
  const hydration = hydrationGoal > 0
    ? Math.min(100, Math.round((hydrationTotal / hydrationGoal) * 100))
    : 0;

  // 2. Sleep Score (0-100)
  let sleep = 70; // fallback default
  if (sleepLog) {
    const durationPct = sleepGoal > 0 ? (sleepLog.duration_hrs / sleepGoal) * 100 : 0;
    const qualityPct = ((sleepLog.quality || 3) / 5) * 100;
    sleep = Math.min(100, Math.round(durationPct * 0.6 + qualityPct * 0.4));
  }

  // 3. Habits Score (0-100)
  const habits = totalHabitsCount > 0
    ? Math.round((completedHabitsCount / totalHabitsCount) * 100)
    : 100; // default to 100 if no habits exist

  // 4. Nutrition Score (0-100)
  const targetCalories = calculateTargetCalories(profile);
  const nutrition = nutritionCalories > 0
    ? Math.max(0, 100 - Math.round((Math.abs(nutritionCalories - targetCalories) / targetCalories) * 100))
    : 0; // fallback if no food logged

  // Overall Weighted score
  const overall = Math.round(
    hydration * 0.25 +
    sleep * 0.25 +
    habits * 0.25 +
    nutrition * 0.25
  );

  return { hydration, sleep, habits, nutrition, overall };
}
