import { useState, useCallback, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { I18N } from '../constants/i18n';

const LANG_KEY = 'MEBOT_LANG';
const DEFAULT_LANG = 'es';

export function useLanguage() {
  const [lang, setLang] = useState(DEFAULT_LANG);

  useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANG_KEY);
        if (saved && I18N[saved]) {
          setLang(saved);
        }
      } catch (e) {
        // Fallback to default
      }
    };
    loadLang();
  }, []);

  const changeLanguage = useCallback(async (newLang) => {
    if (I18N[newLang]) {
      setLang(newLang);
      try {
        await SecureStore.setItemAsync(LANG_KEY, newLang);
      } catch (e) {}
    }
  }, []);

  const t = useCallback((key) => {
    return I18N[lang][key] || key;
  }, [lang]);

  return { lang, changeLanguage, t };
}
