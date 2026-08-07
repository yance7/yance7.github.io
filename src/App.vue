<script setup>
import { computed, ref, onMounted } from 'vue'
import { navItems, pageMeta } from './data/content'
import { useTheme } from './composables/useTheme'
import { useMusicNotes } from './composables/useMusicNotes'

import SiteHeader from './components/SiteHeader.vue'
import ArchiveHero from './components/ArchiveHero.vue'
import SiteFooter from './components/SiteFooter.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import ScrollProgress from './components/ScrollProgress.vue'

import HomePage from './pages/HomePage.vue'
import AcademicsPage from './pages/AcademicsPage.vue'
import HonorsPage from './pages/HonorsPage.vue'
import ResearchPage from './pages/ResearchPage.vue'
import WorksPage from './pages/WorksPage.vue'
import ConcertsPage from './pages/ConcertsPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'

const page = document.body.dataset.page || 'home'
const { theme, initTheme } = useTheme()

const lightbox = ref(null)

onMounted(initTheme)
useMusicNotes()

const currentNav = computed(() => navItems.find((item) => item.key === page))
const pageNo = computed(() => (currentNav.value ? navItems.indexOf(currentNav.value) + 1 : 0))
const archiveNo = computed(() => String(pageNo.value).padStart(2, '0'))
const isHome = page === 'home'
const isError = !currentNav.value

const kicker = computed(() => (isError ? '404 / NOT FOUND' : pageMeta[page][0]))
const heroTitle = computed(() => (isError ? '这一页走丢了' : pageMeta[page][1]))
const heroCopy = computed(() => (isError ? '返回首页，重新选择一个方向。' : pageMeta[page][2]))
const heroCredit = computed(() => (isError ? null : pageMeta[page][3] || null))

const pageMap = {
  home: HomePage,
  academics: AcademicsPage,
  honors: HonorsPage,
  research: ResearchPage,
  works: WorksPage,
  concerts: ConcertsPage
}
const currentPage = computed(() => (isError ? NotFoundPage : pageMap[page] || NotFoundPage))

function handleLightbox(data) { lightbox.value = data }
function closeLightbox() { lightbox.value = null }
function moveLightbox(step) {
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

    <ScrollProgress />

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
