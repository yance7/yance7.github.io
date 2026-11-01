import { nextTick } from 'vue'
import { isPageKey } from './data'
import { createSiteApp } from './createSiteApp'
import { configurePageChunkPreload, loadPageComponent, preloadPage } from './pageLoaders'
import { initializeLocale, resolveLocaleFromPath } from './i18n'
import { decodeHashTarget } from './utils/navigation'
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
const candidate = document.body.dataset.page
const page = isPageKey(candidate) ? candidate : undefined
const renderContext = {
  page,
  locale,
  renderDateIso: document.body.dataset.renderDate ?? '',
  initialHash
}

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

function startLoadingFonts() { void loadFonts() }

function restoreStaticPageHash() {
  const hash = window.location.hash || initialHash
  if (hash && !window.location.hash) {
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${hash}`
    )
  }

  const targetId = decodeHashTarget(hash)
  if (targetId) document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'auto' })
  delete document.documentElement.dataset.initialHash
}

function scheduleFonts() {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  }

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(startLoadingFonts, { timeout: fontLoadTimeout })
    return
  }

  window.setTimeout(startLoadingFonts, fontLoadTimeout)
}

document.documentElement.dataset.fontsReady = 'loading'
configurePageChunkPreload()
const hasPrerenderedMarkup = document.body.dataset.rendered === 'ssg' && Boolean(page) && page !== 'concerts'
if (!hasPrerenderedMarkup && page !== 'home') preloadPage(candidate)

let appMounted = false
async function mountApp() {
  if (appMounted) return
  appMounted = true

  try {
    const initialPage = hasPrerenderedMarkup && page ? await loadPageComponent(page) : undefined
    const app = createSiteApp(renderContext, initialPage, hasPrerenderedMarkup)
    app.mount('#app')
    await nextTick()
    document.documentElement.dataset.vueEnhanced = 'true'
    document.body.dataset.hydrated = 'true'
  } catch {
    if (hasPrerenderedMarkup) {
      restoreStaticPageHash()
      const notice = document.createElement('p')
      notice.className = 'enhancement-notice'
      notice.setAttribute('role', 'status')
      notice.textContent = {
        'zh-CN': '动态交互暂未加载；本页内容和链接仍可使用。刷新页面可再次尝试。',
        'zh-HK': '動態互動暫未載入；本頁內容和連結仍可使用。重新整理頁面可再試一次。',
        en: 'Interactive features could not load; the page content and links remain available. Refresh to try again.'
      }[locale]
      document.body.append(notice)
    }
  }
}

void mountApp()
if (hasPrerenderedMarkup) {
  startLoadingFonts()
} else if (document.body.dataset.page === 'home' && !initialHash) {
  if (document.documentElement.dataset.homeHeroPhotoReady === 'true') startLoadingFonts()
  else window.addEventListener('home-hero-photo-ready', startLoadingFonts, { once: true })
} else {
  scheduleFonts()
}
