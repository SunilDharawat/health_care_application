import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated, Easing, Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  createAudioPlayer,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { useAuthStore } from '../../store';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

// ── Replace with your deployed backend URL
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Message {
  id: string;
  role: 'user' | 'aurora';
  text: string;
  timestamp: Date;
  action?: string;
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking';

export default function VoiceScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { user } = useAuthStore();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'aurora',
      text: "Hi! I'm Aurora. Hold the button and talk to me about your health. I can log water, sleep, habits, and answer questions about your progress.",
      timestamp: new Date(),
    },
  ]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const currentPlayerRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Pulse animation for recording state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Recording lifecycle control refs
  const stopRequestedRef = useRef(false);
  const isRecordingStartedRef = useRef(false);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, easing: Easing.ease, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  useEffect(() => {
    // Request audio permissions on mount
    (async () => {
      const { status } = await getRecordingPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await requestRecordingPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Microphone permission required', 'Please allow microphone access in settings.');
        }
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
    return () => {
      if (currentPlayerRef.current) {
        currentPlayerRef.current.release();
      }
    };
  }, []);

  const addMessage = useCallback((role: 'user' | 'aurora', text: string, action?: string) => {
    const msg: Message = { id: Date.now().toString(), role, text, action, timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return msg;
  }, []);

  // ── Start recording
  const startRecording = async () => {
    if (voiceState !== 'idle') return;
    
    stopRequestedRef.current = false;
    isRecordingStartedRef.current = false;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setVoiceState('recording');
      startPulse();

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      // Only prepare if the recorder is not already prepared
      const status = recorder.getStatus();
      if (!status.canRecord) {
        try {
          await recorder.prepareToRecordAsync();
        } catch (prepErr: any) {
          const msg = prepErr?.message || '';
          if (!msg.includes('already been prepared') && !msg.includes('already prepared')) {
            throw prepErr;
          }
        }
      }

      // Add a small 200ms delay on Android to avoid native MediaRecorder race conditions
      await new Promise(resolve => setTimeout(resolve, 200));

      if (stopRequestedRef.current) {
        // User released the button before preparation finished
        setVoiceState('idle');
        stopPulse();
        return;
      }

      await recorder.record();
      isRecordingStartedRef.current = true;
    } catch (err) {
      console.error('Recording start error:', err);
      setVoiceState('idle');
      stopPulse();
    }
  };

  // ── Stop recording → send to backend
  const stopRecording = async () => {
    if (voiceState !== 'recording') return;
    
    stopRequestedRef.current = true;
    
    // If the recording hasn't actually started yet (still preparing),
    // let startRecording handle the cleanup and return early.
    if (!isRecordingStartedRef.current) {
      return;
    }

    stopPulse();
    setVoiceState('processing');

    try {
      await recorder.stop();
      // Add a small 200ms delay to allow the native system to finish writing and release the file lock on Android
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const uri = recorder.uri;

      if (!uri) throw new Error('No recording URI');

      // Double-check file existence and size before reading
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Recording file does not exist on disk');
      }
      if (fileInfo.size === 0) {
        throw new Error('Recording is empty');
      }

      // Read audio as base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send to backend: transcribe + run AI agent
      const response = await fetch(`${BACKEND_URL}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          userId: user?.id,
        }),
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);

      const data = await response.json();
      const { transcript, reply, action, audioBase64 } = data;

      // Show transcript
      if (transcript) addMessage('user', transcript);

      // Show AI reply
      addMessage('aurora', reply, action);

      // Play TTS audio if returned
      if (audioBase64) {
        setVoiceState('speaking');
        await playAudio(audioBase64);
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      console.error('Voice pipeline error:', err);
      addMessage('aurora', "Sorry, I had trouble processing that. Please try again.");
      Alert.alert('Voice error', msg);
    } finally {
      setVoiceState('idle');
    }
  };

  const playAudio = async (base64: string) => {
    try {
      // Write to temp file
      const tempUri = `${FileSystem.cacheDirectory}aurora_tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });

      const player = createAudioPlayer(tempUri);
      currentPlayerRef.current = player;

      player.play();

      // Wait for playback to finish
      await new Promise<void>((resolve) => {
        const subscription = player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) {
            resolve();
            subscription.remove();
          }
        });
      });

      player.release();
      currentPlayerRef.current = null;
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  // ── Mic button label/color per state
  const micConfig = {
    idle:       { label: 'Hold to speak',  color: Colors.brand.gradient as [string, string] },
    recording:  { label: 'Listening...',   color: [Colors.error, '#FF6B6B'] as [string, string] },
    processing: { label: 'Thinking...',    color: [Colors.text.tertiary, Colors.text.secondary] as [string, string] },
    speaking:   { label: 'Aurora speaking',color: Colors.brand.gradient as [string, string] },
  };

  const cfg = micConfig[voiceState];

  // Suggested prompts
  const PROMPTS = [
    "How am I doing today?",
    "I drank 500ml of water",
    "I slept 7 hours last night",
    "Create a meditation habit",
    "What should I focus on?",
  ];

  const sendTextPrompt = async (text: string) => {
    if (voiceState !== 'idle' || !user) return;
    setVoiceState('processing');
    addMessage('user', text);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId: user.id }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      addMessage('aurora', data.reply, data.action);

      if (data.audioBase64) {
        setVoiceState('speaking');
        await playAudio(data.audioBase64);
      }
    } catch (err) {
      console.error("Chat connection error:", err);
      addMessage('aurora', "Sorry, I couldn't connect. Make sure the backend is running.");
    } finally {
      setVoiceState('idle');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aurora</Text>
        <View style={styles.headerDot}>
          <View style={[styles.dot, { backgroundColor: voiceState === 'idle' ? Colors.success : Colors.brand.primary }]} />
        </View>
      </View>

      {/* Chat messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAurora]}
          >
            {msg.role === 'aurora' && (
              <Text style={styles.auroraLabel}>aurora ✦</Text>
            )}
            <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
              {msg.text}
            </Text>
            {msg.action && (
              <View style={styles.actionBadge}>
                <Text style={styles.actionText}>✓ {msg.action}</Text>
              </View>
            )}
          </View>
        ))}

        {voiceState === 'processing' && (
          <View style={[styles.bubble, styles.bubbleAurora]}>
            <Text style={styles.auroraLabel}>aurora ✦</Text>
            <ActivityIndicator color={Colors.brand.primary} size="small" />
          </View>
        )}
      </ScrollView>

      {/* Suggested prompts */}
      {voiceState === 'idle' && messages.length < 3 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptsRow}
          style={styles.prompts}
        >
          {PROMPTS.map(p => (
            <TouchableOpacity key={p} style={styles.promptChip} onPress={() => sendTextPrompt(p)}>
              <Text style={styles.promptText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Mic button */}
      <View style={styles.micContainer}>
        <Text style={styles.micHint}>{cfg.label}</Text>

        <Animated.View style={[styles.micRing, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={styles.micBtn}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={voiceState === 'processing' || voiceState === 'speaking'}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={cfg.color}
              style={styles.micGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {voiceState === 'processing' ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Text style={styles.micIcon}>
                  {voiceState === 'recording' ? '●' : '🎙'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 56,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.border,
  },
  backBtn: { padding: Spacing.sm },
  backText: { color: Colors.text.secondary, fontSize: Typography.size.lg },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, letterSpacing: 2 },
  headerDot: { padding: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },

  messages: { flex: 1 },
  messagesContent: { padding: Spacing.xl, gap: Spacing.base, paddingBottom: Spacing.xxl },

  bubble: {
    maxWidth: '85%',
    borderRadius: Radius.xl,
    padding: Spacing.base,
  },
  bubbleAurora: {
    backgroundColor: Colors.bg.secondary,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.bg.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: Colors.brand.soft,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: `${Colors.brand.primary}40`,
    borderBottomRightRadius: 4,
  },
  auroraLabel: {
    fontSize: Typography.size.xs,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  bubbleText: { color: Colors.text.primary, fontSize: Typography.size.base, lineHeight: 22 },
  bubbleTextUser: { color: Colors.text.primary },

  actionBadge: {
    backgroundColor: `${Colors.success}20`,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  actionText: { color: Colors.success, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },

  prompts: { maxHeight: 48 },
  promptsRow: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.sm },
  promptChip: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  promptText: { color: Colors.text.secondary, fontSize: Typography.size.sm },

  micContainer: { alignItems: 'center', paddingVertical: Spacing.xxxl, paddingBottom: 48 },
  micHint: { color: Colors.text.tertiary, fontSize: Typography.size.sm, marginBottom: Spacing.xl },
  micRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${Colors.brand.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden' },
  micGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 32 },
});
