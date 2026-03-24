import { View } from "react-native";
import { useKeyboardInsets } from "@/src/hooks/useKeyboardInsets";

export function KeyboardSpacer() {
  const { bottomInset, keyboardHeight } = useKeyboardInsets();
  return <View style={{ height: Math.max(bottomInset, keyboardHeight ? 12 : 24) }} />;
}
