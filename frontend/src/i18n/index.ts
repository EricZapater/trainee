import { createI18n } from 'vue-i18n'
import ca from './ca.json'
import es from './es.json'
import en from './en.json'

// Map backend idioms to frontend locales
export const idiomToLocale: Record<string, string> = {
  'CAT': 'ca',
  'ESP': 'es',
  'ENG': 'en'
}

export const localeToIdiom: Record<string, string> = {
  'ca': 'CAT',
  'es': 'ESP',
  'en': 'ENG'
}

const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  locale: 'ca', // default locale
  fallbackLocale: 'en',
  messages: {
    ca,
    es,
    en
  }
})

export default i18n
