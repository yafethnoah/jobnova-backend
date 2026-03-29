import React from "react";
import { ScrollView, View, ViewStyle, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/constants/colors";
import { DailyEncouragement } from "@/src/components/ui/DailyEncouragement";

type AppScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
  showEncouragement?: boolean;
};

function BackgroundDecor() {
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -80,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: 999,
          backgroundColor: "rgba(111, 134, 255, 0.16)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 160,
          left: -100,
          width: 260,
          height: 260,
          borderRadius: 999,
          backgroundColor: "rgba(56, 189, 248, 0.08)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 120,
          right: -120,
          width: 280,
          height: 280,
          borderRadius: 999,
          backgroundColor: "rgba(139, 92, 246, 0.08)",
        }}
      />
    </>
  );
}

export function AppScreen({ children, scroll = true, contentContainerStyle, showEncouragement = true }: AppScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const horizontalPadding = width >= 900 ? 32 : width >= 600 ? 28 : 20;
  const topPadding = width >= 600 ? 28 : 20;
  const bottomPadding = Math.max(120, insets.bottom + 112);

  const baseContent = (
    <>
      {showEncouragement ? <DailyEncouragement /> : null}
      {children}
    </>
  );

  if (scroll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <BackgroundDecor />
          <ScrollView
            contentContainerStyle={[
              { paddingHorizontal: horizontalPadding, paddingTop: topPadding, gap: 16, paddingBottom: bottomPadding },
              contentContainerStyle
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {baseContent}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <BackgroundDecor />
        <View style={[{ flex: 1, paddingHorizontal: horizontalPadding, paddingTop: topPadding, gap: 16, paddingBottom: bottomPadding }, contentContainerStyle]}>
          {baseContent}
        </View>
      </View>
    </SafeAreaView>
  );
}
