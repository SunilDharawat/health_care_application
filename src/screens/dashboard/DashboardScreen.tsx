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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LogOut, Droplet, Moon, CheckSquare, Salad, Mic } from "lucide-react-native";
import { supabase } from "../../services/supabase";
import { calculateWellnessScore, type WellnessBreakdown } from "../../utils/wellness";
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

interface Props {
  navigation: { navigate: (screen: string) => void };
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
      setInsight(insight);

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
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

  return (
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
                <Text style={styles.scoreNum}>{scores.today.overall}</Text>
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

      {/* Today's insight */}
      {todayInsight && (
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>✦ TODAY'S INSIGHT</Text>
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

      {/* Centered Voice Assistant */}
      <View style={styles.voiceContainerCentered}>
        <TouchableOpacity
          style={styles.voiceBtn}
          onPress={() => navigation.navigate("Voice")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={Colors.brand.gradient as [string, string]}
            style={styles.voiceBtnGrad}
          >
            <Mic size={24} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.voiceBtnLabel}>Talk to Aurora</Text>
      </View>
    </ScrollView>
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

  voiceBtn: { borderRadius: Radius.full, overflow: "hidden", ...Shadows.glow },
  voiceBtnGrad: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  voiceContainerCentered: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  voiceBtnLabel: {
    marginTop: Spacing.sm,
    color: Colors.text.secondary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  insightCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  insightLabel: {
    fontSize: Typography.size.xs,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
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
});
