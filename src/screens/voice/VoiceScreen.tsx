import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  useAudioPlayer,
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from "expo-audio";
import { useAuthStore } from "../../store";
import { Colors, Typography, Spacing, Radius } from "../../constants/theme";
import { Mic, Square, X } from "lucide-react-native";

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface Message {
  id: string;
  role: "user" | "aurora";
  text: string;
  timestamp: Date;
  action?: string;
}

type VoiceState = "idle" | "recording" | "processing" | "speaking";

export default function VoiceScreen({
  navigation,
}: {
  navigation: { canGoBack: () => boolean; goBack: () => void; navigate: (screen: string) => void };
}) {
  const { user } = useAuthStore();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [audioReady, setAudioReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "aurora",
      text: "Hi! I'm Aurora. Hold the button and talk to me about your health.",
      timestamp: new Date(),
    },
  ]);

  const scrollRef = useRef<ScrollView>(null);
  const audioSessionRef = useRef<boolean>(false);
  const player = useAudioPlayer();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Initialize audio on mount
  useEffect(() => {
    (async () => {
      try {
        console.log("[Audio] Initializing audio session...");

        // Request permissions
        const status = await AudioModule.requestRecordingPermissionsAsync();
        console.log(
          "[Audio] Microphone permission:",
          status.status,
          "granted:",
          status.granted,
        );

        if (!status.granted) {
          Alert.alert(
            "Microphone permission required",
            "Please allow microphone access in settings.",
          );
          return;
        }

        // Set audio mode
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });

        audioSessionRef.current = true;
        setAudioReady(true);
        console.log("[Audio] Audio session ready");
      } catch (err) {
        console.error("[Audio] Setup error:", err);
        Alert.alert(
          "Audio Error",
          `Failed to initialize audio: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    })();

    return () => {
      player.pause();
    };
  }, []);

  const addMessage = useCallback(
    (role: "user" | "aurora", text: string, action?: string) => {
      const msg: Message = {
        id: Date.now().toString(),
        role,
        text,
        action,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return msg;
    },
    [],
  );

  const closeVoiceScreen = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Main");
  };

  const startRecording = async () => {
    if (voiceState !== "idle" || !audioSessionRef.current) {
      console.log(
        "[Voice] Cannot start recording. State:",
        voiceState,
        "Session ready:",
        audioSessionRef.current,
      );
      return;
    }

    try {
      console.log("[Voice] Starting recording...");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setVoiceState("recording");
      startPulse();

      console.log("[Voice] Preparing recording...");
      await audioRecorder.prepareToRecordAsync({
        ...RecordingPresets.HIGH_QUALITY,
        directory: "document",
      });

      console.log("[Voice] Starting recording...");
      audioRecorder.record();

      console.log("[Voice] Recording started successfully");
    } catch (err) {
      console.error("[Voice] Recording start error:", err);
      Alert.alert(
        "Recording Error",
        err instanceof Error ? err.message : String(err),
      );
      setVoiceState("idle");
      stopPulse();
    }
  };

  const stopRecording = async () => {
    if (voiceState !== "recording") {
      console.log("[Voice] Cannot stop recording. State:", voiceState);
      return;
    }

    stopPulse();
    setVoiceState("processing");

    try {
      console.log("[Voice] Stopping recording...");
      await audioRecorder.stop();
      // Add a small delay to allow native system to finish writing and release the file lock on Android
      await new Promise((resolve) => setTimeout(resolve, 300));
      const uri = audioRecorder.uri;
      console.log("[Voice] Recording URI:", uri);

      if (!uri) throw new Error("No recording URI");

      // Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log("[Voice] File info:", fileInfo);

      if (!fileInfo.exists) {
        throw new Error("Recording file does not exist");
      }

      // Read as base64
      console.log("[Voice] Reading file as base64...");
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log("[Voice] Base64 audio ready, length:", base64Audio.length);

      // Send to backend
      console.log("[Voice] Sending to backend...");
      const response = await fetch(`${BACKEND_URL}/api/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          userId: user?.id,
        }),
      });

      console.log("[Voice] Backend response status:", response.status);
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);

      const data = await response.json();
      console.log("[Voice] Backend response:", data);

      const { transcript, reply, action, audioBase64 } = data;

      if (transcript) addMessage("user", transcript);
      addMessage("aurora", reply, action);

      if (audioBase64) {
        console.log("[Voice] Playing audio response...");
        setVoiceState("speaking");
        await playAudio(audioBase64);
      }

      // Cleanup
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log("[Voice] Recording file cleaned up");
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Voice] Pipeline error:", err);
      addMessage(
        "aurora",
        "Sorry, I had trouble processing that. Please try again.",
      );
      Alert.alert("Voice error", msg);
    } finally {
      setVoiceState("idle");
    }
  };

  const playAudio = async (base64: string) => {
    try {
      const tempUri = `${FileSystem.cacheDirectory}aurora_tts_${Date.now()}.mp3`;
      console.log("[Audio] Writing TTS to:", tempUri);

      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("[Audio] Loading sound...");
      player.replace({ uri: tempUri });

      console.log("[Audio] Playing sound...");
      player.play();

      // Wait for playback to finish
      await new Promise<void>((resolve) => {
        const subscription = player.addListener(
          "playbackStatusUpdate",
          (status) => {
            if (status.didJustFinish) {
              subscription.remove();
              resolve();
            }
          },
        );
      });

      console.log("[Audio] Playback finished, unloading...");
      player.replace(null);

      try {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
        console.log("[Audio] TTS file cleaned up");
      } catch {}
    } catch (err) {
      console.error("[Audio] Playback error:", err);
    } finally {
      setVoiceState("idle");
    }
  };

  const micConfig = {
    idle: {
      label: "Hold to speak",
      color: Colors.brand.gradient as [string, string],
    },
    recording: {
      label: "Listening...",
      color: [Colors.error, "#FF6B6B"] as [string, string],
    },
    processing: {
      label: "Thinking...",
      color: [Colors.text.tertiary, Colors.text.secondary] as [string, string],
    },
    speaking: {
      label: "Aurora speaking",
      color: Colors.brand.gradient as [string, string],
    },
  };

  const cfg = micConfig[voiceState];

  const PROMPTS = [
    "How am I doing today?",
    "I drank 500ml of water",
    "I slept 7 hours last night",
    "Create a meditation habit",
    "What should I focus on?",
  ];

  const sendTextPrompt = async (text: string) => {
    if (voiceState !== "idle" || !user) return;
    setVoiceState("processing");
    addMessage("user", text);
    console.log("[Chat] URL:", `${BACKEND_URL}/api/chat`);
    try {
      console.log("[Chat] Sending:", text);
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, userId: user.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Chat] Backend error:", response.status, errorText);
        throw new Error(`Backend error: ${response.status}`);
      }
      const data = await response.json();
      console.log("[Chat] Response:", data);

      addMessage("aurora", data.reply, data.action);

      if (data.audioBase64) {
        setVoiceState("speaking");
        await playAudio(data.audioBase64);
      }
    } catch (err) {
      console.error("[Chat] Error:", err);
      addMessage(
        "aurora",
        "Sorry, I couldn't connect. Make sure the backend is running.",
      );
    } finally {
      setVoiceState("idle");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={closeVoiceScreen}
          style={styles.backBtn}
        >
          <X size={24} color={Colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aurora</Text>
        <View style={styles.headerDot}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  voiceState === "idle" ? Colors.success : Colors.brand.primary,
              },
            ]}
          />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubble,
              msg.role === "user" ? styles.bubbleUser : styles.bubbleAurora,
            ]}
          >
            {msg.role === "aurora" && (
              <Text style={styles.auroraLabel}>aurora ✦</Text>
            )}
            <Text
              style={[
                styles.bubbleText,
                msg.role === "user" && styles.bubbleTextUser,
              ]}
            >
              {msg.text}
            </Text>
            {msg.action && (
              <View style={styles.actionBadge}>
                <Text style={styles.actionText}>✓ {msg.action}</Text>
              </View>
            )}
          </View>
        ))}

        {voiceState === "processing" && (
          <View style={[styles.bubble, styles.bubbleAurora]}>
            <Text style={styles.auroraLabel}>aurora ✦</Text>
            <ActivityIndicator color={Colors.brand.primary} size="small" />
          </View>
        )}
      </ScrollView>

      {voiceState === "idle" && messages.length < 3 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptsRow}
          style={styles.prompts}
        >
          {PROMPTS.map((p) => (
            <TouchableOpacity
              key={p}
              style={styles.promptChip}
              onPress={() => sendTextPrompt(p)}
            >
              <Text style={styles.promptText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.micContainer}>
        <Text style={styles.micHint}>{cfg.label}</Text>

        <Animated.View
          style={[styles.micRing, { transform: [{ scale: pulseAnim }] }]}
        >
          <TouchableOpacity
            style={styles.micBtn}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={
              voiceState === "processing" || voiceState === "speaking" || !audioReady
            }
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={cfg.color}
              style={styles.micGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {voiceState === "processing" ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : voiceState === "recording" ? (
                <Square size={24} color={Colors.white} fill={Colors.white} />
              ) : (
                <Mic size={28} color={Colors.white} />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: 56,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.border,
  },
  backBtn: { padding: Spacing.sm },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  headerDot: { padding: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  messages: { flex: 1 },
  messagesContent: {
    padding: Spacing.xl,
    gap: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: Radius.xl,
    padding: Spacing.base,
  },
  bubbleAurora: {
    backgroundColor: Colors.bg.secondary,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.bg.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: Colors.brand.soft,
    alignSelf: "flex-end",
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
  bubbleText: {
    color: Colors.text.primary,
    fontSize: Typography.size.base,
    lineHeight: 22,
  },
  bubbleTextUser: { color: Colors.text.primary },
  actionBadge: {
    backgroundColor: `${Colors.success}20`,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
  },
  actionText: {
    color: Colors.success,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  prompts: { maxHeight: 48 },
  promptsRow: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  promptChip: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  promptText: { color: Colors.text.secondary, fontSize: Typography.size.sm },
  micContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
    paddingBottom: 48,
  },
  micHint: {
    color: Colors.text.tertiary,
    fontSize: Typography.size.sm,
    marginBottom: Spacing.xl,
  },
  micRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${Colors.brand.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtn: { width: 80, height: 80, borderRadius: 40, overflow: "hidden" },
  micGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});
