import { Pressable, Text, View } from "react-native";
import { ListScreen } from "@/src/components/layout/ListScreen";
import { colors } from "@/src/constants/colors";

const items = [
  { id: "1", company: "Sheridan College", role: "HR Coordinator", status: "applied", followUpAt: "Tomorrow" },
  { id: "2", company: "Access Employment", role: "Program Officer", status: "interview", followUpAt: "March 20" },
  { id: "3", company: "Scotiabank", role: "Talent Advisor", status: "saved", followUpAt: "Not scheduled" }
];

const filters = ["All", "Saved", "Applied", "Interview", "Offer", "Rejected"];

export default function ApplicationsV7Screen() {
  return (
    <ListScreen
      title="Applications"
      subtitle="A calmer tracker with linked resume versions and follow-up timing."
      data={items}
      keyExtractor={(item) => item.id}
      filters={
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {filters.map((filter) => (
            <View key={filter} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceElevated }}>
              <Text style={{ fontWeight: "700", color: "#0F172A" }}>{filter}</Text>
            </View>
          ))}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 12
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>{item.role}</Text>
          <Text style={{ marginTop: 6, color: "#475569" }}>{item.company}</Text>
          <Text style={{ marginTop: 8, color: "#334155" }}>Status: {item.status}</Text>
          <Text style={{ marginTop: 4, color: "#334155" }}>Follow-up: {item.followUpAt}</Text>
        </Pressable>
      )}
      emptyState={<Text style={{ color: "#475569" }}>No applications yet.</Text>}
    />
  );
}