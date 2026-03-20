import * as Linking from "expo-linking";
export async function openExternalLink(url: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) throw new Error("Cannot open this link.");
  await Linking.openURL(url);
}

export async function openManageSubscriptions(url: string): Promise<void> {
  await openExternalLink(url);
}
