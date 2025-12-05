import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../lib/logger';

// Import translation files
import en from './locales/en.json';
import fr from './locales/fr.json';

// Storage key for persisted language preference
const LANGUAGE_STORAGE_KEY = '@iopps_language';

// Define available languages
export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English' },
  fr: { name: 'French', nativeName: 'Français' },
};

// Get device language
const getDeviceLanguage = (): string => {
  const deviceLanguages = Localization.getLocales();
  if (deviceLanguages && deviceLanguages.length > 0) {
    const primaryLanguage = deviceLanguages[0].languageCode;
    // Check if the device language is supported, otherwise fallback to English
    return Object.keys(LANGUAGES).includes(primaryLanguage || '')
      ? primaryLanguage || 'en'
      : 'en';
  }
  return 'en';
};

// Get stored language preference or device language
const getInitialLanguage = async (): Promise<string> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage && Object.keys(LANGUAGES).includes(storedLanguage)) {
      return storedLanguage;
    }
  } catch (error) {
    logger.error('Error retrieving stored language:', error);
  }
  return getDeviceLanguage();
};

// Save language preference
export const saveLanguagePreference = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    logger.error('Error saving language preference:', error);
  }
};

// Initialize i18next
const initI18n = async () => {
  const initialLanguage = await getInitialLanguage();

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3', // Required for React Native
      resources: {
        en: { translation: en },
        fr: { translation: fr },
      },
      lng: initialLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already protects from XSS
      },
      react: {
        useSuspense: false, // Disable suspense for React Native
      },
    });

  return i18n;
};

// Change language and save preference
export const changeLanguage = async (language: string): Promise<void> => {
  if (Object.keys(LANGUAGES).includes(language)) {
    await i18n.changeLanguage(language);
    await saveLanguagePreference(language);
  } else {
    logger.warn(`Language '${language}' is not supported. Falling back to English.`);
    await i18n.changeLanguage('en');
    await saveLanguagePreference('en');
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

// Get available languages
export const getAvailableLanguages = () => {
  return LANGUAGES;
};

// Initialize and export
export const i18nInstance = initI18n();

export default i18n;
