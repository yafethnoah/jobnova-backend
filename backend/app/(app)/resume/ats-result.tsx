import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { SectionedScreen } from "@/src/components/layout/SectionedScreen";
import { colors } from "@/src/constants/colors";

const sections = [
  {
    key: "overview",
    label: "Overview",
    content: (
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 42, fontWeight: "800", color: "#0F172A" }}>82</Text>
        <Text style={{ color: "#475569", lineHeight: 22 }}>
          Strong alignment with the role. The fastest score gains come from payroll, benefits administration, and clearer evidence of HRIS ownership.
        </Text>
      </View>
    )
  },
  {
    key: "keywords",
    label: "Keywords",
    content: <Text style={{ color: "#334155", lineHeight: 22 }}>Matched: onboarding, recruitment, employee relations, HRIS.</Text>
  },
  {
    key: "gaps",
    label: "Gaps",
    content: <Text style={{ color: "#334155", lineHeight: 22 }}>Missing: payroll support, benefits administration, policy compliance.</Text>
  },
  {
    key: "risks",
    label: "Risks",
    content: <Text style={{ color: "#334155", lineHeight: 22 }}>Formatting risk: table-based skills block may parse inconsistently in older ATS systems.</Text>
  },
  {
    key: "rewrite",
    label: "Rewrite",
    content: <Text style={{ color: "#334155", lineHeight: 22 }}>Recommended rewrite: “Maintained HRIS employee records and coordinated onboarding while supporting compliance workflows and internal documentation accuracy.”</Text>
  },
  {
    key: "export",
    label: "Export",
    content: <Text style={{ color: "#334155", lineHeight: 22 }}>Generate a recruiter-ready DOCX, PDF, and recruiter email package from this tailored version.</Text>
  }
];

export default function AtsResultScreen() {
  return (
    <SectionedScreen
      title="ATS result"
      subtitle="Transparent scoring, not magical résumé astrology."
      summary={
        <View style={{ backgroundColor: colors.surfaceElevated, borderRadius: 20, padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>Role fit summary</Text>
          <Text style={{ marginTop: 8, color: "#334155", lineHeight: 22 }}>
            Best fit for HR Coordinator and People Operations roles with a light gap on payroll-heavy postings.
          </Text>
        </View>
      }
      sections={sections}
      stickyAction={<AppButton label="Generate tailored package" onPress={() => {}} />}
    />
  );
}