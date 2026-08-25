import { computed, readonly, ref } from 'vue'
import { localeRegistry } from './locales'
import type { Locale } from './types'
import { uiMessages } from './index'

const activeLocale = ref<Locale>('zh-CN')

export function initializeLocale(locale: Locale) {
  activeLocale.value = locale
  if (typeof document !== 'undefined') {
    document.documentElement.lang = localeRegistry[locale].htmlLang
    document.documentElement.dataset.locale = locale
  }
}

export function rememberLocale(locale: Locale) {
  try {
    localStorage.setItem('yance-locale', locale)
  } catch {
    // Preference persistence is optional when storage is unavailable.
  }
}

export function useLocale() {
  return {
    locale: readonly(activeLocale),
    definition: computed(() => localeRegistry[activeLocale.value]),
    messages: computed(() => uiMessages[activeLocale.value])
  }
}
