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

const upcomingConcerts = computed(() => concertState.value.upcoming)
const attendedConcerts = computed(() => [...concertState.value.attended].sort((a, b) => b.date.localeCompare(a.date)))

function forwardLightbox(payload: LightboxPayload) {
  emit('open-lightbox', payload)
}

function formatNextDate(date: string) {
  return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`))
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

      <div v-if="upcomingConcerts.length" class="next-up" aria-labelledby="next-up-title" v-reveal>
        <div class="next-up-head">
          <span id="next-up-title" class="next-up-label">{{ section.nextUp }}</span>
          <span class="next-up-note">{{ section.realTime }}</span>
        </div>
        <div class="next-up-list">
          <div
            v-for="item in upcomingConcerts"
            :key="item.id"
            class="next-up-card"
            :data-concert-id="item.id"
          >
            <time :datetime="item.date">{{ formatNextDate(item.date) }}</time>
            <span>
              <strong>{{ item.artist }}</strong>
              <small>{{ item.tour }} · {{ item.venue }}</small>
            </span>
          </div>
        </div>
      </div>
    </section>

    <AlbumWall />

    <section id="concert-archive" class="content concert-group">
      <div class="group-header" v-reveal>
        <span class="group-year">LIVE</span>
        <p class="group-mood">{{ section.archive }}</p>
        <span class="group-count">{{ attendedConcerts.length }} {{ section.showUnit }}</span>
      </div>
      <ConcertArchiveRail :concerts="attendedConcerts" :section="section" @open-lightbox="forwardLightbox" />
    </section>
  </div>
</template>
