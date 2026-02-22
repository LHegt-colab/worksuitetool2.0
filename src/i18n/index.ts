import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import nl from './nl'
import en from './en'
import sv from './sv'

const savedLang = localStorage.getItem('wst_language') || 'nl'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nl },
      en: { translation: en },
      sv: { translation: sv },
    },
    lng: savedLang,
    fallbackLng: 'nl',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n

export type SupportedLanguage = 'nl' | 'en' | 'sv'

export const supportedLanguages: { code: SupportedLanguage; name: string; flag: string }[] = [
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
]

export function changeLanguage(lang: SupportedLanguage) {
  i18n.changeLanguage(lang)
  localStorage.setItem('wst_language', lang)
  document.documentElement.lang = lang
}
