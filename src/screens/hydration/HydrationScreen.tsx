import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Alert, Animated, Easing, PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore, useHydrationStore } from '../../store';
import { hydrationService } from '../../services/api';
import { Colors, Typography, Spacing, Radius, QUICK_ADD_AMOUNTS } from '../../constants/theme';
import { format } from 'date-fns';
import { Droplet } from 'lucide-react-native';

export default function HydrationScreen({ navigation }: { navigation: any }) {
  const { user, profile } = useAuthStore();
  const hydration = useHydrationStore();
  const [customAmount, setCustomAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const fillAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pct = hydration.percentage();

  // Animate bottle fill and check celebration
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: pct / 100,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (pct >= 100) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.18,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.0,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [pct]);

  // Swipe tab navigation gesture responder
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 80 && Math.abs(gestureState.dy) < 40;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -80) {
          // Swipe left navigates to Sleep
          navigation.navigate('Sleep');
        } else if (gestureState.dx > 80) {
          // Swipe right navigates to Home
          navigation.navigate('Home');
        }
      },
    })
  ).current;

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
    <View style={styles.container} {...panResponder.panHandlers}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Hydration</Text>
          <Text style={styles.subtitle}>Track your daily water intake</Text>
        </View>

        {/* Progress Display (Visual Bottle) */}
        <View style={styles.statsCard}>
          <Animated.View style={[styles.bottleContainer, { transform: [{ scale: scaleAnim }] }]}>
            {/* Bottle Cap */}
            <View style={styles.bottleCap} />
            {/* Bottle Neck */}
            <View style={styles.bottleNeck} />
            {/* Bottle Body */}
            <View style={styles.bottleBody}>
              <Animated.View 
                style={[
                  styles.bottleFill, 
                  { 
                    height: fillAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }) 
                  }
                ]}
              />
              {/* Percentage Text Overlay */}
              <Text style={styles.bottleText}>{pct}%</Text>
            </View>
          </Animated.View>
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
  bottleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  bottleCap: {
    width: 24,
    height: 10,
    backgroundColor: '#78909C',
    borderRadius: Radius.sm - 4,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  bottleNeck: {
    width: 36,
    height: 12,
    backgroundColor: Colors.bg.secondary,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 1,
    borderColor: '#78909C',
  },
  bottleBody: {
    width: 90,
    height: 170,
    backgroundColor: Colors.bg.primary,
    borderWidth: 3,
    borderColor: '#78909C',
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bottleFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.hydration.primary,
    opacity: 0.85,
  },
  bottleText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    zIndex: 1,
  },
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
