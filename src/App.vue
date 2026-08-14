<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, type Component } from 'vue'
import { isPageKey, navItems, pageMeta, pageRegistry } from './data'
import { useTheme } from './composables/useTheme'
import { createAsyncPage, decodeHashTarget } from './utils/navigation'

import SiteHeader from './components/SiteHeader.vue'
import ArchiveHero from './components/ArchiveHero.vue'
import HomeHero from './components/HomeHero.vue'
import SiteFooter from './components/SiteFooter.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import PageCompass from './components/PageCompass.vue'

import NotFoundPage from './pages/NotFoundPage.vue'

import type { LightboxPayload } from './data/types'

const rawPage = document.body.dataset.page
const page = isPageKey(rawPage) ? rawPage : undefined
const { theme, initTheme } = useTheme()

const lightbox = ref<LightboxPayload | null>(null)
let hashScrolled = false
let hashObserver: MutationObserver | null = null
let hashTimeout: number | undefined

function scrollToHashTarget() {
  if (hashScrolled || !window.location.hash) return
  const id = decodeHashTarget(window.location.hash)
  if (!id) return
  const scroll = () => {
    const target = document.getElementById(id)
    if (!target) return false
    target.scrollIntoView({ block: 'start' })
    hashScrolled = true
    hashObserver?.disconnect()
    hashObserver = null
    return true
  }
  if (scroll()) return
  hashObserver = new MutationObserver(scroll)
  hashObserver.observe(document.querySelector('#main') || document.body, { childList: true, subtree: true })
  hashTimeout = window.setTimeout(() => {
    hashObserver?.disconnect()
    hashObserver = null
  }, 5000)
}

onMounted(() => {
  initTheme()
  scrollToHashTarget()
})
onUnmounted(() => {
  hashObserver?.disconnect()
  if (hashTimeout) window.clearTimeout(hashTimeout)
})

const currentNav = computed(() => page ? navItems.find((item) => item.key === page) : undefined)
const isHome = page === 'home'
const isError = !currentNav.value
const meta = computed(() => pageMeta[currentNav.value?.key || 'home'])

const kicker = computed(() => (isError ? '404 / NOT FOUND' : meta.value.kicker))
const heroTitle = computed(() => (isError ? '这一页走丢了' : meta.value.title))
const heroCopy = computed(() => (isError ? '返回首页，重新选择一个方向。' : meta.value.copy))
const heroCredit = computed(() => (isError ? null : meta.value.credit || null))

const pageModules = import.meta.glob<{ default: Component }>('./pages/*Page.vue')
const pageLoader = page && !isError ? pageModules[pageRegistry[page].module] : undefined
const pageReady = ref(!pageLoader)
const currentPage = pageLoader
  ? createAsyncPage(async () => {
      try {
        return await pageLoader()
      } finally {
        pageReady.value = true
      }
    })
  : NotFoundPage
const pageSections = computed(() => page ? pageRegistry[page].sections : [])

function handleLightbox(data: LightboxPayload) { lightbox.value = data }
function closeLightbox() { lightbox.value = null }
function moveLightbox(step: number) {
  if (!lightbox.value) return
  const total = lightbox.value.images.length
  lightbox.value.index = (lightbox.value.index + step + total) % total
}
</script>

<template>
  <div class="site-shell" :class="[`theme-${theme}`, { 'has-page-compass': pageSections.length }]">
    <a class="skip-link" href="#main">跳到主要内容</a>
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="grain"></div>

    <aside class="page-tools" aria-label="页面阅读工具">
      <PageCompass v-if="pageSections.length" :sections="pageSections" />
    </aside>

    <SiteHeader :page="page ?? rawPage" />

    <main id="main">
      <HomeHero
        v-if="isHome"
        :kicker="kicker"
        :copy="heroCopy"
      />

      <ArchiveHero
        v-else
        :page="page ?? rawPage ?? '404'"
        :error="isError"
        :kicker="kicker"
        :title="heroTitle"
        :copy="heroCopy"
        :credit="heroCredit"
      />

      <component :is="currentPage" @open-lightbox="handleLightbox" />
    </main>

    <SiteFooter v-if="pageReady" />

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
