import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Heart, Activity } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

interface Props {
  // Can be typed as any or we can define a local type
  data: any;
  update: (key: string, value: any) => void;
}

export default function HealthAssessmentStep({ data, update }: Props) {
  const hydrationOptions = [
    { label: 'Nothing yet', subtitle: '0 ml', value: 0 },
    { label: 'A little', subtitle: '1-2 glasses (500 ml)', value: 500 },
    { label: 'Some', subtitle: '3-5 glasses (1000 ml)', value: 1000 },
    { label: 'A lot', subtitle: '6+ glasses (1500 ml+)', value: 1500 },
  ];

  const sleepOptions = [
    { label: 'Poor', subtitle: 'Less than 6h', value: 5 },
    { label: 'OK', subtitle: '6-7h', value: 6.5 },
    { label: 'Good', subtitle: '7-8h', value: 7.5 },
    { label: 'Great', subtitle: '8h+', value: 8.5 },
  ];

  const energyOptions = [
    { label: 'Low', value: 'low' },
    { label: 'OK', value: 'ok' },
    { label: 'High', value: 'high' },
  ];

  const todayHydration = data.today_hydration ?? 0;
  const lastNightSleep = data.last_night_sleep ?? 7.5;
  const todayEnergy = data.today_energy ?? 'ok';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerRow}>
          <View style={styles.iconBackground}>
            <Heart size={28} color={Colors.habits.primary} />
          </View>
          <View>
            <Text style={styles.stepTitle}>Health Assessment</Text>
            <Text style={styles.stepSubtitle}>How are you feeling today?</Text>
          </View>
        </View>

        {/* Section 1: Hydration */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Hydration Assessment</Text>
          <Text style={styles.sectionSubLabel}>How much water have you drunk today?</Text>
          <View style={styles.optionsGrid}>
            {hydrationOptions.map(opt => {
              const isSelected = todayHydration === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => update('today_hydration', opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Sleep */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sleep Assessment</Text>
          <Text style={styles.sectionSubLabel}>How many hours did you sleep last night?</Text>
          <View style={styles.optionsGrid}>
            {sleepOptions.map(opt => {
              const isSelected = lastNightSleep === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => update('last_night_sleep', opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 3: Energy */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Energy & Mood</Text>
          <Text style={styles.sectionSubLabel}>How is your current energy level?</Text>
          <View style={styles.chipRow}>
            {energyOptions.map(opt => {
              const isSelected = todayEnergy === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => update('today_energy', opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    backgroundColor: Colors.habits.light,
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  sectionSubLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  card: {
    width: '48%',
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  cardSelected: {
    backgroundColor: Colors.habits.light,
    borderColor: Colors.habits.primary,
  },
  cardTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  cardTitleSelected: {
    color: Colors.habits.primary,
  },
  cardSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: Colors.habits.light,
    borderColor: Colors.habits.primary,
  },
  chipText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
  },
  chipTextSelected: {
    color: Colors.habits.primary,
    fontWeight: Typography.weight.semibold,
  },
});
