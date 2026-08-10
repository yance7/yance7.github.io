<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { navItems, pageMeta } from './data'
import { useTheme } from './composables/useTheme'
import { useMusicNotes } from './composables/useMusicNotes'

import SiteHeader from './components/SiteHeader.vue'
import ArchiveHero from './components/ArchiveHero.vue'
import SiteFooter from './components/SiteFooter.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import ScrollProgress from './components/ScrollProgress.vue'

import NotFoundPage from './pages/NotFoundPage.vue'

interface LightboxMeta {
  artist: string
  tour: string
}

interface LightboxPayload {
  images: string[]
  index: number
  meta?: LightboxMeta | null
}

const page = document.body.dataset.page || 'home'
const { theme, initTheme } = useTheme()

const lightbox = ref<LightboxPayload | null>(null)
let hashScrolled = false
let hashObserver: MutationObserver | null = null

function scrollToHashTarget() {
  if (hashScrolled || !window.location.hash) return
  const id = decodeURIComponent(window.location.hash.slice(1))
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
}

onMounted(() => {
  initTheme()
  scrollToHashTarget()
})
onUnmounted(() => hashObserver?.disconnect())
useMusicNotes()

const currentNav = computed(() => navItems.find((item) => item.key === page))
const pageNo = computed(() => (currentNav.value ? navItems.indexOf(currentNav.value) + 1 : 0))
const archiveNo = computed(() => String(pageNo.value).padStart(2, '0'))
const isHome = page === 'home'
const isError = !currentNav.value
const meta = computed(() => pageMeta[currentNav.value?.key || 'home'])

const kicker = computed(() => (isError ? '404 / NOT FOUND' : meta.value.kicker))
const heroTitle = computed(() => (isError ? '这一页走丢了' : meta.value.title))
const heroCopy = computed(() => (isError ? '返回首页，重新选择一个方向。' : meta.value.copy))
const heroCredit = computed(() => (isError ? null : meta.value.credit || null))

const pageMap = {
  home: defineAsyncComponent(() => import('./pages/HomePage.vue')),
  academics: defineAsyncComponent(() => import('./pages/AcademicsPage.vue')),
  honors: defineAsyncComponent(() => import('./pages/HonorsPage.vue')),
  research: defineAsyncComponent(() => import('./pages/ResearchPage.vue')),
  works: defineAsyncComponent(() => import('./pages/WorksPage.vue')),
  concerts: defineAsyncComponent(() => import('./pages/ConcertsPage.vue'))
}
const currentPage = computed(() => (isError ? NotFoundPage : pageMap[page as keyof typeof pageMap] || NotFoundPage))

function handleLightbox(data: LightboxPayload) { lightbox.value = data }
function closeLightbox() { lightbox.value = null }
function moveLightbox(step: number) {
  if (!lightbox.value) return
  const total = lightbox.value.images.length
  lightbox.value.index = (lightbox.value.index + step + total) % total
}
</script>

<template>
  <div class="site-shell" :class="`theme-${theme}`">
    <a class="skip-link" href="#main">跳到主要内容</a>
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="grain"></div>

    <aside class="page-tools" aria-label="页面阅读工具">
      <ScrollProgress />
    </aside>

    <SiteHeader :page="page" />

    <main id="main">
      <ArchiveHero
        :page="page"
        :no="archiveNo"
        :total="6"
        :error="isError"
        :is-home="isHome"
        :kicker="kicker"
        :title="heroTitle"
        :copy="heroCopy"
        :credit="heroCredit"
      />

      <component :is="currentPage" @open-lightbox="handleLightbox" />
    </main>

    <SiteFooter />

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
