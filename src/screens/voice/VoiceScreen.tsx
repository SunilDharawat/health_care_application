import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function VoiceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Assistant</Text>
      <Text style={styles.text}>Voice assistance screen is under construction.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
    marginBottom: Spacing.sm,
  },
  text: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
