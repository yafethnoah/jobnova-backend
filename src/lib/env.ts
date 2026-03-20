import Constants from 'expo-constants';

type ExtraConfig = {
  apiBaseUrl?: string;
  useMockApi?: string | boolean;
  environment?: string;
  appName?: string;
  bundleId?: string;
  subscriptionProvider?: string;
  subscriptionGroupName?: string;
  subscriptionManageUrl?: string;
  subscriptionPriceWeekly?: string;
  subscriptionPriceMonthly?: string;
  subscriptionPriceAnnual?: string;
  enableAds?: string | boolean;
  enableBilling?: string | boolean;
  appleWeeklyProductId?: string;
  appleMonthlyProductId?: string;
  appleAnnualProductId?: string;
};

const extra = ((Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as ExtraConfig) || {};
function readEnv(key: string, fallback = ''): string {
  const direct = process.env[key]; if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const map: Record<string, unknown> = {
    EXPO_PUBLIC_API_BASE_URL: extra.apiBaseUrl,
    EXPO_PUBLIC_USE_MOCK_API: extra.useMockApi,
    EXPO_PUBLIC_APP_ENV: extra.environment,
    EXPO_PUBLIC_APP_NAME: extra.appName,
    EXPO_PUBLIC_BUNDLE_ID: extra.bundleId,
    EXPO_PUBLIC_SUBSCRIPTION_PROVIDER: extra.subscriptionProvider,
    EXPO_PUBLIC_SUBSCRIPTION_GROUP_NAME: extra.subscriptionGroupName,
    EXPO_PUBLIC_SUBSCRIPTION_MANAGE_URL: extra.subscriptionManageUrl,
    EXPO_PUBLIC_SUBSCRIPTION_PRICE_WEEKLY: extra.subscriptionPriceWeekly,
    EXPO_PUBLIC_SUBSCRIPTION_PRICE_MONTHLY: extra.subscriptionPriceMonthly,
    EXPO_PUBLIC_SUBSCRIPTION_PRICE_ANNUAL: extra.subscriptionPriceAnnual,
    EXPO_PUBLIC_ENABLE_ADS: extra.enableAds,
    EXPO_PUBLIC_ENABLE_BILLING: extra.enableBilling,
    EXPO_PUBLIC_APPLE_WEEKLY_PRODUCT_ID: extra.appleWeeklyProductId,
    EXPO_PUBLIC_APPLE_MONTHLY_PRODUCT_ID: extra.appleMonthlyProductId,
    EXPO_PUBLIC_APPLE_ANNUAL_PRODUCT_ID: extra.appleAnnualProductId
  };
  const value = map[key]; if (typeof value === 'string' && value.trim()) return value.trim(); if (typeof value === 'boolean') return String(value); return fallback;
}
const normalizeBaseUrl = (value?: string) => String(value ?? '').trim().replace(/\/+$/, '');
function readBoolean(key: string, fallback: boolean): boolean { const value = readEnv(key, String(fallback)).toLowerCase(); if (['true','1','yes','on'].includes(value)) return true; if (['false','0','no','off'].includes(value)) return false; return fallback; }
const useMockApi = readBoolean('EXPO_PUBLIC_USE_MOCK_API', false);
const apiBaseUrl = normalizeBaseUrl(readEnv('EXPO_PUBLIC_API_BASE_URL'));
export const env = {
  apiBaseUrl, useMockApi,
  appEnv: readEnv('EXPO_PUBLIC_APP_ENV', 'development'),
  appName: readEnv('EXPO_PUBLIC_APP_NAME', 'JobNova'),
  bundleId: readEnv('EXPO_PUBLIC_BUNDLE_ID', 'com.jobnova.app'),
  subscriptionProvider: readEnv('EXPO_PUBLIC_SUBSCRIPTION_PROVIDER', 'apple-direct'),
  subscriptionGroupName: readEnv('EXPO_PUBLIC_SUBSCRIPTION_GROUP_NAME', 'JobNova Pro'),
  subscriptionManageUrl: readEnv('EXPO_PUBLIC_SUBSCRIPTION_MANAGE_URL', ''),
  subscriptionPriceWeekly: readEnv('EXPO_PUBLIC_SUBSCRIPTION_PRICE_WEEKLY', '$1.99/week'),
  subscriptionPriceMonthly: readEnv('EXPO_PUBLIC_SUBSCRIPTION_PRICE_MONTHLY', '$9.99/month'),
  subscriptionPriceAnnual: readEnv('EXPO_PUBLIC_SUBSCRIPTION_PRICE_ANNUAL', '$59.99/year'),
  adsEnabled: readBoolean('EXPO_PUBLIC_ENABLE_ADS', false),
  billingEnabled: readBoolean('EXPO_PUBLIC_ENABLE_BILLING', false),
  appleWeeklyProductId: readEnv('EXPO_PUBLIC_APPLE_WEEKLY_PRODUCT_ID', ''),
  appleMonthlyProductId: readEnv('EXPO_PUBLIC_APPLE_MONTHLY_PRODUCT_ID', ''),
  appleAnnualProductId: readEnv('EXPO_PUBLIC_APPLE_ANNUAL_PRODUCT_ID', '')
};
export function assertRuntimeEnv(): void {
  if (!useMockApi && !apiBaseUrl) throw new Error('Live API mode is enabled but EXPO_PUBLIC_API_BASE_URL is missing.');
  if (env.billingEnabled) {
    const missing = [env.appleWeeklyProductId ? null : 'EXPO_PUBLIC_APPLE_WEEKLY_PRODUCT_ID', env.appleMonthlyProductId ? null : 'EXPO_PUBLIC_APPLE_MONTHLY_PRODUCT_ID', env.appleAnnualProductId ? null : 'EXPO_PUBLIC_APPLE_ANNUAL_PRODUCT_ID'].filter(Boolean);
    if (missing.length) throw new Error(`Billing is enabled but product IDs are missing: ${missing.join(', ')}`);
  }
}
