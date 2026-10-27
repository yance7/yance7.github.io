<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getLocalizedPageMeta } from './data/locales'
import { isPageKey } from './data'
import { useLocale } from './i18n'
import { useTheme } from './composables/useTheme'
import { useHomeScrollSnap } from './composables/useHomeScrollSnap'
import { revealForNavigation } from './directives/reveal'
import { decodeHashTarget } from './utils/navigation'
import { loadPageWithDeadline } from './utils/pageLoad'
import { getPageLoader } from './pageLoaders'
import { getCenteredScrollLeft } from './utils/horizontalRail'

import SiteHeader from './components/SiteHeader.vue'
import ArchiveHero from './components/ArchiveHero.vue'
import HomeHero from './components/HomeHero.vue'
import SiteFooter from './components/SiteFooter.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import ScrollProgress from './components/ScrollProgress.vue'
import PageLoadError from './components/PageLoadError.vue'
import PageContentSkeleton from './components/PageContentSkeleton.vue'
import SitewideCursor from './components/SitewideCursor.vue'

import NotFoundPage from './pages/NotFoundPage.vue'

import type { LightboxPayload } from './data/types'

const page = (() => {
  const candidate = document.body.dataset.page
  return isPageKey(candidate) ? candidate : undefined
})()
const initialHash = document.documentElement.dataset.initialHash || window.location.hash
const isHome = page === 'home'
const deferHomeContent = isHome && !initialHash
const pageContentEnabled = ref(!deferHomeContent)
const { initTheme } = useTheme()
const { locale, messages } = useLocale()

const lightbox = ref<LightboxPayload | null>(null)
type PageLoadState = 'loading' | 'ready' | 'error'

const pageLoader = page ? getPageLoader(page) : undefined
const pageLoadState = ref<PageLoadState>(pageLoader ? 'loading' : 'ready')
const showPageSkeleton = ref(false)
const pageLoadController = new AbortController()
let skeletonTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false
let hashScrolled = false
let hashScrollCancelled = false
let hashScrollFrame: number | undefined
let homeContentObserver: PerformanceObserver | null = null
let homeContentFallbackTimer: ReturnType<typeof setTimeout> | undefined
let homePhotoFallbackCleanup: (() => void) | null = null
let hashScrollAttempts = 0
let pendingHashTarget: HTMLElement | undefined
const hashScrollMaxAttempts = 120

function clearInitialHashMarker() {
  delete document.documentElement.dataset.initialHash
}

function restoreInitialHashUrl() {
  if (!initialHash) return
  if (window.location.hash !== initialHash) {
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${initialHash}`
    )
  }
}

function restoreInitialHash() {
  restoreInitialHashUrl()
  clearInitialHashMarker()
}

function findHorizontalScroller(target: HTMLElement) {
  const markedScroller = target.closest<HTMLElement>('[data-horizontal-scroll]')
  if (markedScroller) return markedScroller

  let ancestor = target.parentElement
  while (ancestor && ancestor !== document.body) {
    const style = getComputedStyle(ancestor)
    if (/auto|scroll|overlay/.test(style.overflowX)) return ancestor
    ancestor = ancestor.parentElement
  }
  return null
}

function scrollTargetVertically(target: HTMLElement) {
  const scrollMarginTop = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  window.scrollTo({
    top: window.scrollY + target.getBoundingClientRect().top - scrollMarginTop,
    left: window.scrollX,
    behavior: 'auto'
  })
}

function scrollTargetHorizontally(target: HTMLElement, scroller: HTMLElement) {
  if (scroller.dataset.horizontalAlign === 'center') {
    scroller.dispatchEvent(new CustomEvent('rail-target', { detail: target }))
    scroller.scrollLeft = getCenteredScrollLeft(target.offsetLeft + target.offsetWidth / 2, scroller.clientWidth, scroller.scrollWidth - scroller.clientWidth)
    return
  }
  const targetRect = target.getBoundingClientRect()
  const scrollerRect = scroller.getBoundingClientRect()
  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
  const targetScrollLeft = scroller.scrollLeft + targetRect.left - scrollerRect.left
  scroller.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft))
}

function findHashTarget(id: string) {
  return document.getElementById(id)
    ?? Array.from(document.querySelectorAll<HTMLElement>('[data-anchor-id]'))
      .find((candidate) => candidate.dataset.anchorId === id)
    ?? null
}

function horizontalLayoutIsReady(scroller: HTMLElement) {
  if (scroller.dataset.horizontalAlign === 'center') return scroller.dataset.railReady === 'true'
  if (!scroller.hasAttribute('data-horizontal-scroll')) return true
  const anchorCount = scroller.querySelectorAll('[data-anchor-id]').length
  return anchorCount <= 1 || scroller.scrollWidth > scroller.clientWidth
}

function isHashTargetVisible(target: HTMLElement, horizontalScroller: HTMLElement | null) {
  const targetRect = target.getBoundingClientRect()
  const isVerticallyVisible = targetRect.bottom > 0 && targetRect.top < window.innerHeight
  if (!horizontalScroller) return isVerticallyVisible

  const scrollerRect = horizontalScroller.getBoundingClientRect()
  if (horizontalScroller.dataset.horizontalAlign === 'center' && horizontalScroller.scrollWidth > horizontalScroller.clientWidth + 1) {
    return isVerticallyVisible && Math.abs(target.offsetLeft + target.offsetWidth / 2 - horizontalScroller.scrollLeft - horizontalScroller.clientWidth / 2) <= 2
  }
  return isVerticallyVisible
    && targetRect.left >= scrollerRect.left
    && targetRect.right <= scrollerRect.right
}

function cancelPendingHashScroll() {
  if (hashScrolled || hashScrollCancelled || !initialHash) return
  hashScrollCancelled = true
  if (pendingHashTarget) {
    delete pendingHashTarget.dataset.hashTarget
    pendingHashTarget = undefined
  }
  if (hashScrollFrame !== undefined) {
    window.cancelAnimationFrame(hashScrollFrame)
    hashScrollFrame = undefined
  }
  clearInitialHashMarker()
}

function handleHashChange() {
  if (window.location.hash !== initialHash) cancelPendingHashScroll()
}

function enableHomeContent() {
  if (disposed || pageContentEnabled.value) return
  homeContentObserver?.disconnect()
  homeContentObserver = null
  homePhotoFallbackCleanup?.()
  homePhotoFallbackCleanup = null
  clearTimeout(homeContentFallbackTimer)
  homeContentFallbackTimer = undefined
  pageContentEnabled.value = true
  document.documentElement.dataset.homeHeroPhotoReady = 'true'
  window.dispatchEvent(new Event('home-hero-photo-ready'))
}

function scheduleHomeContentFallback() {
  homeContentFallbackTimer = window.setTimeout(enableHomeContent, 4000)
  const photo = document.querySelector<HTMLImageElement>('.home-hero-slideshow__image--current')
  if (!photo) {
    window.requestAnimationFrame(() => window.requestAnimationFrame(enableHomeContent))
    return
  }

  let settled = false
  const cleanup = () => {
    photo.removeEventListener('load', loaded)
    photo.removeEventListener('error', failed)
  }
  const finish = (decode: boolean) => {
    if (settled) return
    settled = true
    cleanup()
    homePhotoFallbackCleanup = null
    if (!decode) {
      enableHomeContent()
      return
    }
    const decoded = typeof photo.decode === 'function' ? photo.decode().catch(() => undefined) : Promise.resolve()
    void decoded.then(() => window.requestAnimationFrame(() => window.requestAnimationFrame(enableHomeContent)))
  }
  const loaded = () => finish(true)
  const failed = () => finish(false)
  photo.addEventListener('load', loaded)
  photo.addEventListener('error', failed)
  homePhotoFallbackCleanup = cleanup

  if (photo.complete) {
    if (photo.naturalWidth > 0) loaded()
    else failed()
  }
}

function scheduleHashScroll() {
  if (hashScrollFrame !== undefined) return
  if (hashScrollAttempts >= hashScrollMaxAttempts) {
    scrollToHashTarget(true)
    return
  }

  hashScrollFrame = window.requestAnimationFrame(() => {
    hashScrollFrame = undefined
    hashScrollAttempts += 1
    scrollToHashTarget()
  })
}

function scrollToHashTarget(force = false) {
  if (hashScrolled || hashScrollCancelled || !initialHash || hashScrollFrame !== undefined) return
  if (window.location.hash && window.location.hash !== initialHash) {
    cancelPendingHashScroll()
    return
  }
  const id = decodeHashTarget(initialHash)
  if (!id) {
    restoreInitialHash()
    hashScrolled = true
    return
  }
  const target = findHashTarget(id)
  if (!target) {
    restoreInitialHash()
    hashScrolled = true
    return
  }
  // Keep the address shareable while positioning waits for layout or RAF.
  // The marker still protects header/font readiness until positioning finishes.
  restoreInitialHashUrl()
  pendingHashTarget = target
  target.dataset.hashTarget = 'true'
  revealForNavigation(target)

  const horizontalScroller = findHorizontalScroller(target)
  if (!force && horizontalScroller && !horizontalLayoutIsReady(horizontalScroller)) {
    scheduleHashScroll()
    return
  }

  if (!horizontalScroller) {
    target.scrollIntoView({ block: 'start', behavior: 'auto' })
  } else {
    const targetRect = target.getBoundingClientRect()
    const scrollerRect = horizontalScroller.getBoundingClientRect()
    const isHorizontallyVisible = targetRect.left >= scrollerRect.left && targetRect.right <= scrollerRect.right
    if (isHorizontallyVisible && horizontalScroller.dataset.horizontalAlign !== 'center') scrollTargetVertically(target)
    else {
      scrollTargetHorizontally(target, horizontalScroller)
      scrollTargetVertically(target)
    }
  }

  if (!isHashTargetVisible(target, horizontalScroller)) {
    if (force) {
      hashScrolled = true
      pendingHashTarget = undefined
      restoreInitialHash()
      return
    }
    scheduleHashScroll()
    return
  }

  hashScrolled = true
  pendingHashTarget = undefined
  restoreInitialHash()
}

onMounted(() => {
  initTheme()
  window.addEventListener('hashchange', handleHashChange)
  if (!deferHomeContent) return
  if (window.matchMedia('(forced-colors: active)').matches) {
    enableHomeContent()
    return
  }

  const photo = document.querySelector<HTMLImageElement>('.home-hero-slideshow__image--current')
  if (photo) {
    const failed = () => enableHomeContent()
    if (photo.complete) {
      if (photo.naturalWidth === 0) {
        enableHomeContent()
        return
      }
    } else {
      photo.addEventListener('error', failed, { once: true })
      homePhotoFallbackCleanup = () => photo.removeEventListener('error', failed)
    }
  }
  try {
    if (!PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) {
      throw new Error('Largest Contentful Paint observation is unavailable')
    }
    homeContentObserver = new PerformanceObserver((entries) => {
      const hasHeroPhotoPaint = entries.getEntries().some((entry) => {
        const candidate = (entry as PerformanceEntry & { element?: Element | null }).element
        return candidate?.classList.contains('home-hero-slideshow__image') === true
      })
      if (hasHeroPhotoPaint) enableHomeContent()
    })
    homeContentObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    homeContentFallbackTimer = window.setTimeout(enableHomeContent, 4000)
  } catch {
    homeContentObserver?.disconnect()
    homeContentObserver = null
    scheduleHomeContentFallback()
  }
})
onBeforeUnmount(() => {
  disposed = true
  pageLoadController.abort()
  clearTimeout(skeletonTimer)
  clearTimeout(homeContentFallbackTimer)
  homeContentObserver?.disconnect()
  homePhotoFallbackCleanup?.()
  homePhotoFallbackCleanup = null
  window.removeEventListener('hashchange', handleHashChange)
  if (hashScrollFrame !== undefined) window.cancelAnimationFrame(hashScrollFrame)
})
watch(pageLoadState, async (state) => {
  if (state !== 'ready') return
  await nextTick()
  scrollToHashTarget()
}, { immediate: true })

async function loadPage() {
  if (!pageLoader) throw new Error('Page loader is unavailable')
  skeletonTimer = setTimeout(() => {
    if (!disposed && pageLoadState.value === 'loading') showPageSkeleton.value = true
  }, 150)
  try {
    return await loadPageWithDeadline(pageLoader, { signal: pageLoadController.signal })
  } catch {
    if (!disposed) {
      pageLoadState.value = 'error'
      const keepInitialHash = !hashScrollCancelled && (!window.location.hash || window.location.hash === initialHash)
      cancelPendingHashScroll()
      if (keepInitialHash) restoreInitialHash()
    }
    return PageLoadError
  } finally {
    clearTimeout(skeletonTimer)
    if (!disposed) showPageSkeleton.value = false
  }
}

async function handlePageResolved() {
  if (disposed || pageLoadState.value !== 'loading') return
  await nextTick()
  if (disposed || pageLoadState.value !== 'loading') return
  scrollToHashTarget()
  pageLoadState.value = 'ready'
}

useHomeScrollSnap(isHome, computed(() => pageLoadState.value === 'ready'))
const isError = !page
const meta = computed(() => page ? getLocalizedPageMeta(locale.value, page) : messages.value.page.home)

const kicker = computed(() => (isError ? messages.value.error404.kicker : meta.value.kicker))
const heroTitle = computed(() => (isError ? messages.value.error404.title : meta.value.title))
const heroCopy = computed(() => (isError ? messages.value.error404.copy : meta.value.copy))
const heroCredit = computed(() => (isError || !page ? null : getLocalizedPageMeta(locale.value, page).credit || null))

const currentPage = pageLoader
  ? defineAsyncComponent(loadPage)
  : NotFoundPage
function handleLightbox(data: LightboxPayload) { lightbox.value = data }
function closeLightbox() { lightbox.value = null }
function moveLightbox(step: number) {
  if (!lightbox.value) return
  const total = lightbox.value.images.length
  lightbox.value.index = (lightbox.value.index + step + total) % total
}
</script>

<template>
  <div class="site-shell" :data-page-load-state="pageLoadState">
    <a class="skip-link" href="#main">{{ messages.accessibility.skipToMain }}</a>
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="grain"></div>
    <SitewideCursor />

    <SiteHeader :page="page" />

    <main id="main">
      <ScrollProgress v-if="page" />

      <HomeHero
        v-if="isHome"
        :runtime-enabled="pageContentEnabled"
      />

      <ArchiveHero
        v-else
        :page="page ?? '404'"
        :error="isError"
        :kicker="kicker"
        :title="heroTitle"
        :copy="heroCopy"
        :credit="heroCredit"
      />

      <Suspense v-if="pageContentEnabled" @resolve="handlePageResolved">
        <component :is="currentPage" @open-lightbox="handleLightbox" />
        <template #fallback><PageContentSkeleton v-if="showPageSkeleton" /></template>
      </Suspense>
    </main>

    <SiteFooter v-if="pageLoadState !== 'loading'" />

    <ImageLightbox
      v-if="lightbox"
      :images="lightbox.images"
      :index="lightbox.index"
      :meta="lightbox.meta"
      @close="closeLightbox"
      @prev="moveLightbox(-1)"
      @next="moveLightbox(1)"
    />
  </div>
</template>
