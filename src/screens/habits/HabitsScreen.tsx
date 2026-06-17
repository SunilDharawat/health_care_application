import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, PanResponder, Animated, Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore, useHabitsStore } from '../../store';
import { habitsService } from '../../services/api';
import { Colors, Typography, Spacing, Radius, HABIT_ICONS } from '../../constants/theme';
import type { HabitWithStatus } from '../../types';
import { Plus, X, Sparkles, Check } from 'lucide-react-native';

export default function HabitsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuthStore();
  const { habits, setHabits, markComplete, completedCount, totalCount, percentage } = useHabitsStore();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('star');
  const [creating, setCreating] = useState(false);

  // Confetti particles state
  const [confetti, setConfetti] = useState<{
    id: number;
    translateX: Animated.Value;
    translateY: Animated.Value;
    opacity: Animated.Value;
    scale: Animated.Value;
    color: string;
    size: number;
    shape: 'circle' | 'square';
    left: number;
    top: number;
  }[]>([]);

  const triggerConfetti = () => {
    const colors = ['#FFD700', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4'];
    const newConfetti = Array.from({ length: 35 }).map((_, i) => {
      return {
        id: Math.random() + i,
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(Math.random() * 0.6 + 0.4),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        shape: Math.random() > 0.5 ? ('circle' as const) : ('square' as const),
        left: Math.random() * 260 + 50, // Spawn horizontally
        top: 250, // Spawn vertically in the middle of screen
      };
    });

    setConfetti(prev => [...prev, ...newConfetti]);

    const animations = newConfetti.map(c => {
      const targetY = Math.random() * -300 - 150; // Explode upwards
      const targetX = (Math.random() - 0.5) * 200; // Drift sideways
      
      return Animated.parallel([
        Animated.timing(c.translateY, {
          toValue: targetY,
          duration: 1200 + Math.random() * 600,
          useNativeDriver: true,
        }),
        Animated.timing(c.translateX, {
          toValue: targetX,
          duration: 1200 + Math.random() * 600,
          useNativeDriver: true,
        }),
        Animated.timing(c.opacity, {
          toValue: 0,
          duration: 900 + Math.random() * 400,
          delay: 400,
          useNativeDriver: true,
        }),
        Animated.timing(c.scale, {
          toValue: 0.1,
          duration: 1200 + Math.random() * 600,
          useNativeDriver: true,
        })
      ]);
    });

    Animated.parallel(animations).start(() => {
      setConfetti(prev => prev.filter(item => !newConfetti.find(nc => nc.id === item.id)));
    });
  };

  // Swipe tab navigation gesture responder
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 80 && Math.abs(gestureState.dy) < 40;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -80) {
          // Swipe left navigates to Nutrition
          navigation.navigate('Nutrition');
        } else if (gestureState.dx > 80) {
          // Swipe right navigates to Sleep
          navigation.navigate('Sleep');
        }
      },
    })
  ).current;

  const loadHabits = useCallback(async () => {
    if (!user) return;
    try {
      const todayHabits = await habitsService.getTodayHabits(user.id);
      setHabits(todayHabits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, setHabits]);

  useEffect(() => { loadHabits(); }, [loadHabits]);

  const handleComplete = async (habit: HabitWithStatus) => {
    if (habit.completed_today || !user) return;
    triggerConfetti();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markComplete(habit.id);
    try {
      await habitsService.completeHabit(user.id, habit.id, 'completed');
    } catch {
      Alert.alert('Error', 'Could not complete habit. Please try again.');
      loadHabits(); // Revert on error
    }
  };

  const handleSkip = async (habitId: string) => {
    if (!user) return;
    try {
      await habitsService.completeHabit(user.id, habitId, 'skipped');
      loadHabits();
    } catch {
      Alert.alert('Error', 'Could not skip habit.');
    }
  };

  const handleCreate = async () => {
    if (!newHabitName.trim() || !user) return;
    setCreating(true);
    try {
      await habitsService.createHabit(user.id, {
        name: newHabitName.trim(),
        icon: newHabitIcon,
        color: Colors.habits.primary,
        frequency: 'daily',
      });
      setNewHabitName('');
      setNewHabitIcon('star');
      setShowCreate(false);
      loadHabits();
    } catch {
      Alert.alert('Error', 'Could not create habit.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.habits.primary} size="large" />
      </View>
    );
  }

  const pct = percentage();

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Habits</Text>
            <Text style={styles.subtitle}>Build consistency, one day at a time</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Plus size={14} color={Colors.bg.primary} style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Progress summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryBig}>{completedCount()}</Text>
            <Text style={styles.summaryOf}>/ {totalCount()}</Text>
            <Text style={styles.summaryLabel}> habits done today</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${pct}%` as unknown as number }]} />
          </View>
        </View>

        {/* Habit list */}
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Sparkles size={40} color={Colors.brand.primary} style={{ marginBottom: Spacing.base }} />
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtitle}>Create your first habit to start building consistency.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyBtnText}>Create a habit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Pending habits */}
            {habits.filter(h => !h.completed_today && h.status !== 'skipped').length > 0 && (
              <Text style={styles.sectionLabel}>TO DO</Text>
            )}
            {habits
              .filter(h => !h.completed_today && h.status !== 'skipped')
              .map(habit => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  onComplete={() => handleComplete(habit)}
                  onSkip={() => handleSkip(habit.id)}
                />
              ))}

            {/* Completed */}
            {habits.filter(h => h.completed_today).length > 0 && (
              <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>COMPLETED</Text>
            )}
            {habits.filter(h => h.completed_today).map(habit => (
              <HabitRow key={habit.id} habit={habit} onComplete={() => {}} onSkip={() => {}} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Create Habit Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New habit</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <X size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Name</Text>
          <TextInput
            style={styles.modalInput}
            value={newHabitName}
            onChangeText={setNewHabitName}
            placeholder="e.g. Morning meditation"
            placeholderTextColor={Colors.text.tertiary}
            autoFocus
          />

          <Text style={styles.modalLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {Object.entries(HABIT_ICONS).map(([key, emoji]) => (
              <TouchableOpacity
                key={key}
                style={[styles.iconBtn, newHabitIcon === key && styles.iconBtnSelected]}
                onPress={() => setNewHabitIcon(key)}
              >
                <Text style={styles.iconEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.createBtn, !newHabitName.trim() && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!newHabitName.trim() || creating}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.createBtnText}>Create habit</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Confetti particles */}
      {confetti.map(c => (
        <Animated.View
          key={c.id}
          style={[
            styles.confettiParticle,
            {
              backgroundColor: c.color,
              width: c.size,
              height: c.size,
              borderRadius: c.shape === 'circle' ? c.size / 2 : 2,
              left: c.left,
              top: c.top,
              opacity: c.opacity,
              transform: [
                { translateX: c.translateX },
                { translateY: c.translateY },
                { scale: c.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function HabitRow({
  habit, onComplete, onSkip
}: {
  habit: HabitWithStatus;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const done = habit.completed_today;
  const skipped = habit.status === 'skipped';

  return (
    <View style={[styles.habitRow, done && styles.habitRowDone, skipped && styles.habitRowSkipped]}>
      <TouchableOpacity
        style={[styles.checkCircle, done && styles.checkCircleDone]}
        onPress={onComplete}
        disabled={done || skipped}
      >
        {done && <Check size={16} color={Colors.bg.primary} strokeWidth={3} />}
      </TouchableOpacity>

      <View style={styles.habitInfo}>
        <Text style={styles.habitIcon}>{HABIT_ICONS[habit.icon] || '⭐'}</Text>
        <View>
          <Text style={[styles.habitName, (done || skipped) && styles.habitNameDone]}>
            {habit.name}
          </Text>
          {habit.streak > 0 && (
            <Text style={styles.habitStreak}>🔥 {habit.streak} day streak</Text>
          )}
        </View>
      </View>

      {!done && !skipped && (
        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      )}
      {skipped && <Text style={styles.skippedLabel}>Skipped</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: 100 },
  loadingContainer: { flex: 1, backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  title: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  subtitle: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginTop: 4 },
  addBtn: {
    backgroundColor: Colors.habits.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtnText: { color: Colors.bg.primary, fontWeight: Typography.weight.bold, fontSize: Typography.size.sm },

  summaryCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: `${Colors.habits.primary}30`,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.md },
  summaryBig: { fontSize: Typography.size.hero, fontWeight: Typography.weight.bold, color: Colors.habits.primary },
  summaryOf: { fontSize: Typography.size.xxl, color: Colors.text.secondary, marginLeft: 4 },
  summaryLabel: { fontSize: Typography.size.base, color: Colors.text.secondary },
  progressBg: { height: 4, backgroundColor: Colors.bg.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.habits.primary, borderRadius: 2 },

  sectionLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    gap: Spacing.md,
  },
  habitRowDone:    { opacity: 0.6, borderColor: `${Colors.habits.primary}40` },
  habitRowSkipped: { opacity: 0.4 },

  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.habits.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: Colors.habits.primary },
  checkMark: { color: Colors.bg.primary, fontSize: 14, fontWeight: Typography.weight.bold },

  habitInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  habitIcon: { fontSize: 20 },
  habitName: { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.medium },
  habitNameDone: { textDecorationLine: 'line-through', color: Colors.text.secondary },
  habitStreak: { color: Colors.text.tertiary, fontSize: Typography.size.xs, marginTop: 2 },

  skipBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.tertiary,
  },
  skipBtnText: { color: Colors.text.tertiary, fontSize: Typography.size.xs },
  skippedLabel: { color: Colors.text.tertiary, fontSize: Typography.size.xs },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyIcon: { fontSize: 40, color: Colors.brand.primary, marginBottom: Spacing.base },
  emptyTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: Typography.size.base, color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.xl },
  emptyBtn: {
    backgroundColor: Colors.habits.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  emptyBtnText: { color: Colors.bg.primary, fontWeight: Typography.weight.bold },

  // Modal
  modal: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    padding: Spacing.xl,
    paddingTop: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  modalClose: { color: Colors.text.secondary, fontSize: Typography.size.lg },
  modalLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.base,
  },
  modalInput: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    marginBottom: Spacing.base,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  iconBtnSelected: { borderColor: Colors.habits.primary, backgroundColor: `${Colors.habits.primary}20` },
  iconEmoji: { fontSize: 24 },
  createBtn: {
    backgroundColor: Colors.habits.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: 'auto',
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: Colors.bg.primary, fontWeight: Typography.weight.bold, fontSize: Typography.size.base },
  confettiParticle: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 9999,
  },
});
