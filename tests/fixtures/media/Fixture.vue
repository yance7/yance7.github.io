<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ConcertArchiveRail from '../../../src/components/ConcertArchiveRail.vue'
import ConcertPoster from '../../../src/components/ConcertPoster.vue'
import ImageLightbox from '../../../src/components/ImageLightbox.vue'
import WorksPage from '../../../src/pages/WorksPage.vue'
import HonorsPage from '../../../src/pages/HonorsPage.vue'
import ConcertsPage from '../../../src/pages/ConcertsPage.vue'
import HomePage from '../../../src/pages/HomePage.vue'
import { getLocalizedConcertSection, getLocalizedConcerts } from '../../../src/data/locales/index'
import { useLocale } from '../../../src/i18n'
import type { LightboxPayload, NonEmptyArray } from '../../../src/data/types'
import '../../../src/styles/concerts.css'

const parameters = new URLSearchParams(location.search)
const view = parameters.get('view') ?? 'rail'
const { locale } = useLocale()
const now = new Date('2026-10-22T12:00:00+08:00')
const section = computed(() => getLocalizedConcertSection(locale.value))
const count = ref(Number(parameters.get('count') ?? 16))
const railConcerts = computed(() => getLocalizedConcerts(locale.value).slice(0, count.value))
const posterIndex = ref(0)
const posterShown = ref(true)
const selectedPoster = computed(() => getLocalizedConcerts(locale.value)[posterIndex.value]!)
const lightbox = ref<LightboxPayload | null>(view === 'lightbox' ? { images: ['/assets/concerts/fixture-first.jpg', '/assets/concerts/fixture-second.jpg'] as NonEmptyArray<string>, index: 0, meta: { artist: 'Fixture artist', tour: 'Fixture tour' } } : null)
const views = { works: WorksPage, honors: HonorsPage, concerts: ConcertsPage, home: HomePage }
const selectedPage = views[view as keyof typeof views]
function moveImage(direction: number) {
  if (lightbox.value) lightbox.value.index = (lightbox.value.index + direction + lightbox.value.images.length) % lightbox.value.images.length
}
onMounted(() => { document.documentElement.dataset.fixtureReady = 'true' })
</script>

<template>
  <main class="site-shell">
    <h1>Media behavior fixture</h1>
    <button v-if="view === 'rail'" type="button" @click="count = 3">Keep three shows</button>
    <ConcertArchiveRail v-if="view === 'rail'" :concerts="railConcerts" :now="now" :section="section" @open-lightbox="lightbox = $event" />
    <template v-else-if="view === 'poster'">
      <button type="button" @click="posterIndex = 1 - posterIndex">Change poster</button>
      <button type="button" @click="posterShown = !posterShown">Toggle poster</button>
      <div style="width: 300px; max-width: 100%">
        <ConcertPoster v-if="posterShown" :poster="selectedPoster.poster" :artist="selectedPoster.artist" :tour="selectedPoster.tour" open-label="Open fixture poster" hint="Open poster" />
      </div>
    </template>
    <component :is="selectedPage" v-else-if="selectedPage" @open-lightbox="lightbox = $event" />
  </main>
  <ImageLightbox v-if="lightbox" :images="lightbox.images" :index="lightbox.index" :meta="lightbox.meta" @close="lightbox = null" @prev="moveImage(-1)" @next="moveImage(1)" />
</template>
