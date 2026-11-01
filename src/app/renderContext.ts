import { inject, type InjectionKey } from 'vue'
import type { PageKey } from '../data/pageRegistry'
import type { Locale } from '../i18n/types'

export interface SiteRenderContext {
  page: PageKey | undefined
  locale: Locale
  renderDateIso: string
  initialHash?: string
}

export const siteRenderContextKey: InjectionKey<SiteRenderContext> = Symbol('site-render-context')

const fallbackContext: SiteRenderContext = {
  page: undefined,
  locale: 'zh-CN',
  renderDateIso: ''
}

export function useSiteRenderContext() {
  return inject(siteRenderContextKey, fallbackContext)
}
