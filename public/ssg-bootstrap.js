/* global document, window, HTMLScriptElement, URL, PerformanceObserver, Element, navigator, MutationObserver */

(() => {
  const script = document.currentScript
  if (!(script instanceof HTMLScriptElement)) return

  const entry = script.dataset.entry
  if (!entry?.startsWith('/assets/vue/') || entry.split('/').includes('..')) return

  let entryUrl
  try {
    entryUrl = new URL(entry, window.location.href)
  } catch {
    return
  }
  if (entryUrl.origin !== window.location.origin) return

  const page = document.body.dataset.page
  const initialHash = document.documentElement.dataset.initialHash || window.location.hash
  let started = false
  let fallbackTimer
  let observer
  let earlyTouchObserver
  const preserveLocaleNavigation = () => {
    const hash = window.location.hash || document.documentElement.dataset.initialHash || ''
    const search = window.location.search
    document.querySelectorAll('.locale-switcher a[href]').forEach((link) => {
      const url = new URL(link.href, window.location.href)
      if (url.origin === window.location.origin) link.href = `${url.pathname}${search}${hash}`
    })
  }
  preserveLocaleNavigation()
  window.addEventListener('hashchange', preserveLocaleNavigation)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && page === 'home') document.documentElement.classList.remove('home-scroll-snap')
  })

  const startEntry = (preserveFallback = false) => {
    if (!preserveFallback && fallbackTimer !== undefined) {
      window.clearTimeout(fallbackTimer)
      fallbackTimer = undefined
    }
    if (started) return
    started = true
    observer?.disconnect()
    void import(entryUrl.href).catch(() => undefined)
  }
  const startEntryAfterFallback = () => {
    document.documentElement.dataset.staticEntryFallback = 'true'
    if (page === 'home' && !initialHash) {
      document.documentElement.dataset.homeHeroPhotoReady = 'true'
      window.dispatchEvent(new window.Event('home-hero-photo-ready'))
    }
    startEntry()
  }
  const startAfterPaint = () => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(startEntry))
  }
  if (page === 'home') {
    let earlyTouchTimer
    const cleanupEarlyTouch = () => {
      document.removeEventListener('pointerdown', captureEarlyHeroTouch, true)
      earlyTouchObserver?.disconnect()
    }
    const captureEarlyHeroTouch = (event) => {
      if (document.body.dataset.hydrated === 'true') {
        cleanupEarlyTouch()
        return
      }
      if (event.pointerType !== 'touch') return
      if (!window.matchMedia('(pointer: coarse)').matches
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches
        || window.matchMedia('(forced-colors: active)').matches
        || navigator.connection?.saveData === true) return

      const hero = document.querySelector('.home-hero')
      const ripple = document.querySelector('.home-hero-touch-ripple')
      const target = event.target instanceof Element ? event.target : null
      if (!hero || !ripple || !target || !hero.contains(target) || target.closest('[data-home-hero-control]')) return
      const bounds = hero.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) return

      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      const expiresAt = Date.now() + 540
      document.documentElement.dataset.homeHeroTouchX = String(x)
      document.documentElement.dataset.homeHeroTouchY = String(y)
      document.documentElement.dataset.homeHeroTouchUntil = String(expiresAt)
      ripple.style.setProperty('--touch-x', `${x}px`)
      ripple.style.setProperty('--touch-y', `${y}px`)
      ripple.classList.add('is-active')
      ripple.dataset.active = 'true'
      if (earlyTouchTimer !== undefined) window.clearTimeout(earlyTouchTimer)
      earlyTouchTimer = window.setTimeout(() => {
        if (document.documentElement.dataset.homeHeroTouchUntil !== String(expiresAt)) return
        ripple.classList.remove('is-active')
        ripple.dataset.active = 'false'
        delete document.documentElement.dataset.homeHeroTouchX
        delete document.documentElement.dataset.homeHeroTouchY
        delete document.documentElement.dataset.homeHeroTouchUntil
        delete window.__yanceEarlyHomeHeroTouchTimer
      }, 540)
      window.__yanceEarlyHomeHeroTouchTimer = earlyTouchTimer
      startEntry(true)
    }
    document.addEventListener('pointerdown', captureEarlyHeroTouch, { capture: true, passive: true })
    if (document.body.dataset.hydrated === 'true') cleanupEarlyTouch()
    else {
      earlyTouchObserver = new MutationObserver(() => {
        if (document.body.dataset.hydrated === 'true') cleanupEarlyTouch()
      })
      earlyTouchObserver.observe(document.body, { attributes: true, attributeFilter: ['data-hydrated'] })
    }
  }
  const observeLargestContentfulPaint = (matches) => {
    try {
      if (!PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) {
        throw new Error('Largest Contentful Paint observation is unavailable')
      }
      observer = new PerformanceObserver((entries) => {
        const matched = entries.getEntries().some((entry) => {
          const candidate = entry.element
          return candidate instanceof Element && matches(candidate)
        })
        if (matched) startEntry()
      })
      observer.observe({ type: 'largest-contentful-paint', buffered: true })
      return true
    } catch {
      observer?.disconnect()
      observer = undefined
      return false
    }
  }

  fallbackTimer = window.setTimeout(startEntryAfterFallback, 2000)

  if (page === 'home' && !initialHash) {
    const photo = document.querySelector('.home-hero-slideshow__image--current')
    if (!photo) {
      const supportsLcp = observeLargestContentfulPaint((candidate) => Boolean(candidate.closest('main#main')))
      if (!supportsLcp) {
        window.addEventListener('load', startAfterPaint, { once: true })
        if (document.readyState === 'complete') startAfterPaint()
      }
      return
    }

    const onPhotoLoad = () => {
      if (photo.naturalWidth === 0) {
        startEntry()
        return
      }

      try {
        const decoded = typeof photo.decode === 'function'
          ? photo.decode().catch(() => undefined)
          : Promise.resolve()
        void decoded.then(startAfterPaint, startAfterPaint)
      } catch {
        startAfterPaint()
      }
    }
    photo.addEventListener('load', onPhotoLoad, { once: true })
    photo.addEventListener('error', startEntry, { once: true })
    const supportsLcp = observeLargestContentfulPaint((candidate) => (
      candidate === photo || candidate.classList.contains('home-hero-slideshow__image')
    ))
    if (!supportsLcp) {
      window.addEventListener('load', startAfterPaint, { once: true })
      if (document.readyState === 'complete') startAfterPaint()
    }
    if (photo.complete) {
      if (photo.naturalWidth === 0) startEntry()
      else onPhotoLoad()
    }
    return
  }

  const supportsLcp = observeLargestContentfulPaint((candidate) => Boolean(candidate.closest('main#main')))
  if (!supportsLcp) {
    window.addEventListener('load', startAfterPaint, { once: true })
    if (document.readyState === 'complete') startAfterPaint()
  }
})()
