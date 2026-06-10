import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store';
import { Colors, Typography } from '../constants/theme';

// ── Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// ── Onboarding
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

// ── Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import HydrationScreen from '../screens/hydration/HydrationScreen';
import SleepScreen from '../screens/sleep/SleepScreen';
import HabitsScreen from '../screens/habits/HabitsScreen';
import NutritionScreen from '../screens/nutrition/NutritionScreen';
import VoiceScreen from '../screens/voice/VoiceScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ── Tab bar icons (text-based, replace with icons later)
const TAB_ICONS: Record<string, string> = {
  Home:      '⬡',
  Water:     '💧',
  Sleep:     '🌙',
  Habits:    '✓',
  Nutrition: '🥗',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.brand.primary,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarLabel: ({ color }) => (
          <Text style={[styles.tabLabel, { color }]}>
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ color }) => (
          <Text style={[styles.tabIcon, { color }]}>
            {TAB_ICONS[route.name] || '○'}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home"      component={DashboardScreen} />
      <Tab.Screen name="Water"     component={HydrationScreen} />
      <Tab.Screen name="Sleep"     component={SleepScreen} />
      <Tab.Screen name="Habits"    component={HabitsScreen} />
      <Tab.Screen name="Nutrition" component={NutritionScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>aurora</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth flow
        <>
          <Stack.Screen name="Login"  component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : !profile?.onboarding_done ? (
        // Onboarding flow
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        // Main app
        <>
          <Stack.Screen name="Main"  component={MainTabs} />
          <Stack.Screen
            name="Voice"
            component={VoiceScreen}
            options={{ presentation: 'modal' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    color: Colors.brand.primary,
    fontSize: Typography.size.hero,
    fontWeight: Typography.weight.bold,
    letterSpacing: 4,
  },
  tabBar: {
    backgroundColor: Colors.bg.secondary,
    borderTopColor: Colors.bg.border,
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: 10,
    height: 72,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
  },
});
