import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Moon, Clock, Info } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, ACTIVITY_LEVELS } from '../../constants/theme';
import type { OnboardingData } from '../../types';

interface Props {
  data: OnboardingData;
  update: (key: keyof OnboardingData, value: unknown) => void;
}

export default function LifestyleStep({ data, update }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerRow}>
          <View style={styles.iconBackground}>
            <Moon size={28} color={Colors.sleep.primary} />
          </View>
          <View>
            <Text style={styles.stepTitle}>Lifestyle & Rhythm</Text>
            <Text style={styles.stepSubtitle}>Provide details about your daily activity and sleep.</Text>
          </View>
        </View>

        {/* Activity Level Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Activity level</Text>
          {ACTIVITY_LEVELS.map(level => {
            const isSelected = data.activity_level === level.value;
            return (
              <TouchableOpacity
                key={level.value}
                style={[styles.activityRow, isSelected && styles.activityRowSelected]}
                onPress={() => update('activity_level', level.value)}
                activeOpacity={0.7}
              >
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityLabel, isSelected && styles.activityLabelSelected]}>
                    {level.label}
                  </Text>
                  <Text style={styles.activityDesc}>{level.description}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkIcon}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Wake and Bed Times */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Typical Sleep Schedule</Text>
          <View style={styles.timeInputsRow}>
            {/* Bed Time */}
            <View style={styles.timeInputBox}>
              <Text style={styles.timeInputLabel}>Bed time</Text>
              <View style={styles.timeInputContainer}>
                <Clock size={16} color={Colors.text.tertiary} style={styles.timeInputIcon} />
                <TextInput
                  style={styles.timeInput}
                  value={data.bed_time}
                  onChangeText={v => update('bed_time', v)}
                  placeholder="23:00"
                  placeholderTextColor={Colors.text.tertiary}
                  maxLength={5}
                />
              </View>
            </View>

            {/* Wake Time */}
            <View style={styles.timeInputBox}>
              <Text style={styles.timeInputLabel}>Wake time</Text>
              <View style={styles.timeInputContainer}>
                <Clock size={16} color={Colors.text.tertiary} style={styles.timeInputIcon} />
                <TextInput
                  style={styles.timeInput}
                  value={data.wake_time}
                  onChangeText={v => update('wake_time', v)}
                  placeholder="07:00"
                  placeholderTextColor={Colors.text.tertiary}
                  maxLength={5}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Contextual Help */}
        <View style={styles.helpBox}>
          <Info size={16} color={Colors.text.secondary} />
          <Text style={styles.helpText}>
            Your daily rhythm is used to schedule smart suggestions, reminders, and sleep quality surveys.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: Colors.sleep.light,
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
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  activityRow: {
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
  activityRowSelected: {
    borderColor: Colors.sleep.primary,
    backgroundColor: Colors.sleep.light,
  },
  activityInfo: {
    flex: 1,
  },
  activityLabel: {
    color: Colors.text.primary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
  },
  activityLabelSelected: {
    color: Colors.sleep.primary,
    fontWeight: Typography.weight.semibold,
  },
  activityDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.size.xs,
    marginTop: 2,
  },
  checkIcon: {
    padding: 2,
    borderRadius: Radius.full,
  },
  checkText: {
    color: Colors.sleep.primary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeInputBox: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    paddingHorizontal: Spacing.base,
  },
  timeInputIcon: {
    marginRight: Spacing.sm,
  },
  timeInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bg.secondary,
    padding: Spacing.base,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  helpText: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    lineHeight: Typography.size.sm * 1.5,
  },
});
