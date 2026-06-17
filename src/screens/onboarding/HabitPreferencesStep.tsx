import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Brain, Smile, Flame, BookOpen, Info } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

interface Props {
  data: any;
  update: (key: string, value: any) => void;
}

export default function HabitPreferencesStep({ data, update }: Props) {
  const habitsList = [
    {
      key: 'habit_meditation',
      name: 'Daily Meditation',
      description: 'Daily practice for mental clarity & stress relief.',
      icon: <Brain size={20} color={Colors.brand.primary} />,
      themeColor: Colors.brand.primary,
    },
    {
      key: 'habit_movement',
      name: 'Daily Movement',
      description: '30 mins of any activity (walk, yoga, run, gym).',
      icon: <Flame size={20} color="#FF6F61" />,
      themeColor: '#FF6F61',
    },
    {
      key: 'habit_reading',
      name: 'Nightly Reading',
      description: '20 mins of reading before bed for better sleep.',
      icon: <BookOpen size={20} color="#5B8FF9" />,
      themeColor: '#5B8FF9',
    },
  ];

  const handleSelect = (key: string, value: 'yes' | 'maybe' | 'no') => {
    update(key, value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerRow}>
          <View style={styles.iconBackground}>
            <Brain size={28} color={Colors.brand.primary} />
          </View>
          <View>
            <Text style={styles.stepTitle}>Let's Build Habits</Text>
            <Text style={styles.stepSubtitle}>Start with 2-3 keystone habits for consistency.</Text>
          </View>
        </View>

        {/* Habits Suggestions */}
        <View style={styles.habitsSection}>
          {habitsList.map(h => {
            const currentSelection = data[h.key] ?? 'yes'; // Default to yes
            return (
              <View key={h.key} style={styles.habitRow}>
                <View style={styles.habitHeader}>
                  <View style={[styles.habitIconBox, { backgroundColor: h.themeColor + '15' }]}>
                    {h.icon}
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitName}>{h.name}</Text>
                    <Text style={styles.habitDesc}>{h.description}</Text>
                  </View>
                </View>

                {/* Yes, Maybe, No choices */}
                <View style={styles.choiceContainer}>
                  {[
                    { label: 'Yes', value: 'yes' as const },
                    { label: 'Maybe', value: 'maybe' as const },
                    { label: 'No', value: 'no' as const },
                  ].map(choice => {
                    const isSelected = currentSelection === choice.value;
                    let activeStyle = styles.choiceBtnActive;
                    let activeText = styles.choiceTextActive;

                    if (isSelected) {
                      if (choice.value === 'yes') {
                        activeStyle = { backgroundColor: Colors.success + '20', borderColor: Colors.success };
                        activeText = { color: Colors.success, fontWeight: Typography.weight.semibold };
                      } else if (choice.value === 'maybe') {
                        activeStyle = { backgroundColor: Colors.warning + '20', borderColor: Colors.warning };
                        activeText = { color: Colors.warning, fontWeight: Typography.weight.semibold };
                      } else {
                        activeStyle = { backgroundColor: Colors.error + '20', borderColor: Colors.error };
                        activeText = { color: Colors.error, fontWeight: Typography.weight.semibold };
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={choice.value}
                        style={[styles.choiceBtn, isSelected && activeStyle]}
                        onPress={() => handleSelect(h.key, choice.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.choiceText, isSelected && activeText]}>
                          {choice.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* Contextual Help */}
        <View style={styles.helpBox}>
          <Info size={16} color={Colors.text.secondary} />
          <Text style={styles.helpText}>
            Selecting Yes or Maybe will automatically add these habits to your dashboard so you can start logging them today.
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
  habitsSection: {
    marginBottom: Spacing.xl,
  },
  habitRow: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  habitIconBox: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  habitDesc: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 2,
    lineHeight: Typography.size.sm * 1.4,
  },
  choiceContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBtnActive: {
    backgroundColor: Colors.brand.soft,
    borderColor: Colors.brand.primary,
  },
  choiceText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  choiceTextActive: {
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
