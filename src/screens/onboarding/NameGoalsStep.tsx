import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { User, Info } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, HEALTH_GOALS } from '../../constants/theme';
import type { OnboardingData } from '../../types';

interface Props {
  data: OnboardingData;
  update: (key: keyof OnboardingData, value: unknown) => void;
  toggleGoal: (goal: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function NameGoalsStep({ data, update, toggleGoal, onNext, onBack }: Props) {
  const isNameEmpty = data.name.trim().length === 0;
  const isGoalsEmpty = data.goals.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerRow}>
          <View style={styles.iconBackground}>
            <User size={28} color={Colors.brand.primary} />
          </View>
          <View>
            <Text style={styles.stepTitle}>Let's get acquainted</Text>
            <Text style={styles.stepSubtitle}>Aurora will use this to personalize your journey.</Text>
          </View>
        </View>

        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            value={data.name}
            onChangeText={v => update('name', v)}
            placeholder="Enter your name"
            placeholderTextColor={Colors.text.tertiary}
            autoCorrect={false}
          />
        </View>

        {/* Gender Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.chipRow}>
            {[
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Other', value: 'other' },
              { label: 'Prefer not to say', value: 'prefer_not_to_say' },
            ].map(g => (
              <TouchableOpacity
                key={g.value}
                style={[styles.chip, data.gender === g.value && styles.chipSelected]}
                onPress={() => update('gender', g.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, data.gender === g.value && styles.chipTextSelected]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Health Goals Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Health Goals</Text>
          <Text style={styles.subLabel}>Choose all that apply to you</Text>
          <View style={styles.goalsGrid}>
            {HEALTH_GOALS.map(goal => {
              const isSelected = data.goals.includes(goal);
              return (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalChip, isSelected && styles.goalChipSelected]}
                  onPress={() => toggleGoal(goal)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.goalChipText, isSelected && styles.goalChipTextSelected]}>
                    {goal}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Contextual Help */}
        <View style={styles.helpBox}>
          <Info size={16} color={Colors.text.secondary} />
          <Text style={styles.helpText}>
            We use these details to formulate your greetings, focus areas, and daily health metrics analysis.
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
  subLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  chipSelected: {
    backgroundColor: Colors.brand.soft,
    borderColor: Colors.brand.primary,
  },
  chipText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
  chipTextSelected: {
    color: Colors.brand.primary,
    fontWeight: Typography.weight.semibold,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  goalChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  goalChipSelected: {
    backgroundColor: Colors.brand.soft,
    borderColor: Colors.brand.primary,
  },
  goalChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
  goalChipTextSelected: {
    color: Colors.brand.primary,
    fontWeight: Typography.weight.semibold,
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
