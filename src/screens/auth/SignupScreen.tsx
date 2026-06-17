import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Globe } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { authService } from '../../services/api';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  navigation: { navigate: (screen: string) => void };
}

export default function SignupScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl = Linking.createURL('auth-callback');
      console.log('[Auth] Google OAuth redirectUrl:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No authentication URL returned from Supabase.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        console.log('[Auth] Redirect URL captured:', result.url);
        const parsed = Linking.parse(result.url);
        let accessToken: string | undefined;
        let refreshToken: string | undefined;

        const rawAccessToken = parsed.queryParams?.access_token;
        const rawRefreshToken = parsed.queryParams?.refresh_token;

        if (typeof rawAccessToken === 'string') {
          accessToken = rawAccessToken;
        } else if (Array.isArray(rawAccessToken)) {
          accessToken = rawAccessToken[0];
        }

        if (typeof rawRefreshToken === 'string') {
          refreshToken = rawRefreshToken;
        } else if (Array.isArray(rawRefreshToken)) {
          refreshToken = rawRefreshToken[0];
        }

        if (!accessToken || !refreshToken) {
          const hash = result.url.split('#')[1];
          if (hash) {
            const params = new URLSearchParams(hash);
            accessToken = params.get('access_token') || undefined;
            refreshToken = params.get('refresh_token') || undefined;
          }
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          console.log('[Auth] Google Session established successfully.');
        } else {
          throw new Error('Failed to parse access credentials from redirect.');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      console.error('[Auth] Google login error:', err);
      Alert.alert('Google login failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Your passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await authService.signUp(email.trim().toLowerCase(), password);
      if (data && !data.session) {
        Alert.alert(
          'Verification Sent',
          'Please check your inbox and verify your email, then sign in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Success', 'Account created successfully!');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      Alert.alert('Signup failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>aurora</Text>
          <Text style={styles.tagline}>Your personal health companion.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create your account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.text.tertiary}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Same password again"
              placeholderTextColor={Colors.text.tertiary}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={Colors.brand.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Create account</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            style={[styles.socialBtn, loading && styles.socialBtnDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Globe size={18} color={Colors.text.primary} />
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.switchLink}
          >
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text style={styles.switchAction}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logo: {
    fontSize: Typography.size.hero,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
    letterSpacing: 4,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  formTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  btn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  btnGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: Colors.white,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  switchText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
  },
  switchAction: {
    color: Colors.brand.primary,
    fontWeight: Typography.weight.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.bg.border,
  },
  dividerText: {
    color: Colors.text.tertiary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    gap: Spacing.sm,
  },
  socialBtnDisabled: {
    opacity: 0.6,
  },
  socialText: {
    color: Colors.text.primary,
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.size.base,
  },
});
