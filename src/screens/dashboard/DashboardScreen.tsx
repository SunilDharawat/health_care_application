import React, { useEffect, useCallback } from "react";
import {
  Alert,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  PanResponder,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LogOut, Droplet, Moon, CheckSquare, Salad, Mic, Sparkles, Target, Award, Crown, Flame, Trophy, TrendingUp, Lightbulb } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../services/supabase";
import { calculateWellnessScore, type WellnessBreakdown } from "../../utils/wellness";
import { generateSmartPrompts, getSmartGreeting } from "../../utils/prompts";
import {
  useAuthStore,
  useHydrationStore,
  useSleepStore,
  useHabitsStore,
  useNutritionStore,
  useInsightStore,
} from "../../store";
import {
  hydrationService,
  sleepService,
  habitsService,
  nutritionService,
  insightsService,
  authService,
} from "../../services/api";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
} from "../../constants/theme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  progress: number;
  progressText: string;
}

interface Props {
  navigation: { navigate: (screen: string, params?: any) => void };
}

export default function DashboardScreen({ navigation }: Props) {
  const { user, profile, reset } = useAuthStore();
  const hydration = useHydrationStore();
  const sleep = useSleepStore();
  const habits = useHabitsStore();
  const nutrition = useNutritionStore();
  const { todayInsight, setInsight } = useInsightStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [scores, setScores] = React.useState<{
    today: WellnessBreakdown;
    yesterday: WellnessBreakdown;
  } | null>(null);
  const [achievements, setAchievements] = React.useState<Achievement[]>([]);

  // Wellness Score dynamic count-up ticker state
  const [displayScore, setDisplayScore] = React.useState(0);
  const scoreAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const listenerId = scoreAnim.addListener((state) => {
      setDisplayScore(Math.round(state.value));
    });
    return () => {
      scoreAnim.removeListener(listenerId);
    };
  }, []);

  React.useEffect(() => {
    if (scores?.today?.overall !== undefined) {
      Animated.timing(scoreAnim, {
        toValue: scores.today.overall,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [scores?.today?.overall]);

  // Swipe tab navigation gesture responder
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Horizontal swipe: delta x > 80, vertical drift < 40
        return Math.abs(gestureState.dx) > 80 && Math.abs(gestureState.dy) < 40;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -80) {
          // Swipe left navigates to Water tab
          navigation.navigate('Water');
        }
      },
    })
  ).current;

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];
      const yesterdayStart = `${yesterdayKey}T00:00:00`;
      const yesterdayEnd = `${yesterdayKey}T23:59:59`;

      const [
        hydrationData,
        lastNight,
        weeklyAvg,
        todayHabits,
        nutrition_data,
        insight,
        { data: yesterdayHydration },
        { data: yesterdaySleep },
        { data: yesterdayHabits },
        { data: yesterdayMeals },
      ] = await Promise.all([
        hydrationService.getTodayTotal(user.id),
        sleepService.getLastNight(user.id),
        sleepService.getWeeklyAvg(user.id),
        habitsService.getTodayHabits(user.id),
        nutritionService.getTodayNutrition(user.id),
        insightsService.getTodayInsight(user.id),
        supabase
          .from('hydration_logs')
          .select('amount_ml')
          .eq('user_id', user.id)
          .gte('logged_at', yesterdayStart)
          .lte('logged_at', yesterdayEnd),
        supabase
          .from('sleep_logs')
          .select('duration_hrs, quality')
          .eq('user_id', user.id)
          .gte('sleep_end', yesterdayStart)
          .lte('sleep_end', yesterdayEnd)
          .order('sleep_end', { ascending: false }),
        supabase
          .from('habit_logs')
          .select('status')
          .eq('user_id', user.id)
          .eq('date_key', yesterdayKey)
          .eq('status', 'completed'),
        supabase
          .from('meals')
          .select('calories')
          .eq('user_id', user.id)
          .eq('date_key', yesterdayKey),
      ]);

      hydration.setTodayTotal(hydrationData.total_ml);
      hydration.setLogs(hydrationData.logs);
      if (profile?.water_goal_ml) hydration.setGoal(profile.water_goal_ml);
      sleep.setLastNight(lastNight);
      sleep.setWeeklyAvg(weeklyAvg);
      habits.setHabits(todayHabits);
      nutrition.setTotals(nutrition_data);
      // Check if we need to generate a new daily AI insight
      let activeInsight = insight;
      if (!insight) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/insights/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });
          if (response.ok) {
            activeInsight = await response.json();
          }
        } catch (err) {
          console.error("Failed to generate AI insight:", err);
        }
      }
      setInsight(activeInsight);

      // Calculate yesterday's stats
      const yHydrationTotal = (yesterdayHydration || []).reduce((sum, item) => sum + item.amount_ml, 0);
      const ySleepLog = yesterdaySleep && yesterdaySleep.length > 0 ? yesterdaySleep[0] : null;
      const yCompletedHabitsCount = yesterdayHabits ? yesterdayHabits.length : 0;
      const yCalories = (yesterdayMeals || []).reduce((sum, item) => sum + item.calories, 0);

      const waterGoal = profile?.water_goal_ml || 2500;
      const sleepGoal = profile?.sleep_goal_hrs || 8;

      const yesterdayScore = calculateWellnessScore({
        profile,
        hydrationTotal: yHydrationTotal,
        hydrationGoal: waterGoal,
        sleepLog: ySleepLog as any,
        sleepGoal,
        completedHabitsCount: yCompletedHabitsCount,
        totalHabitsCount: todayHabits.length,
        nutritionCalories: yCalories,
      });

      // Calculate today's stats
      const todayScore = calculateWellnessScore({
        profile,
        hydrationTotal: hydrationData.total_ml,
        hydrationGoal: waterGoal,
        sleepLog: lastNight,
        sleepGoal,
        completedHabitsCount: todayHabits.filter(h => h.completed_today).length,
        totalHabitsCount: todayHabits.length,
        nutritionCalories: nutrition_data.calories,
      });

      setScores({
        today: todayScore,
        yesterday: yesterdayScore,
      });

      // Fetch achievements
      try {
        const achResponse = await fetch(`${BACKEND_URL}/api/achievements/${user.id}`);
        if (achResponse.ok) {
          const achData = await achResponse.json();
          setAchievements(achData);
        }
      } catch (achErr) {
        console.error("Failed to load achievements:", achErr);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Do you want to sign out of Aurora?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await authService.signOut();
          } catch (err) {
            console.error("Sign out error:", err);
          } finally {
            reset();
          }
        },
      },
    ]);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.brand.primary} size="large" />
      </View>
    );
  }

  const hydrationPct = hydration.percentage();
  const habitsPct = habits.percentage();

  const getHydrationPrediction = () => {
    const goal = profile?.water_goal_ml || 2500;
    const todayTotal = hydration.todayTotal;
    
    if (todayTotal === 0) {
      return "Log your first glass of water to project today's pace!";
    }
    if (todayTotal >= goal) {
      return `Amazing! You've reached your daily water goal of ${(goal/1000).toFixed(1)}L!`;
    }
    
    const currentHour = new Date().getHours();
    const startHour = 8; // Assumed wake time
    let activeHours = currentHour - startHour;
    if (activeHours <= 0) activeHours = 1;
    
    const mlPerHour = todayTotal / activeHours;
    const hoursNeeded = (goal - todayTotal) / mlPerHour;
    const targetHour = Math.round(currentHour + hoursNeeded);
    
    if (targetHour > 22 || targetHour < 0) {
      return `At this pace, you'll reach ${(todayTotal/1000).toFixed(1)}L by bedtime. Drink a glass now to catch up!`;
    }
    
    const ampm = targetHour >= 12 ? 'pm' : 'am';
    const displayHour = targetHour % 12 === 0 ? 12 : targetHour % 12;
    return `At this pace, you'll reach your daily goal of ${(goal/1000).toFixed(1)}L water by ${displayHour}${ampm} today.`;
  };

  const getHabitsPrediction = () => {
    const totalCount = habits.totalCount();
    const completedCount = habits.completedCount();
    
    if (totalCount === 0) {
      return "Add habits to start tracking today's consistency goals!";
    }
    
    const pct = Math.round((completedCount / totalCount) * 100);
    if (completedCount === 0) {
      return `You've completed 0/${totalCount} habits today. Complete the first one to build momentum!`;
    }
    if (completedCount === totalCount) {
      return `Perfect! Completed all ${totalCount} habits today — 100% streak achieved! 🔥`;
    }
    
    return `You've completed ${completedCount}/${totalCount} habits — ${pct}% of today's goal!`;
  };

  const getSleepPrediction = () => {
    const sleepGoal = profile?.sleep_goal_hrs || 8;
    const weeklyAvg = sleep.weeklyAvg;
    
    if (!weeklyAvg || weeklyAvg === 0) {
      return "Log sleep to generate your weekly rest forecast trajectory.";
    }
    
    if (weeklyAvg >= sleepGoal) {
      return `Averaging ${weeklyAvg}h of sleep/night this week, exceeding your goal. Great recovery!`;
    }
    
    if (sleep.lastNight && sleep.lastNight.duration_hrs > weeklyAvg) {
      return `Maintaining last night's ${sleep.lastNight.duration_hrs.toFixed(1)}h sleep pace will put you on track for your ${sleepGoal}h goal!`;
    }
    
    const gap = sleepGoal - weeklyAvg;
    const minsGap = Math.round(gap * 60);
    return `At this week's pace, adding ${minsGap} mins of sleep tonight gets you closer to your ${sleepGoal}h target.`;
  };

  const todayStats = {
    hydrationPct: hydrationPct,
    sleepHrs: sleep.lastNight ? sleep.lastNight.duration_hrs : 0,
    sleepPct: (profile?.sleep_goal_hrs || 8) > 0 ? ((sleep.lastNight ? sleep.lastNight.duration_hrs : 0) / (profile?.sleep_goal_hrs || 8)) * 100 : 0,
    habitsCompleted: habits.completedCount(),
    habitsTotal: habits.totalCount(),
    habitsPct: habitsPct,
    nutritionCalories: nutrition.todayTotals.calories,
    nutritionLogged: nutrition.todayTotals.calories > 0,
  };

  const smartPrompts = generateSmartPrompts(profile, todayStats);
  const smartGreeting = getSmartGreeting(profile?.name || "there", {
    hydrationPct: hydrationPct,
    habitsPct: habitsPct,
    sleepHrs: sleep.lastNight ? sleep.lastNight.duration_hrs : 0,
  });

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <ScrollView
        style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.brand.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name}>{profile?.name || "there"} ✦</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.75}
          >
            <LogOut size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal AI Assistant Bar */}
      <View style={styles.aiAssistantBar}>
        {/* Top row: sparks + title + mic icon */}
        <View style={styles.aiAssistantHeaderRow}>
          <View style={styles.aiAssistantLeft}>
            <Sparkles size={16} color={Colors.brand.primary} style={{ marginRight: Spacing.xs }} />
            <Text style={styles.aiAssistantTitle}>Aurora AI Companion</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("Voice")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.brand.gradient as [string, string]}
              style={styles.aiAssistantMicBtn}
            >
              <Mic size={16} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.aiAssistantHintRow}>
          <Lightbulb size={12} color={Colors.text.secondary} style={{ marginRight: 4 }} />
          <Text style={styles.aiAssistantHint}>Try asking:</Text>
        </View>

        {/* Dynamic Context-Aware Prompt Suggestions */}
        <View style={styles.smartPromptsList}>
          {smartPrompts.map((prompt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.smartPromptItem}
              onPress={() => navigation.navigate("Voice", { initialPrompt: prompt.text })}
              activeOpacity={0.75}
            >
              <View style={styles.smartPromptIconContainer}>
                {getPromptIcon(prompt.icon, prompt.category)}
              </View>
              <Text style={styles.smartPromptText} numberOfLines={1}>
                "{prompt.text}"
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Wellness Score Card */}
      {scores && (
        <View style={styles.wellnessCard}>
          <View style={styles.wellnessHeaderRow}>
            {/* Left side: Circular Score Gauge */}
            <View style={styles.scoreContainer}>
              <LinearGradient
                colors={['#7C6FF725', '#5B8FF910']}
                style={styles.scoreCircle}
              >
                <Text style={styles.scoreNum}>{displayScore}</Text>
                <Text style={styles.scoreLabel}>SCORE</Text>
              </LinearGradient>
            </View>

            {/* Right side: Title & Trend */}
            <View style={styles.wellnessTrendContainer}>
              <Text style={styles.wellnessTitle}>Wellness Score</Text>
              {(() => {
                const diff = scores.today.overall - scores.yesterday.overall;
                if (diff > 0) {
                  return (
                    <View style={[styles.trendBadge, styles.trendUp]}>
                      <Text style={styles.trendTextUp}>↑ +{diff} from yesterday</Text>
                    </View>
                  );
                } else if (diff < 0) {
                  return (
                    <View style={[styles.trendBadge, styles.trendDown]}>
                      <Text style={styles.trendTextDown}>↓ {diff} from yesterday</Text>
                    </View>
                  );
                } else {
                  return (
                    <View style={[styles.trendBadge, styles.trendNeutral]}>
                      <Text style={styles.trendTextNeutral}>No change</Text>
                    </View>
                  );
                }
              })()}
              <Text style={styles.wellnessDesc}>Overall health index today</Text>
            </View>
          </View>

          {/* Breakdown bars */}
          <View style={styles.breakdownContainer}>
            <View style={styles.divider} />
            <Text style={styles.breakdownTitle}>DAILY PILLARS</Text>
            
            <BreakdownRow 
              label="Hydration" 
              value={scores.today.hydration} 
              color={Colors.hydration.primary} 
              IconComponent={Droplet} 
            />
            <BreakdownRow 
              label="Sleep" 
              value={scores.today.sleep} 
              color={Colors.sleep.primary} 
              IconComponent={Moon} 
            />
            <BreakdownRow 
              label="Habits" 
              value={scores.today.habits} 
              color={Colors.habits.primary} 
              IconComponent={CheckSquare} 
            />
            <BreakdownRow 
              label="Nutrition" 
              value={scores.today.nutrition} 
              color={Colors.nutrition.primary} 
              IconComponent={Salad} 
            />
          </View>
        </View>
      )}

      {/* Achievements Section */}
      {achievements.length > 0 && (
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionHeaderTitle}>ACHIEVEMENTS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsScroll}
          >
            {achievements.map((ach) => (
              <View 
                key={ach.id} 
                style={[
                  styles.achievementBadgeCard, 
                  ach.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
                  ach.unlocked && { borderColor: `${ach.color}35` }
                ]}
              >
                <View 
                  style={[
                    styles.badgeIconBg, 
                    ach.unlocked ? { backgroundColor: `${ach.color}15` } : styles.badgeIconBgLocked
                  ]}
                >
                  {getAchievementIcon(ach.icon, ach.color, ach.unlocked)}
                </View>
                <Text style={[styles.badgeTitle, ach.unlocked ? styles.badgeTitleUnlocked : styles.badgeTitleLocked]}>
                  {ach.title}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {ach.description}
                </Text>
                <View style={styles.badgeProgressContainer}>
                  <View style={styles.badgeProgressBarBg}>
                    <View 
                      style={[
                        styles.badgeProgressBarFill, 
                        { width: `${ach.progress * 100}%`, backgroundColor: ach.unlocked ? ach.color : Colors.text.tertiary }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.badgeProgressText, ach.unlocked && { color: ach.color }]}>
                    {ach.progressText}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Smart Projections */}
      <View style={styles.projectionsCard}>
        <View style={styles.projectionsHeader}>
          <TrendingUp size={14} color={Colors.brand.secondary} style={{ marginRight: 6 }} />
          <Text style={styles.projectionsLabel}>SMART PROJECTIONS</Text>
        </View>
        <View style={styles.projectionRow}>
          <Droplet size={16} color={Colors.hydration.primary} style={styles.projectionIcon} />
          <Text style={styles.projectionText}>{getHydrationPrediction()}</Text>
        </View>
        <View style={styles.projectionDivider} />
        <View style={styles.projectionRow}>
          <CheckSquare size={16} color={Colors.habits.primary} style={styles.projectionIcon} />
          <Text style={styles.projectionText}>{getHabitsPrediction()}</Text>
        </View>
        <View style={styles.projectionDivider} />
        <View style={styles.projectionRow}>
          <Moon size={16} color={Colors.sleep.primary} style={styles.projectionIcon} />
          <Text style={styles.projectionText}>{getSleepPrediction()}</Text>
        </View>
      </View>

      {/* Today's insight */}
      {todayInsight && (
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Sparkles size={14} color={Colors.brand.primary} style={{ marginRight: 6 }} />
            <Text style={styles.insightLabel}>TODAY'S AI INSIGHT</Text>
          </View>
          <Text style={styles.insightText}>{todayInsight.insight}</Text>
        </View>
      )}

      {/* Hydration card */}
      <TouchableOpacity
        style={[styles.card, styles.hydrationCard]}
        onPress={() => navigation.navigate("Water")}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Droplet size={20} color={Colors.hydration.primary} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Hydration</Text>
          <Text style={[styles.cardBadge, { color: Colors.hydration.primary }]}>
            {hydrationPct}%
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${hydrationPct}%` as unknown as number,
                backgroundColor: Colors.hydration.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.cardStat}>
          {(hydration.todayTotal / 1000).toFixed(1)}L of{" "}
          {(hydration.goal / 1000).toFixed(1)}L goal
        </Text>
      </TouchableOpacity>

      {/* Sleep card */}
      <TouchableOpacity
        style={[styles.card, styles.sleepCard]}
        onPress={() => navigation.navigate("Sleep")}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Moon size={20} color={Colors.sleep.primary} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Sleep</Text>
        </View>
        <View style={styles.sleepStats}>
          <View style={styles.sleepStat}>
            <Text style={styles.sleepStatValue}>
              {sleep.lastNight
                ? `${sleep.lastNight.duration_hrs.toFixed(1)}h`
                : "—"}
            </Text>
            <Text style={styles.sleepStatLabel}>Last night</Text>
          </View>
          <View style={styles.sleepDivider} />
          <View style={styles.sleepStat}>
            <Text style={styles.sleepStatValue}>{sleep.weeklyAvg || "—"}h</Text>
            <Text style={styles.sleepStatLabel}>Weekly avg</Text>
          </View>
          <View style={styles.sleepDivider} />
          <View style={styles.sleepStat}>
            <Text style={styles.sleepStatValue}>
              {profile?.sleep_goal_hrs || 8}h
            </Text>
            <Text style={styles.sleepStatLabel}>Goal</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Habits + Nutrition row */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.card, styles.halfCard, styles.habitsCard]}
          onPress={() => navigation.navigate("Habits")}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
            <CheckSquare size={20} color={Colors.habits.primary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Habits</Text>
          </View>
          <Text style={styles.bigStat}>
            {habits.completedCount()}/{habits.totalCount()}
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${habitsPct}%` as unknown as number,
                  backgroundColor: Colors.habits.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.cardStat}>{habitsPct}% done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.halfCard, styles.nutritionCard]}
          onPress={() => navigation.navigate("Nutrition")}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Salad size={20} color={Colors.nutrition.primary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Nutrition</Text>
          </View>
          <Text style={styles.bigStat}>{nutrition.todayTotals.calories}</Text>
          <Text style={styles.cardStat}>kcal today</Text>
          <Text style={styles.macroLine}>
            P {Math.round(nutrition.todayTotals.protein_g)}g · C{" "}
            {Math.round(nutrition.todayTotals.carbs_g)}g · F{" "}
            {Math.round(nutrition.todayTotals.fat_g)}g
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

function BreakdownRow({ label, value, color, IconComponent }: { label: string; value: number; color: string; IconComponent: any }) {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownIconContainer}>
        <IconComponent size={14} color={color} />
      </View>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <View style={styles.breakdownBarBg}>
        <View style={[styles.breakdownBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.breakdownVal, { color }]}>{value}%</Text>
    </View>
  );
}

function getAchievementIcon(iconName: string, color: string, unlocked: boolean) {
  const size = 22;
  const iconColor = unlocked ? color : Colors.text.tertiary;

  switch (iconName) {
    case "Target":
      return <Target size={size} color={iconColor} />;
    case "Award":
      return <Award size={size} color={iconColor} />;
    case "Crown":
      return <Crown size={size} color={iconColor} />;
    case "Flame":
      return <Flame size={size} color={iconColor} />;
    case "Trophy":
      return <Trophy size={size} color={iconColor} />;
    default:
      return <Target size={size} color={iconColor} />;
  }
}

function getPromptIcon(iconName: string, category: string) {
  const size = 14;
  let color = Colors.brand.primary;
  
  if (category === 'hydration') color = Colors.hydration.primary;
  else if (category === 'sleep') color = Colors.sleep.primary;
  else if (category === 'habits') color = Colors.habits.primary;
  else if (category === 'nutrition') color = Colors.nutrition.primary;

  switch (iconName) {
    case "Droplet":
      return <Droplet size={size} color={color} />;
    case "Moon":
      return <Moon size={size} color={color} />;
    case "CheckSquare":
      return <CheckSquare size={size} color={color} />;
    case "Salad":
      return <Salad size={size} color={color} />;
    case "Target":
      return <Target size={size} color={color} />;
    case "Sparkles":
      return <Sparkles size={size} color={color} />;
    default:
      return <Sparkles size={size} color={color} />;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  greeting: { color: Colors.text.secondary, fontSize: Typography.size.base },
  name: {
    color: Colors.text.primary,
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  signOutBtn: {
    backgroundColor: Colors.bg.secondary,
    borderColor: Colors.bg.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  aiAssistantBar: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: `${Colors.brand.primary}30`,
    ...Shadows.card,
  },
  aiAssistantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  aiAssistantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiAssistantTitle: {
    color: Colors.brand.primary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  aiAssistantHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  aiAssistantHint: {
    color: Colors.text.secondary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  smartPromptsList: {
    gap: Spacing.xs,
  },
  smartPromptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.primary,
    borderColor: Colors.bg.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xs,
  },
  smartPromptIconContainer: {
    marginRight: Spacing.sm,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartPromptText: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
  },
  aiAssistantMicBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },

  insightCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
    borderWidth: 1,
    borderColor: '#7C6FF730',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  insightLabel: {
    fontSize: Typography.size.xs,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 1,
  },
  insightText: {
    color: Colors.text.primary,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },

  card: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    ...Shadows.card,
  },
  hydrationCard: { borderColor: `${Colors.hydration.primary}30` },
  sleepCard: { borderColor: `${Colors.sleep.primary}30` },
  habitsCard: { borderColor: `${Colors.habits.primary}30` },
  nutritionCard: { borderColor: `${Colors.nutrition.primary}30` },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.base,
  },
  cardIcon: { marginRight: Spacing.sm },
  cardTitle: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardBadge: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },

  progressBarBg: {
    height: 4,
    backgroundColor: Colors.bg.border,
    borderRadius: 2,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 2 },
  cardStat: { color: Colors.text.secondary, fontSize: Typography.size.sm },

  sleepStats: { flexDirection: "row", alignItems: "center" },
  sleepStat: { flex: 1, alignItems: "center" },
  sleepStatValue: {
    color: Colors.text.primary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  sleepStatLabel: {
    color: Colors.text.tertiary,
    fontSize: Typography.size.xs,
    marginTop: 2,
  },
  sleepDivider: { width: 1, height: 32, backgroundColor: Colors.bg.border },

  row: { flexDirection: "row", gap: Spacing.sm },
  halfCard: { flex: 1, marginBottom: 0 },

  bigStat: {
    color: Colors.text.primary,
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    marginVertical: Spacing.xs,
  },
  macroLine: {
    color: Colors.text.tertiary,
    fontSize: Typography.size.xs,
    marginTop: Spacing.xs,
  },

  // Wellness Score styles
  wellnessCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    ...Shadows.card,
  },
  wellnessHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#7C6FF730',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg.primary,
  },
  scoreNum: {
    fontSize: 24,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
    letterSpacing: 0.5,
    marginTop: -2,
  },
  wellnessTrendContainer: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  wellnessTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  wellnessDesc: {
    fontSize: Typography.size.xs,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  trendBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  trendUp: {
    backgroundColor: `${Colors.success}15`,
    borderColor: `${Colors.success}30`,
    borderWidth: 1,
  },
  trendTextUp: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.success,
  },
  trendDown: {
    backgroundColor: `${Colors.error}15`,
    borderColor: `${Colors.error}30`,
    borderWidth: 1,
  },
  trendTextDown: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.error,
  },
  trendNeutral: {
    backgroundColor: `${Colors.bg.border}40`,
    borderColor: Colors.bg.border,
    borderWidth: 1,
  },
  trendTextNeutral: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
  },
  breakdownContainer: {
    marginTop: Spacing.base,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.bg.border,
    marginVertical: Spacing.md,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  breakdownIconContainer: {
    width: 20,
    alignItems: 'center',
    marginRight: 6,
  },
  breakdownLabel: {
    width: 80,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  breakdownBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.bg.border,
    borderRadius: 3,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownVal: {
    width: 40,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    textAlign: 'right',
  },

  // Achievements Section
  achievementsSection: {
    marginBottom: Spacing.base,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  achievementsScroll: {
    paddingRight: Spacing.xl,
  },
  achievementBadgeCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    borderWidth: 1.5,
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  badgeUnlocked: {
    opacity: 1,
  },
  badgeLocked: {
    opacity: 0.55,
    borderColor: Colors.bg.border,
  },
  badgeIconBg: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  badgeIconBgLocked: {
    backgroundColor: `${Colors.bg.border}50`,
  },
  badgeTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeTitleUnlocked: {
    color: Colors.text.primary,
  },
  badgeTitleLocked: {
    color: Colors.text.secondary,
  },
  badgeDesc: {
    fontSize: 10,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 13,
    height: 26,
    marginBottom: Spacing.xs,
  },
  badgeProgressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  badgeProgressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.bg.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  badgeProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  badgeProgressText: {
    fontSize: 9,
    color: Colors.text.tertiary,
    fontWeight: Typography.weight.medium,
  },

  // Projections Section
  projectionsCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: `${Colors.brand.secondary}30`,
    ...Shadows.card,
  },
  projectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  projectionsLabel: {
    fontSize: Typography.size.xs,
    color: Colors.brand.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 1,
  },
  projectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  projectionIcon: {
    marginRight: Spacing.sm,
  },
  projectionText: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    lineHeight: 18,
  },
  projectionDivider: {
    height: 1,
    backgroundColor: `${Colors.bg.border}50`,
    marginVertical: Spacing.xs,
  },
});
