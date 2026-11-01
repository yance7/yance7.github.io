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
  app.provide(siteRenderContextKey, context)
  app.provide(localeStateKey, createLocaleState(context.locale))
  app.provide(themeStateKey, createThemeState())
  app.directive('reveal', reveal)
  app.directive('magnetic', magnetic)
  app.directive('pointer-sheen', pointerSheen)
  return app
}
