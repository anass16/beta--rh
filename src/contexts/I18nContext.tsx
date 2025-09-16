import React, { createContext, useState, useContext, useMemo } from 'react';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

type Language = 'en' | 'fr';
type Translations = typeof en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations, fallback?: string) => string;
}

const translations: { [key in Language]: Translations } = { en, fr };

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const getInitialLanguage = (): Language => {
    const storedLang = localStorage.getItem('app_language') as Language;
    if (storedLang && ['en', 'fr'].includes(storedLang)) {
        return storedLang;
    }
    const browserLang = navigator.language.split(/[-_]/)[0];
    return browserLang === 'fr' ? 'fr' : 'en';
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('app_language', lang);
    setLanguageState(lang);
  };

  const t = useMemo(() => {
    const currentTranslations = translations[language];
    return (key: keyof Translations, fallback?: string): string => {
      return currentTranslations[key] || fallback || key;
    };
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
