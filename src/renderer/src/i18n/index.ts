import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'

export interface LanguageMeta {
  code: string
  label: string
  dir: 'ltr' | 'rtl'
}

/** Every language gets a row here as it's added — flags RTL languages so the
 *  app can set document direction correctly (see AppStateContext). */
export const SUPPORTED_LANGUAGES: LanguageMeta[] = [{ code: 'en', label: 'English', dir: 'ltr' }]

export function languageDir(code: string): 'ltr' | 'rtl' {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.dir ?? 'ltr'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
