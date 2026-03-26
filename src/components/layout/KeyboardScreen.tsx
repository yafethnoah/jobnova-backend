import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/src/components/layout/ScreenHeader";
import { StickyActionBar } from "@/src/components/layout/StickyActionBar";
import { KeyboardSpacer } from "@/src/components/layout/KeyboardSpacer";
import { colors } from "@/src/constants/colors";

export type KeyboardScreenProps = {
  title?: string;
  subtitle?: string;
  stickyAction?: ReactNode;
  children: ReactNode;
};

export function KeyboardScreen({ title, subtitle, stickyAction, children }: KeyboardScreenProps) {
  const insets = useSafeAreaInsets();
  const contentBottom = Math.max(120, insets.bottom + 112);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: contentBottom, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <ScreenHeader title={title} subtitle={subtitle} />
            {children}
            <KeyboardSpacer />
          </ScrollView>
          {stickyAction ? <StickyActionBar>{stickyAction}</StickyActionBar> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
