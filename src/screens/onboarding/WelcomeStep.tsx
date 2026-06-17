import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export default function WelcomeStep({ onNext, onSkip }: Props) {
  return (
    <View style={styles.container}>
      {/* Top Bar for Skip Option */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={Colors.brand.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Sparkles size={36} color={Colors.white} />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.logo}>aurora</Text>
        <Text style={styles.title}>Understand yourself better every day</Text>
        
        {/* Description */}
        <Text style={styles.description}>
          Welcome! Let's set up your personalized health companion in 2 minutes to calculate your daily goals and trigger smart insights.
        </Text>
      </View>

      {/* Button */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={onNext} activeOpacity={0.85} style={styles.nextBtn}>
          <LinearGradient
            colors={Colors.brand.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtnGradient}
          >
            <Text style={styles.nextBtnText}>Let's start</Text>
            <ArrowRight size={18} color={Colors.white} />
          </LinearGradient>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.sm,
  },
  skipBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  skipText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
  },
  content: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
  },
  iconGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: Typography.size.hero,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
    letterSpacing: 4,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: Typography.size.xl * 1.3,
  },
  description: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.size.base * 1.6,
    paddingHorizontal: Spacing.md,
  },
  footer: {
    width: '100%',
    marginTop: Spacing.xxl,
  },
  nextBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  nextBtnGradient: {
    flexDirection: 'row',
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 52,
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
});
