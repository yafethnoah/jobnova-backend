import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { optionalAuthApiRequest } from "@/src/api/client";

type RecruiterVoice = "verse" | "alloy" | "nova";
type PlaybackMode = "auto" | "manual" | "muted";

type VoiceOption = {
  key: RecruiterVoice;
  label: string;
  description: string;
};

type PlaybackOption = {
  key: PlaybackMode;
  label: string;
  description: string;
};

const VOICE_OPTIONS: VoiceOption[] = [
  { key: "verse", label: "Verse", description: "Balanced and natural." },
  { key: "alloy", label: "Alloy", description: "Clear and steady." },
  { key: "nova", label: "Nova", description: "Warm and polished." },
];

const PLAYBACK_OPTIONS: PlaybackOption[] = [
  { key: "auto", label: "Auto", description: "Play recruiter voice when ready." },
  { key: "manual", label: "Manual", description: "Tap to play each prompt." },
  { key: "muted", label: "Muted", description: "Text-only recruiter prompts." },
];

export default function LiveSessionScreen() {
  const [selectedVoice, setSelectedVoice] = useState<RecruiterVoice>("verse");
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("auto");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encouragement = useMemo(
    () =>
      "Every practice round sharpens your story. Confidence grows when preparation becomes a habit.",
    []
  );

  const handleStartInterview = async () => {
    try {
      setStarting(true);
      setError(null);

      const payload = await optionalAuthApiRequest("/interview/start", "POST", {
        voice: selectedVoice,
        playbackMode,
      });

      if (payload?.error === "unauthorized") {
        Alert.alert("Session expired", "Please sign in again.");
        router.replace("/auth");
        return;
      }

      router.push({
        pathname: "/(app)/interview/session",
        params: {
          voice: selectedVoice,
          playbackMode,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start live interview.";
      console.error("[INTERVIEW] start failed:", err);
      setError(message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recruiter voice</Text>

        <View style={styles.optionGrid}>
          {VOICE_OPTIONS.map((option) => {
            const active = selectedVoice === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => setSelectedVoice(option.key)}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    active && styles.optionDescriptionActive,
                  ]}
                >
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Playback mode</Text>

        <View style={styles.optionGrid}>
          {PLAYBACK_OPTIONS.map((option) => {
            const active = playbackMode === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => setPlaybackMode(option.key)}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    active && styles.optionDescriptionActive,
                  ]}
                >
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.errorTitle}>Could not start live interview</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.encouragementTitle}>Daily Encouragement</Text>
        <Text style={styles.encouragementText}>{encouragement}</Text>

        <Pressable
          style={[styles.primaryButton, starting && styles.primaryButtonDisabled]}
          onPress={handleStartInterview}
          disabled={starting}
        >
          <Text style={styles.primaryButtonText}>
            {starting ? "Starting..." : "Start live interview"}
          </Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#081120",
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: "#0E1A33",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1D2D57",
  },
  sectionTitle: {
    color: "#EAF0FF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionSpacing: {
    marginTop: 8,
  },
  optionGrid: {
    gap: 10,
  },
  optionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#223664",
    backgroundColor: "#132243",
    padding: 12,
  },
  optionCardActive: {
    backgroundColor: "#7785FF",
    borderColor: "#93A0FF",
  },
  optionTitle: {
    color: "#F3F6FF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  optionTitleActive: {
    color: "#FFFFFF",
  },
  optionDescription: {
    color: "#AEBBDF",
    fontSize: 13,
    lineHeight: 18,
  },
  optionDescriptionActive: {
    color: "#EEF1FF",
  },
  errorCard: {
    borderColor: "#5B2940",
    backgroundColor: "#101B36",
  },
  errorTitle: {
    color: "#FF8F8F",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  errorText: {
    color: "#D9E2FF",
    fontSize: 14,
    lineHeight: 20,
  },
  encouragementTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  encouragementText: {
    color: "#B9C4E7",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#7C88FF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#16284C",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#E7ECFF",
    fontSize: 15,
    fontWeight: "700",
  },
});