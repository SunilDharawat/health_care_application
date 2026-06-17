import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Bell, Info } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import type { OnboardingData } from '../../types';

interface Props {
  data: OnboardingData;
  toggleNotification: (key: keyof OnboardingData['notifications']) => void;
}

export default function NotificationsStep({ data, toggleNotification }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerRow}>
          <View style={styles.iconBackground}>
            <Bell size={28} color={Colors.nutrition.primary} />
          </View>
          <View>
            <Text style={styles.stepTitle}>Reminders & Alerts</Text>
            <Text style={styles.stepSubtitle}>Enable reminders to keep you consistent.</Text>
          </View>
        </View>

        {/* Reminders List */}
        <View style={styles.list}>
          {(Object.keys(data.notifications) as Array<keyof typeof data.notifications>).map(key => (
            <View key={key} style={styles.notifRow}>
              <View style={styles.notifInfo}>
                <Text style={styles.notifLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)} reminders
                </Text>
                <Text style={styles.notifDesc}>
                  {key === 'hydration' && 'Receive tips and prompts to drink water.'}
                  {key === 'sleep' && 'Reminders to wind down based on schedule.'}
                  {key === 'habits' && 'Checklists to log your daily routines.'}
                  {key === 'insights' && 'Daily personalized AI health analysis.'}
                </Text>
              </View>
              <Switch
                value={data.notifications[key]}
                onValueChange={() => toggleNotification(key)}
                trackColor={{ false: Colors.bg.border, true: Colors.brand.primary }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
        </View>

        {/* Contextual Help */}
        <View style={styles.helpBox}>
          <Info size={16} color={Colors.text.secondary} />
          <Text style={styles.helpText}>
            You can modify, pause, or disable notification channels at any time in the app settings panel.
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
    backgroundColor: Colors.nutrition.light,
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
  list: {
    marginBottom: Spacing.xl,
  },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.border,
    gap: Spacing.base,
  },
  notifInfo: {
    flex: 1,
  },
  notifLabel: {
    color: Colors.text.primary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
  },
  notifDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.size.xs,
    marginTop: 4,
    lineHeight: Typography.size.xs * 1.4,
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
