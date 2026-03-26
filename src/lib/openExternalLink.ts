import * as Linking from "expo-linking";

function normalizeExternalUrl(url?: string | null): string {
  const value = String(url ?? "").trim();
  if (!value) {
    throw new Error("This link is not available yet.");
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (/^(www\.)/i.test(value)) return `https://${value}`;
  throw new Error("This link is not valid yet.");
}

export async function openExternalLink(url?: string | null): Promise<void> {
  const normalized = normalizeExternalUrl(url);
  const canOpen = await Linking.canOpenURL(normalized);
  if (!canOpen) throw new Error("Cannot open this link on this device.");
  await Linking.openURL(normalized);
}

export async function openManageSubscriptions(url?: string | null): Promise<void> {
  await openExternalLink(url);
}
