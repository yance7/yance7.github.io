<script setup lang="ts">
import '../styles/concerts.css'
import { computed } from 'vue'
import { getLocalizedConcertSection, getLocalizedConcertState } from '../data/locales'
import { useLocale } from '../i18n'
import type { LightboxPayload } from '../data/types'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
import AlbumWall from '../components/AlbumWall.vue'
import ConcertArchiveRail from '../components/ConcertArchiveRail.vue'

const emit = defineEmits<{
  'open-lightbox': [payload: LightboxPayload]
}>()

const { locale } = useLocale()
const concertState = computed(() => getLocalizedConcertState(locale.value, new Date()))
const section = computed(() => getLocalizedConcertSection(locale.value))
const venueCount = computed(() => concertState.value.venueCount)
const artistCount = computed(() => concertState.value.stats.artistCount)
const posterCount = computed(() => concertState.value.stats.posterCount)

const concertMetrics = computed(() => [
  { value: String(concertState.value.stats.attended), label: section.value.attended, note: `${concertState.value.stats.upcoming} ${section.value.upcoming}` },
  { value: String(venueCount.value), label: section.value.venues, note: concertState.value.stats.venues },
  { value: `${artistCount.value}+`, label: section.value.artists, note: `${posterCount.value} ${section.value.posters}` },
  { value: String(concertState.value.stats.total), label: section.value.total, note: section.value.recorded }
])

const archiveConcerts = computed(() => concertState.value.archive)

function forwardLightbox(payload: LightboxPayload) {
  emit('open-lightbox', payload)
}

</script>

<template>
  <div class="page-concerts">
    <section id="concerts-overview" class="content">
      <SectionHeading
        no="01"
        :label="section.label"
        :title="section.title"
        :accent="section.accent"
        :copy="section.copy"
      />

      <MetricStrip :metrics="concertMetrics" />
    </section>

    <section id="concert-archive" class="content concert-group">
      <div class="group-header" v-reveal>
        <span class="group-year">LIVE</span>
        <p class="group-mood">{{ section.archive }}</p>
        <span class="group-count">{{ archiveConcerts.length }} {{ section.showUnit }}</span>
      </div>
      <ConcertArchiveRail :concerts="archiveConcerts" :now="concertState.now" :section="section" @open-lightbox="forwardLightbox" />
    </section>

    <AlbumWall />
  </div>
</template>
