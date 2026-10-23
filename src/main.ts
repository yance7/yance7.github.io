import { createApp } from 'vue'
import App from './App.vue'
import reveal from './directives/reveal'
import magnetic from './directives/magnetic'
import pointerSheen from './directives/pointerSheen'
import { configurePageChunkPreload, preloadPage } from './pageLoaders'
import { initializeLocale, resolveLocaleFromPath } from './i18n'
import './styles.css'
import './theme.css'

const initialHash = document.documentElement.dataset.initialHash || window.location.hash
if (initialHash) document.documentElement.dataset.initialHash = initialHash
if (initialHash && window.location.hash && document.documentElement.dataset.homeAliasCanonicalized !== 'true') {
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`
  )
}

const locale = resolveLocaleFromPath(window.location.pathname)
initializeLocale(locale)

const fontStylesheets = {
  'zh-CN': () => import('./fonts-zh-cn.css'),
  'zh-HK': () => import('./fonts-zh-hk.css'),
  en: () => import('./fonts-en.css')
} as const

async function loadFonts() {
  let deadline: ReturnType<typeof setTimeout> | undefined
  const loading = fontStylesheets[locale]()
    .then(() => document.fonts.ready)
    .then(() => 'ready' as const, () => 'fallback' as const)
  const fallback = new Promise<'fallback'>(resolve => {
    deadline = setTimeout(() => resolve('fallback'), 4000)
  })
  // Scroll restoration and the adaptive header need a terminal signal even on stalled networks.
  document.documentElement.dataset.fontsReady = await Promise.race([loading, fallback])
  clearTimeout(deadline)
}

const fontLoadTimeout = 2400

function scheduleFonts() {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  }
  const startLoadingFonts = () => { void loadFonts() }

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(startLoadingFonts, { timeout: fontLoadTimeout })
    return
  }

  window.setTimeout(startLoadingFonts, fontLoadTimeout)
}

const app = createApp(App)
app.directive('reveal', reveal)
app.directive('magnetic', magnetic)
app.directive('pointer-sheen', pointerSheen)
document.documentElement.dataset.fontsReady = 'loading'
configurePageChunkPreload()
preloadPage(document.body.dataset.page)

let appMounted = false
function mountApp() {
  if (appMounted) return
  appMounted = true
  app.mount('#app')
}

mountApp()
scheduleFonts()
