import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Award, Mic, ArrowRight, Check, Droplet, Moon, Star } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

interface Props {
  data: any;
  onFinish: (navigateToVoice: boolean) => void;
  loading: boolean;
}

export default function QuickStartStep({ data, onFinish, loading }: Props) {
  const hydrationLogged = data.today_hydration ?? 0;
  const sleepLogged = data.last_night_sleep ?? 7.5;
  const hasMeditation = data.habit_meditation !== 'no';
  const hasMovement = data.habit_movement !== 'no';
  const hasReading = data.habit_reading !== 'no';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerRow}>
          <View style={styles.iconBackground}>
            <Award size={28} color={Colors.brand.primary} />
          </View>
          <View>
            <Text style={styles.stepTitle}>You're All Set!</Text>
            <Text style={styles.stepSubtitle}>Your health profile is successfully configured.</Text>
          </View>
        </View>

        {/* Initial Log Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>First Day Pre-Logs</Text>
          
          {/* Hydration Summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconBox, { backgroundColor: Colors.hydration.light }]}>
              <Droplet size={16} color={Colors.hydration.primary} />
            </View>
            <Text style={styles.summaryText}>
              {hydrationLogged > 0 ? `💧 ${hydrationLogged}ml water pre-logged` : '💧 No water logged yet today'}
            </Text>
          </View>

          {/* Sleep Summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconBox, { backgroundColor: Colors.sleep.light }]}>
              <Moon size={16} color={Colors.sleep.primary} />
            </View>
            <Text style={styles.summaryText}>
              😴 {sleepLogged}h of sleep logged for last night
            </Text>
          </View>

          {/* Habits Summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconBox, { backgroundColor: Colors.habits.light }]}>
              <Star size={16} color={Colors.habits.primary} />
            </View>
            <View style={styles.habitsSummaryList}>
              <Text style={styles.summaryText}>Active habits starting today:</Text>
              <View style={styles.habitsBadges}>
                {hasMeditation && <View style={styles.badge}><Text style={styles.badgeText}>Meditation</Text></View>}
                {hasMovement && <View style={styles.badge}><Text style={styles.badgeText}>Movement</Text></View>}
                {hasReading && <View style={styles.badge}><Text style={styles.badgeText}>Reading</Text></View>}
                {!hasMeditation && !hasMovement && !hasReading && (
                  <Text style={styles.noHabitsText}>None selected</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Voice Demo Hook */}
        <View style={styles.voiceDemoBox}>
          <View style={styles.voiceDemoHeader}>
            <Mic size={20} color={Colors.brand.primary} />
            <Text style={styles.voiceDemoTitle}>Quick Voice Interaction</Text>
          </View>
          <Text style={styles.voiceDemoDesc}>
            Aurora uses AI speech processing. You can try a voice command immediately:
          </Text>
          <View style={styles.quoteBox}>
            <Text style={styles.quoteText}>
              "Try asking: 'How does my sleep compare to yesterday?' or 'Add 500ml water'"
            </Text>
          </View>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Go to Voice */}
        <TouchableOpacity
          style={styles.voiceBtn}
          onPress={() => onFinish(true)}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.brand.primary} />
          ) : (
            <>
              <Text style={styles.voiceBtnText}>Try voice demo</Text>
              <Mic size={18} color={Colors.brand.primary} />
            </>
          )}
        </TouchableOpacity>

        {/* Go to Dashboard */}
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => onFinish(false)}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <View style={styles.gradientBtnWrapper}>
              <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
              <ArrowRight size={18} color={Colors.white} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  iconBackground: {
    padding: Spacing.sm,
    backgroundColor: Colors.brand.soft,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  stepSubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  summaryCardTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  summaryIconBox: {
    padding: Spacing.xs,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    color: Colors.text.primary,
    fontSize: Typography.size.base,
    lineHeight: Typography.size.base * 1.4,
  },
  habitsSummaryList: {
    flex: 1,
    gap: Spacing.xs,
  },
  habitsBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badge: {
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
  noHabitsText: {
    color: Colors.text.tertiary,
    fontSize: Typography.size.sm,
    fontStyle: 'italic',
  },
  voiceDemoBox: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  voiceDemoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  voiceDemoTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  voiceDemoDesc: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.size.sm * 1.5,
    marginBottom: Spacing.sm,
  },
  quoteBox: {
    backgroundColor: Colors.bg.tertiary,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
  },
  quoteText: {
    color: Colors.text.primary,
    fontSize: Typography.size.sm,
    fontStyle: 'italic',
    lineHeight: Typography.size.sm * 1.5,
  },
  buttonsContainer: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  voiceBtnText: {
    color: Colors.brand.primary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  dashboardBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  gradientBtnWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.brand.primary,
  },
  dashboardBtnText: {
    color: Colors.white,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
});
