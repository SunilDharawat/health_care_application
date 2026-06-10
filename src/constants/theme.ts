// ============================================================
// AURORA — Design System / Theme
// Premium, calm, personal health companion aesthetic
// ============================================================

export const Colors = {
  // Core background layers
  bg: {
    primary:   '#0A0A0F',   // deepest background
    secondary: '#111118',   // card backgrounds
    tertiary:  '#1A1A24',   // elevated cards
    elevated:  '#22222F',   // modals, popovers
    border:    '#2A2A3A',   // subtle borders
    borderLight: '#383850', // hover borders
  },

  // Brand gradient (Aurora violet-blue)
  brand: {
    primary:   '#7C6FF7',   // main brand purple
    secondary: '#5B8FF9',   // accent blue
    gradient:  ['#7C6FF7', '#5B8FF9'],
    soft:      '#7C6FF720', // transparent brand
  },

  // Health module colors
  hydration: {
    primary:   '#4FC3F7',   // water blue
    light:     '#4FC3F720',
    dark:      '#0288D1',
  },
  sleep: {
    primary:   '#9C7CF4',   // sleep purple
    light:     '#9C7CF420',
    dark:      '#6C47E8',
  },
  habits: {
    primary:   '#4DB6AC',   // habit teal
    light:     '#4DB6AC20',
    dark:      '#00897B',
  },
  nutrition: {
    primary:   '#FFB74D',   // nutrition amber
    light:     '#FFB74D20',
    dark:      '#FB8C00',
  },

  // Semantic
  success:    '#4CAF50',
  warning:    '#FF9800',
  error:      '#F44336',
  info:       '#29B6F6',

  // Text
  text: {
    primary:   '#F0F0F8',   // near-white
    secondary: '#9090A8',   // muted
    tertiary:  '#5A5A70',   // very muted
    inverse:   '#0A0A0F',   // on bright backgrounds
  },

  // Utility
  white:       '#FFFFFF',
  transparent: 'transparent',
};

export const Typography = {
  // Font sizes
  size: {
    xs:   11,
    sm:   13,
    md:   15,
    base: 16,
    lg:   18,
    xl:   22,
    xxl:  28,
    hero: 36,
  },
  // Font weights
  weight: {
    regular: '400' as const,
    medium:  '500' as const,
    semibold:'600' as const,
    bold:    '700' as const,
  },
  // Line heights
  lineHeight: {
    tight:  1.2,
    normal: 1.5,
    loose:  1.8,
  },
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  xxl: 32,
  xxxl:48,
};

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#7C6FF7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  glow: {
    shadowColor: '#7C6FF7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
};

// Quick add water amounts (ml)
export const QUICK_ADD_AMOUNTS = [150, 250, 350, 500];

// Habit icons (emoji for now, swap to icon set later)
export const HABIT_ICONS: Record<string, string> = {
  reading:     '📖',
  meditation:  '🧘',
  stretching:  '🤸',
  walking:     '🚶',
  journaling:  '✏️',
  supplements: '💊',
  sleep:       '😴',
  exercise:    '💪',
  water:       '💧',
  breathing:   '🌬️',
  gratitude:   '🙏',
  cold_shower: '🚿',
  custom:      '⭐',
};

export const HEALTH_GOALS = [
  'Improve Hydration',
  'Sleep Better',
  'Build Better Habits',
  'Eat Healthier',
  'Improve Energy Levels',
  'Improve Consistency',
];

export const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentary',   description: 'Little or no exercise' },
  { value: 'light',       label: 'Light',       description: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',    description: '3–5 days/week' },
  { value: 'active',      label: 'Active',      description: '6–7 days/week' },
  { value: 'very_active', label: 'Very Active', description: 'Hard exercise daily' },
];
