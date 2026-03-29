import { router } from "expo-router";
import { Text, View } from "react-native";

import { useProfile } from "@/src/hooks/useProfile";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { StatusChip } from "@/src/components/ui/StatusChip";
import { colors } from "@/src/constants/colors";

function MetricPanel({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 148,
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "rgba(14, 24, 48, 0.58)",
        gap: 6,
      }}
    >
      <Text style={{ color: colors.subtle, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.7 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: colors.muted, lineHeight: 18 }}>{detail}</Text>
    </View>
  );
}

function QuickAction({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(175,192,255,0.12)",
        backgroundColor: "rgba(12, 20, 38, 0.56)",
        padding: 14,
        gap: 10,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: colors.muted, lineHeight: 21 }}>{detail}</Text>
      <AppButton label="Open" variant="secondary" onPress={onPress} />
    </View>
  );
}

export default function HomeScreen() {
  const { data, isLoading } = useProfile();
  const firstName = data?.fullName?.split(" ")[0]?.trim() || "there";

  return (
    <AppScreen>
      <View
        style={{
          borderRadius: 28,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
          backgroundColor: "rgba(10, 18, 34, 0.58)",
          padding: 18,
          gap: 18,
          overflow: "hidden",
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -40,
            right: -20,
            width: 180,
            height: 160,
            borderRadius: 999,
            backgroundColor: "rgba(111, 134, 255, 0.18)",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: -50,
            left: -24,
            width: 180,
            height: 120,
            borderRadius: 999,
            backgroundColor: "rgba(56, 189, 248, 0.09)",
          }}
        />
        <StatusChip label="AI career operating system" tone="primary" />
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 34, fontWeight: "900", lineHeight: 40 }}>
            JobNova
          </Text>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", lineHeight: 30 }}>
            {isLoading ? "Loading your cockpit..." : `Welcome back, ${firstName}.`}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }}>
            A 3D glass-style command center for your resume, interviews, tracking, networking, and job-ready exports — designed to feel premium and recruiter-focused.
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <StatusChip label={data?.targetRole || "Target role not set"} tone={data?.targetRole ? "success" : "warning"} />
          <StatusChip label={data?.location || "Location not set"} tone="neutral" />
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <MetricPanel label="Resume Match" value="ATS ready" detail="Tailor once today to raise keyword alignment." />
          <MetricPanel label="Interview" value="Live coach" detail="Voice-first recruiter simulation is ready." />
          <MetricPanel label="Tracker" value="Follow-ups" detail="Keep applications, reminders, and notes aligned." />
        </View>
        <View style={{ gap: 10 }}>
          <AppButton label="Start live recruiter interview" onPress={() => router.push('/(app)/interview/live-lobby')} />
          <AppButton label="Open Resume Match Lab" variant="secondary" onPress={() => router.push('/(app)/resume')} />
        </View>
      </View>

      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>Today’s smart mission</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>
            Move like a recruiter would expect: tailor one resume, practice one question, and close one application follow-up.
          </Text>
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.text }}>• Run ATS check against a real job link</Text>
            <Text style={{ color: colors.text }}>• Complete one recruiter-style interview round</Text>
            <Text style={{ color: colors.text }}>• Send one application follow-up from the tracker</Text>
          </View>
        </View>
      </AppCard>

      <View style={{ gap: 12 }}>
        <QuickAction
          title="Career Path"
          detail="See realistic routes, bridge options, and next steps based on your profile."
          onPress={() => router.push('/(app)/career-path')}
        />
        <QuickAction
          title="Job-ready Package"
          detail="Generate tailored resume, cover letter, recruiter email, and export files from one flow."
          onPress={() => router.push('/(app)/resume/job-ready')}
        />
        <QuickAction
          title="Applications Tracker"
          detail="Keep each job, status, note, and follow-up organized like a lightweight CRM."
          onPress={() => router.push('/(app)/tracker')}
        />
      </View>
    </AppScreen>
  );
}
