/** @type {import('expo/config').ExpoConfig} */

const toBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  return fallback;
};

const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'JobNova';
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || '18.3.0';
const BUNDLE_ID = process.env.EXPO_PUBLIC_BUNDLE_ID || 'com.shadi.jobnova';
const PROJECT_SLUG = process.env.EXPO_PUBLIC_PROJECT_SLUG || 'jobnova';
const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  'bd245184-37d2-4aa4-967d-f5d0ef47c32e';

module.exports = {
  expo: {
    name: APP_NAME,
    slug: PROJECT_SLUG,
    scheme: 'jobnova',
    version: APP_VERSION,
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    owner: process.env.EXPO_PUBLIC_EXPO_OWNER || 'shadykutaifan',

    plugins: ['expo-router', 'expo-secure-store', 'expo-document-picker'],

    icon: './assets/icon.png',

    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#031345'
    },

    experiments: {
      typedRoutes: true
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: BUNDLE_ID,
      buildNumber: process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER || '1',
      infoPlist: {
        NSMicrophoneUsageDescription:
          'JobNova uses the microphone for live interview practice.',
        NSSpeechRecognitionUsageDescription:
          'JobNova may transcribe your interview answers to generate coaching feedback.',
        NSCameraUsageDescription:
          'JobNova can use the camera when you choose to add or update your profile image.',
        NSPhotoLibraryUsageDescription:
          'JobNova can access your photo library when you choose a profile image or attachment.'
      }
    },

    android: {
      package: BUNDLE_ID,
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS'
      ],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#031345'
      }
    },

    web: {
      bundler: 'metro',
      favicon: './assets/favicon.png'
    },

    extra: {
      eas: {
        projectId: EAS_PROJECT_ID
      },
      apiBaseUrl:
        process.env.EXPO_PUBLIC_API_BASE_URL ||
        'https://jobnova-backend.onrender.com',
      useMockApi: toBool(process.env.EXPO_PUBLIC_USE_MOCK_API, false),
      environment: process.env.EXPO_PUBLIC_APP_ENV || 'production',
      subscriptionProvider:
        process.env.EXPO_PUBLIC_SUBSCRIPTION_PROVIDER || 'apple-direct',
      subscriptionGroupName:
        process.env.EXPO_PUBLIC_SUBSCRIPTION_GROUP_NAME || 'JobNova Pro',
      subscriptionManageUrl:
        process.env.EXPO_PUBLIC_SUBSCRIPTION_MANAGE_URL ||
        'https://apps.apple.com/account/subscriptions',
      subscriptionPriceWeekly:
        process.env.EXPO_PUBLIC_SUBSCRIPTION_PRICE_WEEKLY || '$1.99/week',
      subscriptionPriceMonthly:
        process.env.EXPO_PUBLIC_SUBSCRIPTION_PRICE_MONTHLY || '$9.99/month',
      subscriptionPriceAnnual:
        process.env.EXPO_PUBLIC_SUBSCRIPTION_PRICE_ANNUAL || '$59.99/year',
      enableAds: toBool(process.env.EXPO_PUBLIC_ENABLE_ADS, false),
      enableBilling: toBool(process.env.EXPO_PUBLIC_ENABLE_BILLING, false),
      appleWeeklyProductId:
        process.env.EXPO_PUBLIC_APPLE_WEEKLY_PRODUCT_ID || '',
      appleMonthlyProductId:
        process.env.EXPO_PUBLIC_APPLE_MONTHLY_PRODUCT_ID || '',
      appleAnnualProductId:
        process.env.EXPO_PUBLIC_APPLE_ANNUAL_PRODUCT_ID || ''
    }
  }
};