import { computed, getCurrentInstance, inject, readonly, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { localeRegistry } from './locales'
import type { Locale } from './types'
import { uiMessages } from './messages'

export interface LocaleState {
  locale: Readonly<Ref<Locale>>
  definition: ComputedRef<(typeof localeRegistry)[Locale]>
  messages: ComputedRef<(typeof uiMessages)[Locale]>
  setLocale: (locale: Locale) => void
}

export const localeStateKey: InjectionKey<LocaleState> = Symbol('locale-state')

export function createLocaleState(initialLocale: Locale): LocaleState {
  const activeLocale = ref<Locale>(initialLocale)
  return {
    locale: readonly(activeLocale),
    definition: computed(() => localeRegistry[activeLocale.value]),
    messages: computed(() => uiMessages[activeLocale.value]),
    setLocale(locale) { activeLocale.value = locale }
  }
}

const fallbackLocaleState = createLocaleState('zh-CN')

export function initializeLocale(locale: Locale) {
  fallbackLocaleState.setLocale(locale)
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
  return getCurrentInstance() ? inject(localeStateKey, fallbackLocaleState) : fallbackLocaleState
}
