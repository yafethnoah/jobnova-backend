import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/src/components/layout/ScreenHeader";
import { StickyActionBar } from "@/src/components/layout/StickyActionBar";
import { colors } from "@/src/constants/colors";

export type AppScreenProps = {
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  stickyFooter?: ReactNode;
  children: ReactNode;
};

export function AppScreen({ title, subtitle, scroll = true, stickyFooter, children }: AppScreenProps) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <ScreenHeader title={title} subtitle={subtitle} />
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: 20, gap: 16 }}>
      <ScreenHeader title={title} subtitle={subtitle} />
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        {body}
        {stickyFooter ? <StickyActionBar>{stickyFooter}</StickyActionBar> : null}
      </View>
    </SafeAreaView>
  );
}