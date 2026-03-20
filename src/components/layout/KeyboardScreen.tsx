import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
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