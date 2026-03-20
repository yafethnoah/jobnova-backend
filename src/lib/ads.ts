import { env } from '@/src/lib/env';

export async function initializeAds(): Promise<void> {
  if (!env.adsEnabled) return;
  return;
}
