import { Text, View } from "react-native";
import { KeyboardScreen } from "@/src/components/layout/KeyboardScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { colors } from "@/src/constants/colors";

export default function ExportCenterV7Screen() {
  return (
    <KeyboardScreen
      title="Export center"
      subtitle="Recruiter-grade themes, ATS-safe layouts, and a calmer final review."
      stickyAction={<AppButton label="Generate DOCX + PDF" onPress={() => {}} />}
    >
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>Theme</Text>
        <Text style={{ marginTop: 8, color: "#475569" }}>Classic Canadian professional</Text>
      </AppCard>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>Layout</Text>
        <Text style={{ marginTop: 8, color: "#475569" }}>True two-page ATS layout</Text>
      </AppCard>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>Files</Text>
        <Text style={{ marginTop: 8, color: "#475569" }}>DOCX, PDF, and recruiter email draft package</Text>
      </AppCard>
      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>Preview behavior</Text>
        <Text style={{ marginTop: 8, color: "#475569", lineHeight: 22 }}>
          The export engine stores canonical resume content first, then renders theme-specific DOCX and PDF outputs to keep layouts consistent and ATS-safe.
        </Text>
      </View>
    </KeyboardScreen>
  );
}