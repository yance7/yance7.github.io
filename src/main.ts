import { createApp } from 'vue'
import App from './App.vue'
import reveal from './directives/reveal'
import magnetic from './directives/magnetic'
import pointerSheen from './directives/pointerSheen'
import { preloadPage } from './pageLoaders'
import './styles.css'
import './theme.css'

const fontStartDelay = 2400

function loadFonts() {
  void import('./fonts.css').then(async () => {
    await document.fonts.ready
    document.documentElement.dataset.fontsReady = 'ready'
  })
}

function scheduleFonts() {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  }
  const scheduledAt = performance.now()
  const scheduleLoad = () => {
    const elapsed = performance.now() - scheduledAt
    const remaining = Math.max(0, fontStartDelay - elapsed)
    window.setTimeout(loadFonts, remaining)
  }

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(scheduleLoad, { timeout: fontStartDelay })
    return
  }

  scheduleLoad()
}

const app = createApp(App)
app.directive('reveal', reveal)
app.directive('magnetic', magnetic)
app.directive('pointer-sheen', pointerSheen)
document.documentElement.dataset.fontsReady = 'loading'
preloadPage(document.body.dataset.page)
app.mount('#app')
scheduleFonts()
