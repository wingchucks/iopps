import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import {
  changeLanguage as i18nChangeLanguage,
  getCurrentLanguage,
  getAvailableLanguages,
} from '../i18n';

/**
 * Custom hook for translations in the IOPPS mobile app
 *
 * @returns {Object} Translation utilities
 * @returns {Function} t - Translation function that takes a key and optional parameters
 * @returns {string} language - Current language code (e.g., 'en', 'fr')
 * @returns {Function} setLanguage - Function to change the current language
 * @returns {Object} availableLanguages - Object containing available languages with their names
 * @returns {boolean} isReady - Whether i18n is initialized and ready to use
 *
 * @example
 * // Basic usage
 * const { t } = useTranslation();
 * <Text>{t('common.save')}</Text>
 *
 * @example
 * // With interpolation
 * const { t } = useTranslation();
 * <Text>{t('validation.required', { field: 'Email' })}</Text>
 *
 * @example
 * // Change language
 * const { setLanguage } = useTranslation();
 * <Button onPress={() => setLanguage('fr')} title="Français" />
 *
 * @example
 * // Display current language
 * const { language, availableLanguages } = useTranslation();
 * <Text>Current: {availableLanguages[language].nativeName}</Text>
 */
export const useTranslation = () => {
  const { t, i18n } = useI18nextTranslation();
  const [language, setLanguageState] = useState<string>(getCurrentLanguage());
  const [isReady, setIsReady] = useState<boolean>(i18n.isInitialized);

  // Update language state when i18n language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setLanguageState(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    // Set ready state when initialized
    if (i18n.isInitialized) {
      setIsReady(true);
      setLanguageState(i18n.language);
    }

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  /**
   * Change the current language
   * @param {string} newLanguage - Language code to switch to
   */
  const setLanguage = useCallback(async (newLanguage: string) => {
    try {
      await i18nChangeLanguage(newLanguage);
      setLanguageState(newLanguage);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }, []);

  /**
   * Get available languages
   */
  const availableLanguages = getAvailableLanguages();

  return {
    t,
    language,
    setLanguage,
    availableLanguages,
    isReady,
  };
};

export default useTranslation;
