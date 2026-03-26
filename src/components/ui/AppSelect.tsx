import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "@/src/constants/colors";
import { radii } from "@/src/constants/radii";

type Option = { label: string; value: string };

type AppSelectProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
};

export function AppSelect({ label, value, options, onChange, placeholder = "Select an option", error }: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(() => options.find((option) => option.value === value)?.label || "", [options, value]);

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.muted }}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          paddingHorizontal: 14,
          paddingVertical: 14,
          minHeight: 54,
          justifyContent: "center",
          opacity: pressed ? 0.96 : 1
        })}
      >
        <Text style={{ color: selectedLabel ? colors.text : colors.subtle, fontSize: 16 }}>
          {selectedLabel || placeholder}
        </Text>
      </Pressable>
      {error ? <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(2,6,23,0.7)", justifyContent: "center", padding: 20 }}>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              maxHeight: "70%"
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{label}</Text>
            <ScrollView style={{ marginTop: 14 }} contentContainerStyle={{ gap: 10 }}>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : pressed ? colors.surfaceElevated : colors.bgSoft,
                      opacity: pressed ? 0.95 : 1
                    })}
                  >
                    <Text style={{ color: selected ? colors.primaryText : colors.text, fontSize: 15, fontWeight: selected ? "800" : "600" }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
