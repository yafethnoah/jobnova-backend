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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={[{ flex: 1, paddingHorizontal: horizontalPadding, paddingTop: topPadding, gap: 16, paddingBottom: bottomPadding }, contentContainerStyle]}>
        {baseContent}
      </View>
    </SafeAreaView>
  );
}
