import { supabase } from './supabase';
import type {
  Profile, HydrationLog, SleepLog, Habit, HabitLog,
  Meal, DailyInsight, OnboardingData, HabitWithStatus
} from '../types';

// ============================================================
// AUTH
// ============================================================
export const authService = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ============================================================
// PROFILE
// ============================================================
export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async completeOnboarding(userId: string, onboardingData: OnboardingData) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: onboardingData.name,
        age: parseInt(onboardingData.age),
        gender: onboardingData.gender,
        height_cm: parseFloat(onboardingData.height),
        weight_kg: parseFloat(onboardingData.weight),
        wake_time: onboardingData.wake_time,
        bed_time: onboardingData.bed_time,
        activity_level: onboardingData.activity_level,
        goals: onboardingData.goals,
        notifications: onboardingData.notifications,
        onboarding_done: true,
        water_goal_ml: calculateWaterGoal(parseFloat(onboardingData.weight), onboardingData.activity_level),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Calculate personalised water goal based on weight & activity
function calculateWaterGoal(weightKg: number, activityLevel: string): number {
  const base = weightKg * 35; // 35ml per kg baseline
  const multipliers: Record<string, number> = {
    sedentary: 1.0,
    light: 1.1,
    moderate: 1.2,
    active: 1.35,
    very_active: 1.5,
  };
  return Math.round(base * (multipliers[activityLevel] ?? 1.2));
}

// ============================================================
// HYDRATION
// ============================================================
export const hydrationService = {
  async logWater(userId: string, amount_ml: number, source: 'manual' | 'voice' | 'quick_add' = 'manual') {
    const { data, error } = await supabase
      .from('hydration_logs')
      .insert({ user_id: userId, amount_ml, source })
      .select()
      .single();
    if (error) throw error;
    return data as HydrationLog;
  },

  async getTodayTotal(userId: string): Promise<{ total_ml: number; logs: HydrationLog[] }> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: false });
    if (error) throw error;
    const logs = (data as HydrationLog[]) || [];
    const total_ml = logs.reduce((sum, log) => sum + log.amount_ml, 0);
    return { total_ml, logs };
  },

  async getHistory(userId: string, days = 7): Promise<HydrationLog[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: false });
    if (error) throw error;
    return (data as HydrationLog[]) || [];
  },

  async deleteLog(logId: string) {
    const { error } = await supabase.from('hydration_logs').delete().eq('id', logId);
    if (error) throw error;
  }
};

// ============================================================
// SLEEP
// ============================================================
export const sleepService = {
  async logSleep(userId: string, sleep_start: string, sleep_end: string, quality?: number, notes?: string) {
    const { data, error } = await supabase
      .from('sleep_logs')
      .insert({ user_id: userId, sleep_start, sleep_end, quality, notes })
      .select()
      .single();
    if (error) throw error;
    return data as SleepLog;
  },

  async getLastNight(userId: string): Promise<SleepLog | null> {
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .order('sleep_end', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as SleepLog | null;
  },

  async getHistory(userId: string, days = 30): Promise<SleepLog[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('sleep_end', since.toISOString())
      .order('sleep_end', { ascending: false });
    if (error) throw error;
    return (data as SleepLog[]) || [];
  },

  async getWeeklyAvg(userId: string): Promise<number> {
    const history = await sleepService.getHistory(userId, 7);
    if (!history.length) return 0;
    const total = history.reduce((sum, log) => sum + log.duration_hrs, 0);
    return Math.round((total / history.length) * 10) / 10;
  }
};

// ============================================================
// HABITS
// ============================================================
export const habitsService = {
  async createHabit(userId: string, habit: Partial<Habit>) {
    const { data, error } = await supabase
      .from('habits')
      .insert({ user_id: userId, ...habit })
      .select()
      .single();
    if (error) throw error;
    return data as Habit;
  },

  async getHabits(userId: string): Promise<Habit[]> {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as Habit[]) || [];
  },

  async getTodayHabits(userId: string): Promise<HabitWithStatus[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('habits')
      .select(`*, habit_logs!left(status, date_key)`)
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_paused', false);
    if (error) throw error;

    return ((data as unknown[]) || []).map((h: unknown) => {
      const habit = h as Habit & { habit_logs: Array<{ status: string; date_key: string }> };
      const todayLog = habit.habit_logs?.find((l) => l.date_key === today);
      return {
        ...habit,
        completed_today: todayLog?.status === 'completed',
        status: todayLog?.status as 'completed' | 'skipped' | undefined,
      };
    });
  },

  async completeHabit(userId: string, habitId: string, status: 'completed' | 'skipped' = 'completed') {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('habit_logs')
      .upsert({
        habit_id: habitId,
        user_id: userId,
        status,
        date_key: today,
      }, { onConflict: 'habit_id,date_key' })
      .select()
      .single();
    if (error) throw error;
    return data as HabitLog;
  },

  async updateHabit(habitId: string, updates: Partial<Habit>) {
    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', habitId)
      .select()
      .single();
    if (error) throw error;
    return data as Habit;
  },

  async deleteHabit(habitId: string) {
    const { error } = await supabase
      .from('habits')
      .update({ is_active: false })
      .eq('id', habitId);
    if (error) throw error;
  },

  async pauseHabit(habitId: string, isPaused: boolean) {
    return habitsService.updateHabit(habitId, { is_paused: isPaused });
  }
};

// ============================================================
// NUTRITION
// ============================================================
export const nutritionService = {
  async logMeal(userId: string, meal: Omit<Meal, 'id' | 'user_id' | 'logged_at' | 'date_key' | 'source'>) {
    const { data, error } = await supabase
      .from('meals')
      .insert({ user_id: userId, ...meal, source: 'manual' })
      .select()
      .single();
    if (error) throw error;
    return data as Meal;
  },

  async getTodayMeals(userId: string): Promise<Meal[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .eq('date_key', today)
      .order('logged_at', { ascending: true });
    if (error) throw error;
    return (data as Meal[]) || [];
  },

  async getTodayNutrition(userId: string) {
    const meals = await nutritionService.getTodayMeals(userId);
    return meals.reduce((totals, meal) => ({
      calories: totals.calories + (meal.calories || 0),
      protein_g: totals.protein_g + (meal.protein_g || 0),
      carbs_g: totals.carbs_g + (meal.carbs_g || 0),
      fat_g: totals.fat_g + (meal.fat_g || 0),
      meal_count: totals.meal_count + 1,
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, meal_count: 0 });
  },

  async deleteMeal(mealId: string) {
    const { error } = await supabase.from('meals').delete().eq('id', mealId);
    if (error) throw error;
  }
};

// ============================================================
// INSIGHTS
// ============================================================
export const insightsService = {
  async getTodayInsight(userId: string): Promise<DailyInsight | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('date_key', today)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DailyInsight | null;
  },

  async saveInsight(userId: string, insight: string, category = 'general') {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_insights')
      .upsert({ user_id: userId, date_key: today, insight, category }, { onConflict: 'user_id,date_key' })
      .select()
      .single();
    if (error) throw error;
    return data as DailyInsight;
  }
};

// ============================================================
// HEALTH MEMORY
// ============================================================
export const memoryService = {
  async getMemories(userId: string) {
    const { data, error } = await supabase
      .from('health_memory')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  async addMemory(userId: string, memory_type: string, observation: string, confidence = 0.8) {
    const { data, error } = await supabase
      .from('health_memory')
      .insert({ user_id: userId, memory_type, observation, confidence })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
