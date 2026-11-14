import { renderToString } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import { createSiteApp } from './createSiteApp'
import { loadPageComponent } from './pageLoaders'
import StartupShell from './app/StartupShell.vue'
import { createThemeState, themeStateKey } from './composables/useTheme'
import { createLocaleState, localeStateKey } from './i18n/useLocale'
import { siteRenderContextKey } from './app/renderContext'
import magnetic from './directives/magnetic'
import pointerSheen from './directives/pointerSheen'
import reveal from './directives/reveal'
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

export interface ShellContext {
  page: 'concerts' | 'not-found'
  locale: Locale
}

export async function renderShell(context: ShellContext) {
  const page = context.page === 'concerts' ? 'concerts' : undefined
  const app = createSSRApp(StartupShell, { page })
  app.provide(siteRenderContextKey, { page, locale: context.locale, renderDateIso: '', initialHash: '' })
  app.provide(localeStateKey, createLocaleState(context.locale))
  app.provide(themeStateKey, createThemeState())
  app.directive('reveal', reveal)
  app.directive('magnetic', magnetic)
  app.directive('pointer-sheen', pointerSheen)
  const html = await renderToString(app)
  return { html }
}
