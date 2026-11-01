import { renderToString } from '@vue/server-renderer'
import { createSiteApp } from './createSiteApp'
import { loadPageComponent } from './pageLoaders'
import type { PageKey } from './data/pageRegistry'
import type { Locale } from './i18n/types'

export interface PrerenderContext {
  page: Exclude<PageKey, 'concerts'>
  locale: Locale
  renderDateIso: string
}

export async function renderPage(context: PrerenderContext) {
  const page = await loadPageComponent(context.page)
  const app = createSiteApp(context, page)
  const renderContext: { modules?: Set<string>; teleports?: Record<string, string> } = {}
  const html = await renderToString(app, renderContext)
  return {
    html,
    modules: renderContext.modules ?? new Set<string>(),
    teleports: renderContext.teleports ?? {}
  }
}
