import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Scale, Info } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import type { OnboardingData } from '../../types';

interface Props {
  data: OnboardingData;
  update: (key: keyof OnboardingData, value: unknown) => void;
}

export default function MetricsStep({ data, update }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerRow}>
          <View style={styles.iconBackground}>
            <Scale size={28} color={Colors.brand.secondary} />
          </View>
          <View>
            <Text style={styles.stepTitle}>Body Metrics</Text>
            <Text style={styles.stepSubtitle}>Provide details to personalize health formulas.</Text>
          </View>
        </View>

        {/* Inputs */}
        {[
          { key: 'age', label: 'Age', placeholder: 'e.g. 25', unit: 'years', keyboardType: 'numeric' as const },
          { key: 'height', label: 'Height', placeholder: 'e.g. 175', unit: 'cm', keyboardType: 'numeric' as const },
          { key: 'weight', label: 'Weight', placeholder: 'e.g. 70', unit: 'kg', keyboardType: 'numeric' as const },
        ].map(field => (
          <View key={field.key} style={styles.inputGroup}>
            <Text style={styles.label}>{field.label}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={data[field.key as keyof OnboardingData] as string}
                onChangeText={v => update(field.key as keyof OnboardingData, v)}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.text.tertiary}
                keyboardType={field.keyboardType}
              />
              <Text style={styles.unitText}>{field.unit}</Text>
            </View>
          </View>
        ))}

        {/* Contextual Help */}
        <View style={styles.helpBox}>
          <Info size={16} color={Colors.text.secondary} />
          <Text style={styles.helpText}>
            Your age, height, and weight are utilized to automatically configure your daily hydration goals and base metabolic rate (BMR).
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
  },
  unitText: {
    paddingRight: Spacing.base,
    color: Colors.text.secondary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
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
