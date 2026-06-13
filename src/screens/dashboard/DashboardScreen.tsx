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

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    try {
      const [
        hydrationData,
        lastNight,
        weeklyAvg,
        todayHabits,
        nutrition_data,
        insight,
      ] = await Promise.all([
        hydrationService.getTodayTotal(user.id),
        sleepService.getLastNight(user.id),
        sleepService.getWeeklyAvg(user.id),
        habitsService.getTodayHabits(user.id),
        nutritionService.getTodayNutrition(user.id),
        insightsService.getTodayInsight(user.id),
      ]);

      hydration.setTodayTotal(hydrationData.total_ml);
      hydration.setLogs(hydrationData.logs);
      if (profile?.water_goal_ml) hydration.setGoal(profile.water_goal_ml);
      sleep.setLastNight(lastNight);
      sleep.setWeeklyAvg(weeklyAvg);
      habits.setHabits(todayHabits);
      nutrition.setTotals(nutrition_data);
      setInsight(insight);
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
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
          {/* Voice assistant button */}
          <TouchableOpacity
            style={styles.voiceBtn}
            onPress={() => navigation.navigate("Voice")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.brand.gradient as [string, string]}
              style={styles.voiceBtnGrad}
            >
              <Text style={styles.voiceBtnIcon}>🎙</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

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
          <Text style={styles.cardIcon}>💧</Text>
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
          <Text style={styles.cardIcon}>🌙</Text>
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
          <Text style={[styles.cardIcon, styles.habitsIcon]}>✓</Text>
          <Text style={styles.cardTitle}>Habits</Text>
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
          <Text style={styles.cardIcon}>🥗</Text>
          <Text style={styles.cardTitle}>Nutrition</Text>
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  signOutText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },

  voiceBtn: { borderRadius: Radius.full, overflow: "hidden", ...Shadows.glow },
  voiceBtnGrad: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceBtnIcon: { fontSize: 22 },

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
  cardIcon: { fontSize: 20, marginRight: Spacing.sm },
  habitsIcon: { color: "#FFFFFF" },
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
});
