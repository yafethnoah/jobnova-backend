/** @type {import('expo/config').ExpoConfig} */
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || '12.0.0';
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'JobNova';
const BUNDLE_ID = process.env.EXPO_PUBLIC_BUNDLE_ID || 'com.jobnova.app';
const PROJECT_SLUG = process.env.EXPO_PUBLIC_PROJECT_SLUG || 'jobnova';

const config = {
  name: APP_NAME,
  slug: PROJECT_SLUG,
  scheme: 'jobnova',
  version: APP_VERSION,
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-document-picker',
    ['expo-audio', { microphonePermission: 'JobNova uses the microphone for live interview practice and voice coaching.' }],
    ['expo-build-properties', { ios: { useFrameworks: 'static' } }]
  ],
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
    infoPlist: {
      NSMicrophoneUsageDescription: 'JobNova uses the microphone for live interview practice and voice coaching.',
      NSSpeechRecognitionUsageDescription: 'JobNova may transcribe your interview answers to generate coaching feedback.',
      NSCameraUsageDescription: 'JobNova can use the camera when you choose to add or update your profile image.',
      NSPhotoLibraryUsageDescription: 'JobNova can access your photo library when you choose a profile image or attachment.'
    }
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png'
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
    useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API || 'false',
    environment: process.env.EXPO_PUBLIC_APP_ENV || 'development',
    subscriptionProvider: process.env.EXPO_PUBLIC_SUBSCRIPTION_PROVIDER || 'apple-direct',
    subscriptionGroupName: process.env.EXPO_PUBLIC_SUBSCRIPTION_GROUP_NAME || 'JobNova Pro',
    subscriptionManageUrl: process.env.EXPO_PUBLIC_SUBSCRIPTION_MANAGE_URL || 'https://apps.apple.com/account/subscriptions',
    subscriptionPriceWeekly: process.env.EXPO_PUBLIC_SUBSCRIPTION_PRICE_WEEKLY || '$1.99/week',
    subscriptionPriceMonthly: process.env.EXPO_PUBLIC_SUBSCRIPTION_PRICE_MONTHLY || '$9.99/month',
    subscriptionPriceAnnual: process.env.EXPO_PUBLIC_SUBSCRIPTION_PRICE_ANNUAL || '$59.99/year',
    enableAds: process.env.EXPO_PUBLIC_ENABLE_ADS || 'false',
    enableBilling: process.env.EXPO_PUBLIC_ENABLE_BILLING || 'false',
    appleWeeklyProductId: process.env.EXPO_PUBLIC_APPLE_WEEKLY_PRODUCT_ID || '',
    appleMonthlyProductId: process.env.EXPO_PUBLIC_APPLE_MONTHLY_PRODUCT_ID || '',
    appleAnnualProductId: process.env.EXPO_PUBLIC_APPLE_ANNUAL_PRODUCT_ID || ''
  }
};

module.exports = config;
