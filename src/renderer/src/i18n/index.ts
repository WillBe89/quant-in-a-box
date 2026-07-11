import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zh from './locales/zh.json'
import hi from './locales/hi.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import ar from './locales/ar.json'
import bn from './locales/bn.json'
import pt from './locales/pt.json'
import ru from './locales/ru.json'
import ur from './locales/ur.json'
import th from './locales/th.json'
// Quiz-content strings live in their own namespace, separate from the main translation
// bundle above, and are English-only for now (see academy/quizQuestions.ts). Other locales
// fall back to this English bundle via `fallbackLng` below rather than needing an empty
// per-locale placeholder file.
import enQuiz from './locales/academy-quiz/en.json'

export interface LanguageMeta {
  code: string
  label: string
  dir: 'ltr' | 'rtl'
}

/** Every language gets a row here as it's added — flags RTL languages so the
 *  app can set document direction correctly (see AppStateContext). */
export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'zh', label: '中文', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'bn', label: 'বাংলা', dir: 'ltr' },
  { code: 'pt', label: 'Português', dir: 'ltr' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'th', label: 'ไทย', dir: 'ltr' }
]

export function languageDir(code: string): 'ltr' | 'rtl' {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.dir ?? 'ltr'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en, 'academy-quiz': enQuiz },
    zh: { translation: zh },
    hi: { translation: hi },
    es: { translation: es },
    fr: { translation: fr },
    ar: { translation: ar },
    bn: { translation: bn },
    pt: { translation: pt },
    ru: { translation: ru },
    ur: { translation: ur },
    th: { translation: th }
  },
  ns: ['translation', 'academy-quiz'],
  defaultNS: 'translation',
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
