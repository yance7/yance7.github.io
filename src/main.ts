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

document.querySelectorAll<HTMLAnchorElement>('.locale-switcher a[href]').forEach((link) => {
  const pathname = new URL(link.href, window.location.href).pathname
  link.href = `${pathname}${window.location.search}${initialHash}`
})

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
const hasPrerenderedMarkup = document.body.dataset.rendered === 'ssg' && Boolean(page) && page !== 'concerts'

const fontStylesheets = {
  'zh-CN': () => import('./fonts-zh-cn.css'),
  'zh-HK': () => import('./fonts-zh-hk.css'),
  en: () => import('./fonts-en.css')
} as const

function loadPrerenderedFontStylesheet() {
  const href = document.body.dataset.localeFontStylesheet
  if (!href) return Promise.reject(new Error('Missing prerendered locale font stylesheet'))

  const url = new URL(href, window.location.href)
  if (url.origin !== window.location.origin) return Promise.reject(new Error('Locale font stylesheet must be same-origin'))

  const existingStylesheet = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'))
    .find((candidate) => new URL(candidate.href, window.location.href).href === url.href)
  if (existingStylesheet?.sheet) {
    try {
      if (existingStylesheet.sheet.cssRules.length > 0) return Promise.resolve()
    } catch {
      // A failed link may still expose a CSSStyleSheet object in Chromium.
    }
  }
  if (existingStylesheet && document.readyState === 'complete') {
    return Promise.reject(new Error('Prerendered locale font stylesheet failed to load'))
  }

  return new Promise<void>((resolve, reject) => {
    const link = existingStylesheet ?? document.createElement('link')
    link.onload = () => resolve()
    link.onerror = () => reject(new Error('Prerendered locale font stylesheet failed to load'))
    if (!existingStylesheet) {
      link.rel = 'stylesheet'
      link.href = url.href
      document.head.append(link)
    }
  })
}

async function loadFonts() {
  let deadline: ReturnType<typeof setTimeout> | undefined
  const stylesheet = hasPrerenderedMarkup
    ? loadPrerenderedFontStylesheet()
    : fontStylesheets[locale]()
  const loading = stylesheet
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

function startFontsAfterHomePhotoPaint() {
  let fontsScheduled = false
  let fontsStarted = false
  let photoSettled = false
  let observer: PerformanceObserver | undefined
  let photo: HTMLImageElement | null = null
  const startFonts = () => {
    if (fontsStarted) return
    fontsStarted = true
    window.clearTimeout(fallbackTimer)
    startLoadingFonts()
  }
  const settleAfterPaint = () => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(markPhotoSettled))
  }
  const onPhotoLoad = () => {
    if (!photo || photo.naturalWidth === 0) {
      markPhotoSettled()
      return
    }

    try {
      const decoded = typeof photo.decode === 'function'
        ? photo.decode().catch(() => undefined)
        : Promise.resolve()
      void decoded.then(settleAfterPaint)
    } catch {
      settleAfterPaint()
    }
  }
  const onPhotoError = () => markPhotoSettled()
  const cleanupPhotoListener = () => {
    if (!photo) return
    photo.removeEventListener('load', onPhotoLoad)
    photo.removeEventListener('error', onPhotoError)
  }
  const watchPhoto = () => {
    photo = photo ?? document.querySelector<HTMLImageElement>('.home-hero-slideshow__image--current')
    if (!photo) {
      markPhotoSettled()
      return
    }
    photo.addEventListener('load', onPhotoLoad, { once: true })
    photo.addEventListener('error', onPhotoError, { once: true })
    if (photo.complete) {
      if (photo.naturalWidth === 0) markPhotoSettled()
      else onPhotoLoad()
    }
  }
  const scheduleFonts = () => {
    if (fontsScheduled || fontsStarted) return
    fontsScheduled = true
    window.requestAnimationFrame(() => window.requestAnimationFrame(startFonts))
  }
  const markPhotoSettled = () => {
    if (photoSettled) return
    photoSettled = true
    observer?.disconnect()
    cleanupPhotoListener()
    document.documentElement.dataset.homeHeroPhotoReady = 'true'
    window.dispatchEvent(new Event('home-hero-photo-ready'))
    scheduleFonts()
  }
  // Keep a deadline even after the photo paints: its foreground animation frames
  // may be withheld, but font readiness must still release history restoration.
  const fallbackTimer = window.setTimeout(startFonts, fontLoadTimeout)

  try {
    if (!PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) {
      throw new Error('Largest Contentful Paint observation is unavailable')
    }
    observer = new PerformanceObserver((entries) => {
      const hasHeroPhotoPaint = entries.getEntries().some((entry) => {
        const candidate = (entry as PerformanceEntry & { element?: Element | null }).element
        return candidate?.classList.contains('home-hero-slideshow__image') === true
      })
      if (hasHeroPhotoPaint) markPhotoSettled()
    })
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
    watchPhoto()
  } catch {
    observer?.disconnect()
    watchPhoto()
  }
}

document.documentElement.dataset.fontsReady = 'loading'
configurePageChunkPreload()
if (!hasPrerenderedMarkup && page !== 'home') preloadPage(candidate)

let appMounted = false
async function mountApp() {
  if (appMounted) return
  appMounted = true

  try {
    await waitForStaticPagePaint()
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

function waitForStaticPagePaint() {
  if (!hasPrerenderedMarkup || document.documentElement.dataset.staticEntryFallback === 'true') {
    return Promise.resolve()
  }

  if (page === 'home' && !initialHash) {
    if (document.documentElement.dataset.homeHeroPhotoReady === 'true') return Promise.resolve()
    return new Promise<void>((resolve) => {
      const onHeroPhotoReady = () => resolve()
      window.addEventListener('home-hero-photo-ready', onHeroPhotoReady, { once: true })
      if (document.documentElement.dataset.homeHeroPhotoReady === 'true') {
        window.removeEventListener('home-hero-photo-ready', onHeroPhotoReady)
        resolve()
      }
    })
  }

  return new Promise<void>((resolve) => {
    let settled = false
    let observer: PerformanceObserver | undefined
    const finish = () => {
      if (settled) return
      settled = true
      observer?.disconnect()
      window.removeEventListener('load', scheduleFallback)
      resolve()
    }
    const scheduleFallback = () => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(finish))
    }
    window.addEventListener('load', scheduleFallback, { once: true })

    try {
      if (!PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) {
        throw new Error('Largest Contentful Paint observation is unavailable')
      }
      observer = new PerformanceObserver((entries) => {
        const hasMainContentPaint = entries.getEntries().some((entry) => {
          const candidate = (entry as PerformanceEntry & { element?: Element | null }).element
          return candidate instanceof Element && Boolean(candidate.closest('main#main'))
        })
        if (hasMainContentPaint) finish()
      })
      observer.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      observer?.disconnect()
      observer = undefined
    }

    if (document.readyState === 'complete') scheduleFallback()
  })
}

void mountApp()
if (document.body.dataset.page === 'home' && !initialHash) {
  if (document.documentElement.dataset.homeHeroPhotoReady === 'true') startLoadingFonts()
  else if (hasPrerenderedMarkup) startFontsAfterHomePhotoPaint()
  else window.addEventListener('home-hero-photo-ready', startLoadingFonts, { once: true })
} else if (hasPrerenderedMarkup) {
  startLoadingFonts()
} else {
  scheduleFonts()
}
