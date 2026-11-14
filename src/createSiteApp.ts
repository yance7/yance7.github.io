import { createApp, createSSRApp, type Component } from 'vue'
import App from './App.vue'
import { createThemeState, themeStateKey } from './composables/useTheme'
import magnetic from './directives/magnetic'
import pointerSheen from './directives/pointerSheen'
import reveal from './directives/reveal'
import { createLocaleState, localeStateKey } from './i18n/useLocale'
import { siteRenderContextKey, type SiteRenderContext } from './app/renderContext'

export function createSiteApp(context: SiteRenderContext, initialPage?: Component, hydrate = true) {
  const app = hydrate ? createSSRApp(App, { context, initialPage }) : createApp(App, { context, initialPage })
  const initialTheme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  app.provide(siteRenderContextKey, context)
  app.provide(localeStateKey, createLocaleState(context.locale))
  app.provide(themeStateKey, createThemeState(initialTheme))
  app.directive('reveal', reveal)
  app.directive('magnetic', magnetic)
  app.directive('pointer-sheen', pointerSheen)
  return app
}
