import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '../../store';
import { profileService, habitsService, hydrationService, sleepService } from '../../services/api';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import type { OnboardingData } from '../../types';

// Step components
import WelcomeStep from './WelcomeStep';
import NameGoalsStep from './NameGoalsStep';
import MetricsStep from './MetricsStep';
import HealthAssessmentStep from './HealthAssessmentStep';
import LifestyleStep from './LifestyleStep';
import HabitPreferencesStep from './HabitPreferencesStep';
import NotificationsStep from './NotificationsStep';
import QuickStartStep from './QuickStartStep';

const TOTAL_STEPS = 8;

interface ExtendedOnboardingData extends OnboardingData {
  today_hydration: number;
  last_night_sleep: number;
  today_energy: 'low' | 'ok' | 'high';
  habit_meditation: 'yes' | 'maybe' | 'no';
  habit_movement: 'yes' | 'maybe' | 'no';
  habit_reading: 'yes' | 'maybe' | 'no';
}

export default function OnboardingScreen({ navigation }: { navigation: any }) {
  const { user, setProfile } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<ExtendedOnboardingData>({
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
    // Extended properties for pre-logging and dynamic suggestions
    today_hydration: 0,
    last_night_sleep: 7.5,
    today_energy: 'ok',
    habit_meditation: 'yes',
    habit_movement: 'yes',
    habit_reading: 'yes',
  });

  const update = (key: string, value: unknown) => {
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
      case 0: return true; // Welcome Screen
      case 1: return data.name.trim().length > 0 && data.goals.length > 0;
      case 2: return data.age.trim().length > 0 && data.height.trim().length > 0 && data.weight.trim().length > 0;
      case 3: return true; // Health Assessment (defaults populated)
      case 4: return data.activity_level.length > 0 && data.wake_time.trim().length > 0 && data.bed_time.trim().length > 0;
      case 5: return true; // Habit Suggestions
      case 6: return true; // Notifications
      case 7: return true; // Quick Start Outro
      default: return true;
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Complete onboarding with fallback/default metrics
      const defaultData: OnboardingData = {
        name: 'User',
        age: '25',
        gender: 'prefer_not_to_say',
        height: '175',
        weight: '70',
        wake_time: '07:00',
        bed_time: '23:00',
        activity_level: 'moderate',
        goals: ['Improve Hydration', 'Build Better Habits'],
        notifications: { hydration: true, sleep: true, habits: true, insights: true },
      };
      const profile = await profileService.completeOnboarding(user.id, defaultData);
      setProfile(profile);
    } catch (err) {
      Alert.alert('Error', 'Could not complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (navigateToVoice: boolean) => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Complete onboarding profile
      const profile = await profileService.completeOnboarding(user.id, {
        name: data.name.trim(),
        age: data.age,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        wake_time: data.wake_time,
        bed_time: data.bed_time,
        activity_level: data.activity_level,
        goals: data.goals,
        notifications: data.notifications,
      });

      // 2. Create active habits based on step 5 choice (if yes/maybe)
      if (data.habit_meditation !== 'no') {
        await habitsService.createHabit(user.id, {
          name: 'Daily Meditation',
          description: 'Daily practice for mental clarity & stress relief.',
          icon: 'meditation',
          color: '#7C6FF7',
          frequency: 'daily',
        });
      }
      if (data.habit_movement !== 'no') {
        await habitsService.createHabit(user.id, {
          name: 'Daily Movement',
          description: '30 mins of any activity (walk, yoga, run, gym).',
          icon: 'exercise',
          color: '#FF6F61',
          frequency: 'daily',
        });
      }
      if (data.habit_reading !== 'no') {
        await habitsService.createHabit(user.id, {
          name: 'Nightly Reading',
          description: '20 mins of reading before bed for better sleep.',
          icon: 'reading',
          color: '#5B8FF9',
          frequency: 'daily',
        });
      }

      // 3. Pre-log water from assessment
      if (data.today_hydration > 0) {
        await hydrationService.logWater(user.id, data.today_hydration, 'manual');
      }

      // 4. Pre-log sleep from assessment
      if (data.last_night_sleep > 0) {
        const wakeHours = parseInt(data.wake_time.split(':')[0]) || 7;
        const wakeMins = parseInt(data.wake_time.split(':')[1]) || 0;
        
        // Sleep end (today at wake time)
        const sleepEnd = new Date();
        sleepEnd.setHours(wakeHours, wakeMins, 0, 0);

        // Sleep start (sleep end minus sleep hours)
        const sleepStart = new Date(sleepEnd.getTime() - data.last_night_sleep * 60 * 60 * 1000);

        let sleepQuality = 75;
        if (data.today_energy === 'low') sleepQuality = 50;
        if (data.today_energy === 'high') sleepQuality = 90;

        await sleepService.logSleep(
          user.id,
          sleepStart.toISOString(),
          sleepEnd.toISOString(),
          sleepQuality,
          'Onboarding initial check-in'
        );
      }

      // 5. Update auth store to render dashboard
      setProfile(profile);

      // 6. Navigation routing options
      if (navigateToVoice) {
        // Yield minor timeout to ensure the tab/navigation state updates first
        setTimeout(() => {
          navigation.navigate('Voice', {
            initialPrompt: `Hi Aurora, I just completed onboarding! Let's get started.`,
          });
        }, 100);
      }
    } catch (err) {
      console.error('[Onboarding] handleFinish error:', err);
      Alert.alert('Error', 'Could not save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS - 2 }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressDot, i < step && styles.progressDotActive]}
        />
      ))}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep onNext={() => setStep(1)} onSkip={handleSkip} />;
      case 1:
        return (
          <NameGoalsStep
            data={data}
            update={update}
            toggleGoal={toggleGoal}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        );
      case 2:
        return <MetricsStep data={data} update={update} />;
      case 3:
        return <HealthAssessmentStep data={data} update={update} />;
      case 4:
        return <LifestyleStep data={data} update={update} />;
      case 5:
        return <HabitPreferencesStep data={data} update={update} />;
      case 6:
        return <NotificationsStep data={data} toggleNotification={toggleNotification} />;
      case 7:
        return <QuickStartStep data={data} onFinish={handleFinish} loading={loading} />;
      default:
        return null;
    }
  };

  const showHeader = step > 0 && step < 7;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          !showHeader && { paddingTop: 40 } // Adjust top spacing for welcome & outro
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showHeader && (
          <View style={styles.header}>
            <Text style={styles.logo}>aurora</Text>
            <ProgressBar />
          </View>
        )}

        {/* Step content */}
        {renderStep()}
      </ScrollView>

      {/* Navigation Footer for intermediate steps */}
      {showHeader && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            onPress={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 130, // Extra padding to clear footer
  },
  header: {
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
    letterSpacing: 3,
    marginBottom: Spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.border,
  },
  progressDotActive: {
    backgroundColor: Colors.brand.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.bg.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.bg.border,
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
  backBtnText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
  },
  nextBtn: {
    flex: 0.7,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.bg.secondary,
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
});
