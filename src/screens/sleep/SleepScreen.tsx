import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useAuthStore, useSleepStore } from '../../store';
import { sleepService } from '../../services/api';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { format, parseISO } from 'date-fns';

export default function SleepScreen() {
  const { user, profile } = useAuthStore();
  const { lastNight, weeklyAvg, history, setLastNight, setWeeklyAvg, setHistory } = useSleepStore();
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);

  // Simple hour/minute pickers
  const [sleepHour, setSleepHour] = useState(23);
  const [sleepMin, setSleepMin] = useState(0);
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMin, setWakeMin] = useState(0);
  const [quality, setQuality] = useState(3);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [last, avg, hist] = await Promise.all([
        sleepService.getLastNight(user.id),
        sleepService.getWeeklyAvg(user.id),
        sleepService.getHistory(user.id, 14),
      ]);
      setLastNight(last);
      setWeeklyAvg(avg);
      setHistory(hist);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, setLastNight, setWeeklyAvg, setHistory]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const start = new Date(yesterday);
      start.setHours(sleepHour, sleepMin, 0, 0);

      const end = new Date(today);
      end.setHours(wakeHour, wakeMin, 0, 0);

      if (end <= start) {
        Alert.alert('Invalid time', 'Wake time must be after sleep time.');
        return;
      }

      const log = await sleepService.logSleep(
        user.id,
        start.toISOString(),
        end.toISOString(),
        quality,
      );
      setLastNight(log);
      setShowLog(false);
      loadData();
    } catch {
      Alert.alert('Error', 'Could not save sleep log.');
    } finally {
      setSaving(false);
    }
  };

  const goalHrs = profile?.sleep_goal_hrs || 8;
  const lastNightHrs = lastNight?.duration_hrs || 0;
  const vsGoal = lastNightHrs - goalHrs;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.sleep.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Sleep</Text>
            <Text style={styles.subtitle}>Track your rest and recovery</Text>
          </View>
          <TouchableOpacity style={styles.logBtn} onPress={() => setShowLog(true)}>
            <Text style={styles.logBtnText}>+ Log</Text>
          </TouchableOpacity>
        </View>

        {/* Last night card */}
        <View style={styles.mainCard}>
          <Text style={styles.cardLabel}>LAST NIGHT</Text>
          {lastNight ? (
            <>
              <Text style={styles.bigHours}>{lastNightHrs.toFixed(1)}<Text style={styles.bigHrsUnit}> hrs</Text></Text>
              <View style={styles.vsRow}>
                <Text style={[styles.vsText, { color: vsGoal >= 0 ? Colors.success : Colors.error }]}>
                  {vsGoal >= 0 ? '+' : ''}{vsGoal.toFixed(1)}h vs goal
                </Text>
                <Text style={styles.qualityStars}>
                  {'★'.repeat(lastNight.quality || 0)}{'☆'.repeat(5 - (lastNight.quality || 0))}
                </Text>
              </View>
              <Text style={styles.sleepTime}>
                {format(parseISO(lastNight.sleep_start), 'h:mm a')} → {format(parseISO(lastNight.sleep_end), 'h:mm a')}
              </Text>
            </>
          ) : (
            <View style={styles.noSleep}>
              <Text style={styles.noSleepText}>No sleep logged yet</Text>
              <TouchableOpacity onPress={() => setShowLog(true)}>
                <Text style={styles.noSleepLink}>Log last night's sleep →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weeklyAvg || '—'}h</Text>
            <Text style={styles.statLabel}>Weekly avg</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{goalHrs}h</Text>
            <Text style={styles.statLabel}>Your goal</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{history.length}</Text>
            <Text style={styles.statLabel}>Logs (14d)</Text>
          </View>
        </View>

        {/* Sleep insight */}
        {weeklyAvg > 0 && lastNight && (
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>✦ INSIGHT</Text>
            <Text style={styles.insightText}>
              {lastNightHrs >= weeklyAvg
                ? `You slept ${(lastNightHrs - weeklyAvg).toFixed(1)}h more than your weekly average. Great recovery!`
                : `You slept ${(weeklyAvg - lastNightHrs).toFixed(1)}h less than your weekly average. Prioritise rest tonight.`}
            </Text>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECENT HISTORY</Text>
            {history.slice(0, 7).map(log => (
              <View key={log.id} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyDate}>
                    {format(parseISO(log.sleep_end), 'EEE, MMM d')}
                  </Text>
                  <Text style={styles.historyTime}>
                    {format(parseISO(log.sleep_start), 'h:mm a')} → {format(parseISO(log.sleep_end), 'h:mm a')}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[
                    styles.historyHrs,
                    { color: log.duration_hrs >= goalHrs ? Colors.success : Colors.sleep.primary }
                  ]}>
                    {log.duration_hrs.toFixed(1)}h
                  </Text>
                  {log.quality && (
                    <Text style={styles.historyQuality}>{'★'.repeat(log.quality)}</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Log Sleep Modal */}
      <Modal visible={showLog} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log sleep</Text>
            <TouchableOpacity onPress={() => setShowLog(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>When did you sleep last night?</Text>

          {/* Bedtime */}
          <Text style={styles.modalLabel}>I fell asleep at</Text>
          <View style={styles.timeRow}>
            {[20, 21, 22, 23, 0, 1].map(h => (
              <TouchableOpacity
                key={h}
                style={[styles.timeChip, sleepHour === h && styles.timeChipSelected]}
                onPress={() => setSleepHour(h)}
              >
                <Text style={[styles.timeChipText, sleepHour === h && styles.timeChipTextSelected]}>
                  {h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Wake time */}
          <Text style={styles.modalLabel}>I woke up at</Text>
          <View style={styles.timeRow}>
            {[5, 6, 7, 8, 9, 10].map(h => (
              <TouchableOpacity
                key={h}
                style={[styles.timeChip, wakeHour === h && styles.timeChipSelected]}
                onPress={() => setWakeHour(h)}
              >
                <Text style={[styles.timeChipText, wakeHour === h && styles.timeChipTextSelected]}>
                  {h}am
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quality */}
          <Text style={styles.modalLabel}>Sleep quality</Text>
          <View style={styles.qualityRow}>
            {[1, 2, 3, 4, 5].map(q => (
              <TouchableOpacity key={q} onPress={() => setQuality(q)}>
                <Text style={[styles.qualityStar, q <= quality && styles.qualityStarSelected]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Duration preview */}
          {wakeHour > sleepHour || (sleepHour >= 20 && wakeHour <= 12) ? (
            <View style={styles.durationPreview}>
              <Text style={styles.durationText}>
                ≈ {sleepHour >= 20
                  ? (wakeHour + 24 - sleepHour)
                  : (wakeHour - sleepHour)} hours of sleep
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save sleep log</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
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
  logBtn: {
    backgroundColor: Colors.sleep.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  logBtnText: { color: Colors.bg.primary, fontWeight: Typography.weight.bold, fontSize: Typography.size.sm },

  mainCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: `${Colors.sleep.primary}30`,
  },
  cardLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: Colors.text.tertiary, letterSpacing: 1, marginBottom: Spacing.base },
  bigHours: { fontSize: 56, fontWeight: Typography.weight.bold, color: Colors.sleep.primary },
  bigHrsUnit: { fontSize: Typography.size.xl, color: Colors.text.secondary },
  vsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  vsText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  qualityStars: { color: Colors.nutrition.primary, fontSize: Typography.size.base },
  sleepTime: { color: Colors.text.tertiary, fontSize: Typography.size.sm, marginTop: Spacing.sm },
  noSleep: { paddingVertical: Spacing.base },
  noSleepText: { color: Colors.text.secondary, fontSize: Typography.size.base, marginBottom: Spacing.sm },
  noSleepLink: { color: Colors.sleep.primary, fontSize: Typography.size.sm },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  statValue: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  statLabel: { fontSize: Typography.size.xs, color: Colors.text.tertiary, marginTop: 2 },

  insightCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: Colors.sleep.primary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  insightLabel: { fontSize: Typography.size.xs, color: Colors.sleep.primary, fontWeight: Typography.weight.semibold, letterSpacing: 1, marginBottom: Spacing.xs },
  insightText: { color: Colors.text.primary, fontSize: Typography.size.sm, lineHeight: 20 },

  sectionLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: Colors.text.tertiary, letterSpacing: 1, marginBottom: Spacing.md },

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.border,
  },
  historyDate: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  historyTime: { color: Colors.text.tertiary, fontSize: Typography.size.xs, marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyHrs: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  historyQuality: { color: Colors.nutrition.primary, fontSize: Typography.size.xs },

  modal: { flex: 1, backgroundColor: Colors.bg.primary, padding: Spacing.xl, paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  modalClose: { color: Colors.text.secondary, fontSize: Typography.size.lg },
  modalSubtitle: { color: Colors.text.secondary, fontSize: Typography.size.base, marginBottom: Spacing.xl },
  modalLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.base },
  timeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.base },
  timeChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  timeChipSelected: { backgroundColor: `${Colors.sleep.primary}20`, borderColor: Colors.sleep.primary },
  timeChipText: { color: Colors.text.secondary, fontSize: Typography.size.sm },
  timeChipTextSelected: { color: Colors.sleep.primary, fontWeight: Typography.weight.semibold },
  qualityRow: { flexDirection: 'row', gap: Spacing.base, marginBottom: Spacing.xl },
  qualityStar: { fontSize: 32, color: Colors.bg.border },
  qualityStarSelected: { color: Colors.nutrition.primary },
  durationPreview: {
    backgroundColor: `${Colors.sleep.primary}15`,
    borderRadius: Radius.md,
    padding: Spacing.base,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  durationText: { color: Colors.sleep.primary, fontWeight: Typography.weight.semibold },
  saveBtn: {
    backgroundColor: Colors.sleep.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: 'auto',
  },
  saveBtnText: { color: Colors.bg.primary, fontWeight: Typography.weight.bold, fontSize: Typography.size.base },
});
