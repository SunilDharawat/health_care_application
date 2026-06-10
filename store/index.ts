import { create } from 'zustand';
import type { Profile, HydrationLog, SleepLog, HabitWithStatus, Meal, DailyInsight } from '../types';

// ============================================================
// AUTH STORE
// ============================================================
interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: { id: string; email: string } | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, profile: null, isAuthenticated: false }),
}));

// ============================================================
// HYDRATION STORE
// ============================================================
interface HydrationState {
  todayTotal: number;
  goal: number;
  logs: HydrationLog[];
  setTodayTotal: (ml: number) => void;
  setGoal: (ml: number) => void;
  setLogs: (logs: HydrationLog[]) => void;
  addLog: (log: HydrationLog) => void;
  removeLog: (id: string) => void;
  percentage: () => number;
}

export const useHydrationStore = create<HydrationState>((set, get) => ({
  todayTotal: 0,
  goal: 2500,
  logs: [],
  setTodayTotal: (ml) => set({ todayTotal: ml }),
  setGoal: (ml) => set({ goal: ml }),
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((s) => ({
    logs: [log, ...s.logs],
    todayTotal: s.todayTotal + log.amount_ml,
  })),
  removeLog: (id) => set((s) => {
    const removed = s.logs.find(l => l.id === id);
    return {
      logs: s.logs.filter(l => l.id !== id),
      todayTotal: Math.max(0, s.todayTotal - (removed?.amount_ml || 0)),
    };
  }),
  percentage: () => {
    const { todayTotal, goal } = get();
    return goal > 0 ? Math.min(100, Math.round((todayTotal / goal) * 100)) : 0;
  },
}));

// ============================================================
// SLEEP STORE
// ============================================================
interface SleepState {
  lastNight: SleepLog | null;
  weeklyAvg: number;
  history: SleepLog[];
  setLastNight: (log: SleepLog | null) => void;
  setWeeklyAvg: (avg: number) => void;
  setHistory: (history: SleepLog[]) => void;
}

export const useSleepStore = create<SleepState>((set) => ({
  lastNight: null,
  weeklyAvg: 0,
  history: [],
  setLastNight: (log) => set({ lastNight: log }),
  setWeeklyAvg: (avg) => set({ weeklyAvg: avg }),
  setHistory: (history) => set({ history }),
}));

// ============================================================
// HABITS STORE
// ============================================================
interface HabitsState {
  habits: HabitWithStatus[];
  setHabits: (habits: HabitWithStatus[]) => void;
  markComplete: (habitId: string) => void;
  completedCount: () => number;
  totalCount: () => number;
  percentage: () => number;
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  setHabits: (habits) => set({ habits }),
  markComplete: (habitId) => set((s) => ({
    habits: s.habits.map(h =>
      h.id === habitId ? { ...h, completed_today: true, status: 'completed' as const } : h
    ),
  })),
  completedCount: () => get().habits.filter(h => h.completed_today).length,
  totalCount: () => get().habits.length,
  percentage: () => {
    const { habits } = get();
    if (!habits.length) return 0;
    return Math.round((habits.filter(h => h.completed_today).length / habits.length) * 100);
  },
}));

// ============================================================
// NUTRITION STORE
// ============================================================
interface NutritionState {
  meals: Meal[];
  todayTotals: { calories: number; protein_g: number; carbs_g: number; fat_g: number; meal_count: number };
  setMeals: (meals: Meal[]) => void;
  addMeal: (meal: Meal) => void;
  setTotals: (totals: NutritionState['todayTotals']) => void;
}

export const useNutritionStore = create<NutritionState>((set) => ({
  meals: [],
  todayTotals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, meal_count: 0 },
  setMeals: (meals) => set({ meals }),
  addMeal: (meal) => set((s) => ({
    meals: [...s.meals, meal],
    todayTotals: {
      calories: s.todayTotals.calories + meal.calories,
      protein_g: s.todayTotals.protein_g + meal.protein_g,
      carbs_g: s.todayTotals.carbs_g + meal.carbs_g,
      fat_g: s.todayTotals.fat_g + meal.fat_g,
      meal_count: s.todayTotals.meal_count + 1,
    },
  })),
  setTotals: (totals) => set({ todayTotals: totals }),
}));

// ============================================================
// INSIGHT STORE
// ============================================================
interface InsightState {
  todayInsight: DailyInsight | null;
  setInsight: (insight: DailyInsight | null) => void;
}

export const useInsightStore = create<InsightState>((set) => ({
  todayInsight: null,
  setInsight: (insight) => set({ todayInsight: insight }),
}));
