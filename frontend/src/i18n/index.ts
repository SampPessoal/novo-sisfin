import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './pt-BR';
import en from './en';

const savedLang = localStorage.getItem('language') || 'pt-BR';

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'pt-BR',
  interpolation: { escapeValue: false },
});

export default i18n;
