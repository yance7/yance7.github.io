<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue'
import { getLocalizedPageMeta, getLocalizedSections } from './data/locales'
import { isPageKey } from './data'
import { useLocale } from './i18n'
import { useTheme } from './composables/useTheme'
import { decodeHashTarget, retryAsync } from './utils/navigation'
import { getPageLoader } from './pageLoaders'

import SiteHeader from './components/SiteHeader.vue'
import ArchiveHero from './components/ArchiveHero.vue'
import HomeHero from './components/HomeHero.vue'
import SiteFooter from './components/SiteFooter.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import PageCompass from './components/PageCompass.vue'
import PageLoadError from './components/PageLoadError.vue'

import NotFoundPage from './pages/NotFoundPage.vue'

import type { LightboxPayload } from './data/types'

const page = (() => {
  const candidate = document.body.dataset.page
  return isPageKey(candidate) ? candidate : undefined
})()
const { initTheme } = useTheme()
const { locale, messages } = useLocale()

const lightbox = ref<LightboxPayload | null>(null)
type PageLoadState = 'loading' | 'ready' | 'error'

const pageLoader = page ? getPageLoader(page) : undefined
const pageLoadState = ref<PageLoadState>(pageLoader ? 'loading' : 'ready')
let hashScrolled = false
const initialHash = document.documentElement.dataset.initialHash || window.location.hash

function restoreInitialHash() {
  if (!initialHash || window.location.hash === initialHash) return
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}${initialHash}`
  )
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

function findHashTarget(id: string) {
  return document.getElementById(id)
    ?? Array.from(document.querySelectorAll<HTMLElement>('[data-anchor-id]'))
      .find((candidate) => candidate.dataset.anchorId === id)
    ?? null
}

function scrollToHashTarget() {
  if (hashScrolled || !initialHash) return
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
  target.dataset.hashTarget = 'true'

  const horizontalScroller = findHorizontalScroller(target)
  if (!horizontalScroller) {
    target.scrollIntoView({ block: 'start', behavior: 'auto' })
  } else {
    const targetRect = target.getBoundingClientRect()
    const scrollerRect = horizontalScroller.getBoundingClientRect()
    const isHorizontallyVisible = targetRect.left >= scrollerRect.left && targetRect.right <= scrollerRect.right
    if (isHorizontallyVisible) scrollTargetVertically(target)
    else target.scrollIntoView({ block: 'start', inline: 'start', behavior: 'auto' })
  }
  hashScrolled = true
  restoreInitialHash()
}

onMounted(() => {
  initTheme()
})
watch(pageLoadState, async (state) => {
  if (state !== 'ready') return
  await nextTick()
  scrollToHashTarget()
}, { immediate: true })

async function loadPage() {
  if (!pageLoader) throw new Error('Page loader is unavailable')
  try {
    return await retryAsync(pageLoader, { retries: 2, delayMs: 160 })
  } catch (error) {
    pageLoadState.value = 'error'
    throw error
  }
}

async function handlePageResolved() {
  if (pageLoadState.value !== 'loading') return
  await nextTick()
  scrollToHashTarget()
  pageLoadState.value = 'ready'
}

const isHome = page === 'home'
const isError = !page
const meta = computed(() => page ? getLocalizedPageMeta(locale.value, page) : messages.value.page.home)

const kicker = computed(() => (isError ? messages.value.error404.kicker : meta.value.kicker))
const heroTitle = computed(() => (isError ? messages.value.error404.title : meta.value.title))
const heroCopy = computed(() => (isError ? messages.value.error404.copy : meta.value.copy))
const heroCredit = computed(() => (isError || !page ? null : getLocalizedPageMeta(locale.value, page).credit || null))

const currentPage = pageLoader
  ? defineAsyncComponent({
      loader: loadPage,
      errorComponent: PageLoadError,
      delay: 0
    })
  : NotFoundPage
const pageSections = computed(() => page ? getLocalizedSections(locale.value, page) : [])

function handleLightbox(data: LightboxPayload) { lightbox.value = data }
function closeLightbox() { lightbox.value = null }
function moveLightbox(step: number) {
  if (!lightbox.value) return
  const total = lightbox.value.images.length
  lightbox.value.index = (lightbox.value.index + step + total) % total
}
</script>

<template>
  <div class="site-shell" :class="{ 'has-page-compass': pageSections.length >= 2 }" :data-page-load-state="pageLoadState">
    <a class="skip-link" href="#main">{{ messages.accessibility.skipToMain }}</a>
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="grain"></div>

    <aside class="page-tools" :aria-label="messages.compass.label">
      <PageCompass v-if="pageLoadState === 'ready' && pageSections.length >= 2" :sections="pageSections" />
    </aside>

    <SiteHeader :page="page" />

    <main id="main">
      <HomeHero
        v-if="isHome"
        :kicker="kicker"
        :copy="heroCopy"
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

      <Suspense @resolve="handlePageResolved">
        <component :is="currentPage" @open-lightbox="handleLightbox" />
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
