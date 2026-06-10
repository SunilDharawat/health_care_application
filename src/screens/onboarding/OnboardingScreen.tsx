import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Switch, Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store';
import { profileService } from '../../services/api';
import { Colors, Typography, Spacing, Radius, HEALTH_GOALS, ACTIVITY_LEVELS } from '../../constants/theme';
import type { OnboardingData } from '../../types';

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const { user, setProfile } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    name: '',
    age: '',
    gender: 'prefer_not_to_say',
    height: '',
    weight: '',
    wake_time: '07:00',
    bed_time: '23:00',
    activity_level: 'moderate',
    goals: [],
    notifications: { hydration: true, sleep: true, habits: true, insights: true },
  });

  const update = (key: keyof OnboardingData, value: unknown) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleGoal = (goal: string) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const toggleNotification = (key: keyof OnboardingData['notifications']) => {
    setData(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 0: return data.name.trim().length > 0;
      case 1: return data.age.trim().length > 0 && data.height.trim().length > 0 && data.weight.trim().length > 0;
      case 2: return data.activity_level.length > 0;
      case 3: return data.goals.length > 0;
      case 4: return true;
      default: return true;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profile = await profileService.completeOnboarding(user.id, data);
      setProfile(profile);
    } catch (err) {
      Alert.alert('Error', 'Could not save your information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressDot, i <= step && styles.progressDotActive]}
        />
      ))}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      // Step 0 — Name & gender
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>👋</Text>
            <Text style={styles.stepTitle}>What should Aurora call you?</Text>
            <Text style={styles.stepSubtitle}>Let's make this personal from the start.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={styles.input}
                value={data.name}
                onChangeText={v => update('name', v)}
                placeholder="Enter your name"
                placeholderTextColor={Colors.text.tertiary}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.chipRow}>
                {['Male', 'Female', 'Other'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, data.gender === g.toLowerCase() && styles.chipSelected]}
                    onPress={() => update('gender', g.toLowerCase())}
                  >
                    <Text style={[styles.chipText, data.gender === g.toLowerCase() && styles.chipTextSelected]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      // Step 1 — Body metrics
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>📊</Text>
            <Text style={styles.stepTitle}>Tell us about your body</Text>
            <Text style={styles.stepSubtitle}>Used to calculate your personalised water goal.</Text>

            {[
              { key: 'age', label: 'Age', placeholder: 'Years', keyboardType: 'numeric' as const },
              { key: 'height', label: 'Height (cm)', placeholder: 'e.g. 170', keyboardType: 'numeric' as const },
              { key: 'weight', label: 'Weight (kg)', placeholder: 'e.g. 70', keyboardType: 'numeric' as const },
            ].map(field => (
              <View key={field.key} style={styles.inputGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={data[field.key as keyof OnboardingData] as string}
                  onChangeText={v => update(field.key as keyof OnboardingData, v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType={field.keyboardType}
                />
              </View>
            ))}
          </View>
        );

      // Step 2 — Lifestyle
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>⏰</Text>
            <Text style={styles.stepTitle}>Your daily rhythm</Text>
            <Text style={styles.stepSubtitle}>Aurora will remind you at the right times.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Activity level</Text>
              {ACTIVITY_LEVELS.map(level => (
                <TouchableOpacity
                  key={level.value}
                  style={[styles.activityRow, data.activity_level === level.value && styles.activityRowSelected]}
                  onPress={() => update('activity_level', level.value)}
                >
                  <View>
                    <Text style={[styles.activityLabel, data.activity_level === level.value && styles.activityLabelSelected]}>
                      {level.label}
                    </Text>
                    <Text style={styles.activityDesc}>{level.description}</Text>
                  </View>
                  {data.activity_level === level.value && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      // Step 3 — Health goals
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🎯</Text>
            <Text style={styles.stepTitle}>What are your health goals?</Text>
            <Text style={styles.stepSubtitle}>Choose everything that applies to you.</Text>

            <View style={styles.goalsGrid}>
              {HEALTH_GOALS.map(goal => (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalChip, data.goals.includes(goal) && styles.goalChipSelected]}
                  onPress={() => toggleGoal(goal)}
                >
                  <Text style={[styles.goalChipText, data.goals.includes(goal) && styles.goalChipTextSelected]}>
                    {goal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      // Step 4 — Notifications
      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🔔</Text>
            <Text style={styles.stepTitle}>Stay on track with reminders</Text>
            <Text style={styles.stepSubtitle}>You can change these any time in settings.</Text>

            {(Object.keys(data.notifications) as Array<keyof typeof data.notifications>).map(key => (
              <View key={key} style={styles.notifRow}>
                <Text style={styles.notifLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)} reminders
                </Text>
                <Switch
                  value={data.notifications[key]}
                  onValueChange={() => toggleNotification(key)}
                  trackColor={{ false: Colors.bg.border, true: Colors.brand.primary }}
                  thumbColor={Colors.white}
                />
              </View>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Text style={styles.logo}>aurora</Text>
        <ProgressBar />

        {/* Step content */}
        {renderStep()}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled, { flex: step > 0 ? 0.7 : 1 }]}
          onPress={step < TOTAL_STEPS - 1 ? () => setStep(s => s + 1) : handleFinish}
          disabled={!canProceed() || loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={Colors.brand.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtnGradient}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.nextBtnText}>
                  {step < TOTAL_STEPS - 1 ? 'Continue' : "Let's go →"}
                </Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: 120 },
  logo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
    letterSpacing: 3,
    marginBottom: Spacing.xl,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxxl,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.bg.border,
  },
  progressDotActive: {
    backgroundColor: Colors.brand.primary,
  },
  stepContent: { flex: 1 },
  stepEmoji: { fontSize: 36, marginBottom: Spacing.base },
  stepTitle: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.size.xxl * 1.2,
  },
  stepSubtitle: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    marginBottom: Spacing.xxl,
    lineHeight: Typography.size.base * 1.6,
  },
  inputGroup: { marginBottom: Spacing.lg },
  label: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
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
  chipText: { color: Colors.text.secondary, fontSize: Typography.size.sm },
  chipTextSelected: { color: Colors.brand.primary, fontWeight: Typography.weight.semibold },
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
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.soft,
  },
  activityLabel: { color: Colors.text.secondary, fontWeight: Typography.weight.medium },
  activityLabelSelected: { color: Colors.brand.primary },
  activityDesc: { color: Colors.text.tertiary, fontSize: Typography.size.xs, marginTop: 2 },
  checkMark: { color: Colors.brand.primary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
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
  goalChipText: { color: Colors.text.secondary, fontSize: Typography.size.sm },
  goalChipTextSelected: { color: Colors.brand.primary, fontWeight: Typography.weight.semibold },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.border,
  },
  notifLabel: { color: Colors.text.primary, fontSize: Typography.size.base },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.xl,
    backgroundColor: Colors.bg.primary,
    paddingBottom: 36,
  },
  backBtn: {
    flex: 0.3,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  backBtnText: { color: Colors.text.secondary, fontSize: Typography.size.base },
  nextBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
});
