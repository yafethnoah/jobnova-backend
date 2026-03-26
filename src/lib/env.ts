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

function directEnvValue(key: string): string | undefined {
  switch (key) {
    case 'EXPO_PUBLIC_API_BASE_URL':
      return process.env.EXPO_PUBLIC_API_BASE_URL;
    case 'EXPO_PUBLIC_USE_MOCK_API':
      return process.env.EXPO_PUBLIC_USE_MOCK_API;
    case 'EXPO_PUBLIC_APP_ENV':
      return process.env.EXPO_PUBLIC_APP_ENV;
    case 'EXPO_PUBLIC_APP_NAME':
      return process.env.EXPO_PUBLIC_APP_NAME;
    case 'EXPO_PUBLIC_BUNDLE_ID':
      return process.env.EXPO_PUBLIC_BUNDLE_ID;
    case 'EXPO_PUBLIC_SUBSCRIPTION_PROVIDER':
      return process.env.EXPO_PUBLIC_SUBSCRIPTION_PROVIDER;
    case 'EXPO_PUBLIC_SUBSCRIPTION_GROUP_NAME':
      return process.env.EXPO_PUBLIC_SUBSCRIPTION_GROUP_NAME;
    case 'EXPO_PUBLIC_SUBSCRIPTION_MANAGE_URL':
      return process.env.EXPO_PUBLIC_SUBSCRIPTION_MANAGE_URL;
    case 'EXPO_PUBLIC_SUBSCRIPTION_PRICE_WEEKLY':
      return process.env.EXPO_PUBLIC_SUBSCRIPTION_PRICE_WEEKLY;
    case 'EXPO_PUBLIC_SUBSCRIPTION_PRICE_MONTHLY':
      return process.env.EXPO_PUBLIC_SUBSCRIPTION_PRICE_MONTHLY;
    case 'EXPO_PUBLIC_SUBSCRIPTION_PRICE_ANNUAL':
      return process.env.EXPO_PUBLIC_SUBSCRIPTION_PRICE_ANNUAL;
    case 'EXPO_PUBLIC_ENABLE_ADS':
      return process.env.EXPO_PUBLIC_ENABLE_ADS;
    case 'EXPO_PUBLIC_ENABLE_BILLING':
      return process.env.EXPO_PUBLIC_ENABLE_BILLING;
    case 'EXPO_PUBLIC_APPLE_WEEKLY_PRODUCT_ID':
      return process.env.EXPO_PUBLIC_APPLE_WEEKLY_PRODUCT_ID;
    case 'EXPO_PUBLIC_APPLE_MONTHLY_PRODUCT_ID':
      return process.env.EXPO_PUBLIC_APPLE_MONTHLY_PRODUCT_ID;
    case 'EXPO_PUBLIC_APPLE_ANNUAL_PRODUCT_ID':
      return process.env.EXPO_PUBLIC_APPLE_ANNUAL_PRODUCT_ID;
    default:
      return undefined;
  }
}

function extraEnvValue(key: string): string | undefined {
  switch (key) {
    case 'EXPO_PUBLIC_API_BASE_URL':
      return typeof extra.apiBaseUrl === 'string' ? extra.apiBaseUrl : undefined;
    case 'EXPO_PUBLIC_USE_MOCK_API':
      return typeof extra.useMockApi === 'boolean' ? String(extra.useMockApi) : typeof extra.useMockApi === 'string' ? extra.useMockApi : undefined;
    case 'EXPO_PUBLIC_APP_ENV':
      return extra.environment;
    case 'EXPO_PUBLIC_APP_NAME':
      return extra.appName;
    case 'EXPO_PUBLIC_BUNDLE_ID':
      return extra.bundleId;
    case 'EXPO_PUBLIC_SUBSCRIPTION_PROVIDER':
      return extra.subscriptionProvider;
    case 'EXPO_PUBLIC_SUBSCRIPTION_GROUP_NAME':
      return extra.subscriptionGroupName;
    case 'EXPO_PUBLIC_SUBSCRIPTION_MANAGE_URL':
      return extra.subscriptionManageUrl;
    case 'EXPO_PUBLIC_SUBSCRIPTION_PRICE_WEEKLY':
      return extra.subscriptionPriceWeekly;
    case 'EXPO_PUBLIC_SUBSCRIPTION_PRICE_MONTHLY':
      return extra.subscriptionPriceMonthly;
    case 'EXPO_PUBLIC_SUBSCRIPTION_PRICE_ANNUAL':
      return extra.subscriptionPriceAnnual;
    case 'EXPO_PUBLIC_ENABLE_ADS':
      return typeof extra.enableAds === 'boolean' ? String(extra.enableAds) : typeof extra.enableAds === 'string' ? extra.enableAds : undefined;
    case 'EXPO_PUBLIC_ENABLE_BILLING':
      return typeof extra.enableBilling === 'boolean' ? String(extra.enableBilling) : typeof extra.enableBilling === 'string' ? extra.enableBilling : undefined;
    case 'EXPO_PUBLIC_APPLE_WEEKLY_PRODUCT_ID':
      return extra.appleWeeklyProductId;
    case 'EXPO_PUBLIC_APPLE_MONTHLY_PRODUCT_ID':
      return extra.appleMonthlyProductId;
    case 'EXPO_PUBLIC_APPLE_ANNUAL_PRODUCT_ID':
      return extra.appleAnnualProductId;
    default:
      return undefined;
  }
}

function readEnv(key: string, fallback = ''): string {
  const direct = directEnvValue(key);
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const extraValue = extraEnvValue(key);
  if (typeof extraValue === 'string' && extraValue.trim()) return extraValue.trim();
  return fallback;
}

const normalizeBaseUrl = (value?: string) => String(value ?? '').trim().replace(/\/+$/, '');
function readBoolean(key: string, fallback: boolean): boolean {
  const value = readEnv(key, String(fallback)).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(value)) return true;
  if (['false', '0', 'no', 'off'].includes(value)) return false;
  return fallback;
}

const useMockApi = readBoolean('EXPO_PUBLIC_USE_MOCK_API', false);
const apiBaseUrl = normalizeBaseUrl(readEnv('EXPO_PUBLIC_API_BASE_URL'));

export const env = {
  apiBaseUrl,
  useMockApi,
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
    const missing = [
      env.appleWeeklyProductId ? null : 'EXPO_PUBLIC_APPLE_WEEKLY_PRODUCT_ID',
      env.appleMonthlyProductId ? null : 'EXPO_PUBLIC_APPLE_MONTHLY_PRODUCT_ID',
      env.appleAnnualProductId ? null : 'EXPO_PUBLIC_APPLE_ANNUAL_PRODUCT_ID'
    ].filter(Boolean);
    if (missing.length) throw new Error(`Billing is enabled but product IDs are missing: ${missing.join(', ')}`);
  }
}
