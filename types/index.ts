// ============================================================
// AURORA — TypeScript Types
// ============================================================

export interface Profile {
  id: string;
  name: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  height_cm: number | null;
  weight_kg: number | null;
  wake_time: string;
  bed_time: string;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  water_goal_ml: number;
  sleep_goal_hrs: number;
  goals: string[];
  notifications: {
    hydration: boolean;
    sleep: boolean;
    habits: boolean;
    insights: boolean;
  };
  onboarding_done: boolean;
  unit_system: 'metric' | 'imperial';
  created_at: string;
  updated_at: string;
}

export interface HydrationLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  note?: string;
  source: 'manual' | 'voice' | 'quick_add';
}

export interface SleepLog {
  id: string;
  user_id: string;
  sleep_start: string;
  sleep_end: string;
  duration_hrs: number;
  quality?: number;
  notes?: string;
  source: string;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  custom_days?: number[];
  reminder_time?: string;
  is_active: boolean;
  is_paused: boolean;
  streak: number;
  longest_streak: number;
  total_completions: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  status: 'completed' | 'skipped';
  logged_at: string;
  date_key: string;
  notes?: string;
  source: string;
}

export interface HabitWithStatus extends Habit {
  completed_today: boolean;
  status?: 'completed' | 'skipped';
}

export interface Meal {
  id: string;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
  date_key: string;
  source: string;
  notes?: string;
}

export interface DailyInsight {
  id: string;
  user_id: string;
  date_key: string;
  insight: string;
  category: string;
  created_at: string;
}

export interface HealthMemory {
  id: string;
  user_id: string;
  memory_type: string;
  observation: string;
  confidence: number;
  created_at: string;
}

// Aggregated view types
export interface TodayHydration {
  user_id: string;
  total_ml: number;
  log_count: number;
}

export interface WeeklySleep {
  user_id: string;
  sleep_date: string;
  avg_hrs: number;
  avg_quality: number;
}

// Onboarding state
export interface OnboardingData {
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  wake_time: string;
  bed_time: string;
  activity_level: string;
  goals: string[];
  notifications: {
    hydration: boolean;
    sleep: boolean;
    habits: boolean;
    insights: boolean;
  };
}

// Voice agent types
export interface AgentToolCall {
  tool: 'log_water' | 'log_sleep' | 'create_habit' | 'complete_habit' | 'log_meal' | 'get_health_summary';
  params: Record<string, unknown>;
}

export interface AgentResponse {
  text: string;
  tool_calls?: AgentToolCall[];
  action_taken?: string;
}

// Dashboard summary
export interface DashboardSummary {
  hydration: { total_ml: number; goal_ml: number; percentage: number };
  sleep: { last_night_hrs: number; weekly_avg: number; goal_hrs: number };
  habits: { total: number; completed: number; percentage: number };
  insight: string;
}
