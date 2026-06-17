import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store';
import { authService, profileService } from './src/services/api';

export default function App() {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth session
    const initAuth = async () => {
      try {
        const session = await authService.getSession();
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          const profile = await profileService.getProfile(session.user.id);
          setProfile(profile);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session && typeof session === 'object' && 'user' in session) {
          setLoading(true);
          const s = session as { user: { id: string; email: string } };
          setUser({ id: s.user.id, email: s.user.email });
          try {
            const profile = await profileService.getProfile(s.user.id);
            setProfile(profile);
          } catch { /* profile may not exist yet */ }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
