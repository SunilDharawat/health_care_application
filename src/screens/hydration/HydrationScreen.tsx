import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Alert, Animated, Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore, useHydrationStore } from '../../store';
import { hydrationService } from '../../services/api';
import { Colors, Typography, Spacing, Radius, QUICK_ADD_AMOUNTS } from '../../constants/theme';
import { format } from 'date-fns';

export default function HydrationScreen() {
  const { user, profile } = useAuthStore();
  const hydration = useHydrationStore();
  const [customAmount, setCustomAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const fillAnim = useRef(new Animated.Value(0)).current;

  const pct = hydration.percentage();

  // Animate bottle fill
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: pct / 100,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const data = await hydrationService.getTodayTotal(user.id);
    hydration.setTodayTotal(data.total_ml);
    hydration.setLogs(data.logs);
    if (profile?.water_goal_ml) hydration.setGoal(profile.water_goal_ml);
  }, [user, profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const addWater = async (amount: number) => {
    if (!user || loading) return;
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const log = await hydrationService.logWater(user.id, amount, 'quick_add');
      hydration.addLog(log);
    } catch {
      Alert.alert('Error', 'Could not log water. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addCustom = async () => {
    const amount = parseInt(customAmount);
    if (!amount || amount <= 0 || amount > 5000) {
      Alert.alert('Invalid amount', 'Enter a value between 1 and 5000 ml.');
      return;
    }
    await addWater(amount);
    setCustomAmount('');
  };

  const removeLog = async (logId: string) => {
    try {
      await hydrationService.deleteLog(logId);
      hydration.removeLog(logId);
    } catch {
      Alert.alert('Error', 'Could not delete log. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Hydration</Text>
          <Text style={styles.subtitle}>Track your daily water intake</Text>
        </View>

        {/* Progress Display */}
        <View style={styles.statsCard}>
          <Text style={styles.percentageText}>{pct}%</Text>
          <Text style={styles.statLabel}>
            {hydration.todayTotal} ml of {hydration.goal} ml goal
          </Text>
        </View>

        {/* Quick Add Buttons */}
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <View style={styles.quickAddRow}>
          {QUICK_ADD_AMOUNTS.map(amount => (
            <TouchableOpacity key={amount} style={styles.quickAddBtn} onPress={() => addWater(amount)}>
              <Text style={styles.quickAddText}>+{amount}ml</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Add */}
        <View style={styles.customAddContainer}>
          <TextInput
            style={styles.input}
            value={customAmount}
            onChangeText={setCustomAmount}
            placeholder="Custom amount (ml)"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addCustom}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Logs */}
        <Text style={styles.sectionTitle}>Today's Logs</Text>
        {hydration.logs.length === 0 ? (
          <Text style={styles.emptyText}>No water logged yet today.</Text>
        ) : (
          hydration.logs.map(log => (
            <View key={log.id} style={styles.logRow}>
              <View>
                <Text style={styles.logAmount}>{log.amount_ml} ml</Text>
                <Text style={styles.logTime}>
                  {format(new Date(log.logged_at), 'hh:mm a')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeLog(log.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scrollContent: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 100 },
  header: { marginBottom: Spacing.xxl },
  title: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  subtitle: { fontSize: Typography.size.md, color: Colors.text.secondary, marginTop: Spacing.xs },
  statsCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  percentageText: { fontSize: Typography.size.hero, fontWeight: Typography.weight.bold, color: Colors.hydration.primary },
  statLabel: { fontSize: Typography.size.md, color: Colors.text.secondary, marginTop: Spacing.sm },
  sectionTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.md, marginTop: Spacing.lg },
  quickAddRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickAddBtn: {
    flex: 1,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  quickAddText: { color: Colors.hydration.primary, fontWeight: Typography.weight.semibold, fontSize: Typography.size.sm },
  customAddContainer: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  input: {
    flex: 1,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  addBtn: {
    backgroundColor: Colors.hydration.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  addBtnText: { color: Colors.bg.primary, fontWeight: Typography.weight.bold },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  logAmount: { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold },
  logTime: { color: Colors.text.tertiary, fontSize: Typography.size.xs, marginTop: 2 },
  deleteText: { color: Colors.error, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  emptyText: { color: Colors.text.tertiary, fontSize: Typography.size.sm, fontStyle: 'italic' },
});
