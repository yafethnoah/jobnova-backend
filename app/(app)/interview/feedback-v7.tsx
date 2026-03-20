import { Text } from "react-native";
import { SectionedScreen } from "@/src/components/layout/SectionedScreen";
import { AppButton } from "@/src/components/ui/AppButton";

export default function InterviewFeedbackV7Screen() {
  return (
    <SectionedScreen
      title="Interview feedback"
      subtitle="Voice session summary with role-specific coaching."
      sections={[
        { key: "overview", label: "Overview", content: <Text style={{ color: "#334155", lineHeight: 22 }}>Overall score 79. Strong clarity, moderate structure drift, and solid relevance.</Text> },
        { key: "clarity", label: "Clarity", content: <Text style={{ color: "#334155", lineHeight: 22 }}>You speak clearly, but some answers start too wide before landing on the example.</Text> },
        { key: "structure", label: "Structure", content: <Text style={{ color: "#334155", lineHeight: 22 }}>Use tighter STAR framing: situation in one line, task in one, action in two, result in one.</Text> },
        { key: "relevance", label: "Relevance", content: <Text style={{ color: "#334155", lineHeight: 22 }}>Good link to HR coordination. Add more evidence around stakeholder communication.</Text> },
        { key: "improve", label: "Improve", content: <Text style={{ color: "#334155", lineHeight: 22 }}>Suggested improved answer is ready for the next rehearsal pass.</Text> }
      ]}
      stickyAction={<AppButton label="Practice next question" onPress={() => {}} />}
    />
  );
}
