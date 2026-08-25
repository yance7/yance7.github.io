<script setup lang="ts">
import '../styles/concerts.css'
import { computed, reactive } from 'vue'
import { getLocalizedConcertGroups, getLocalizedConcertSection, getLocalizedConcertState } from '../data/locales'
import { localeRegistry, useLocale } from '../i18n'
import type { Concert, LightboxPayload } from '../data/types'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
import AlbumWall from '../components/AlbumWall.vue'
import { originalImageUrl, thumbnailUrl } from '../utils/concertMedia'
import { sharedImagePreloader } from '../utils/imagePreload'

const emit = defineEmits<{
  'open-lightbox': [payload: LightboxPayload]
}>()

const carouselIndexes = reactive<Record<string, number>>({})
const imagePreloader = sharedImagePreloader
const { locale, messages } = useLocale()
const concertState = computed(() => getLocalizedConcertState(locale.value, new Date()))
const concertGroups = computed(() => getLocalizedConcertGroups(locale.value))
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

const sortedYears = computed(() => Object.keys(concertGroups.value).sort())
const upcomingConcerts = computed(() => concertState.value.upcoming)
const concertMoods = computed(() => concertState.value.moods)

function formatConcertDate(date: string) { return date.replaceAll('-', '.') }
function formatNextDate(date: string) {
  return new Intl.DateTimeFormat(localeRegistry[locale.value].htmlLang, { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`))
}
function currentImageName(item: Concert, fallbackIndex = 0) {
  const index = carouselIndexes[item.id] ?? fallbackIndex
  return item.images[index] ?? item.images[0]
}
function moveCarousel(item: Concert, step: number) {
  const current = carouselIndexes[item.id] || 0
  const next = (current + step + item.images.length) % item.images.length
  carouselIndexes[item.id] = next
}
function openLightbox(item: Concert, index = 0, event?: MouseEvent) {
  if (event?.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  const [first, ...rest] = item.images.map(originalImageUrl)
  if (!first) return
  emit('open-lightbox', {
    images: [first, ...rest],
    index,
    meta: { artist: item.artist, tour: item.tour }
  })
}

/* 悬停时预载海报，点击打开灯箱时无需等待网络 */
function preloadItem(item: Concert) {
  const src = originalImageUrl(currentImageName(item))
  imagePreloader.preload(src)
}

function isUpcoming(item: Concert) {
  return item.date >= concertState.value.now.toISOString().slice(0, 10)
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
          <a
            v-for="item in upcomingConcerts"
            :key="item.id"
            class="next-up-card"
            :href="`#concert-${item.id}`"
          >
            <time :datetime="item.date">{{ formatNextDate(item.date) }}</time>
            <span>
              <strong>{{ item.artist }}</strong>
              <small>{{ item.tour }} · {{ item.venue }}</small>
            </span>
            <span aria-hidden="true">↘</span>
          </a>
        </div>
      </div>
    </section>

    <AlbumWall />

    <section
      v-for="(year, yearIndex) in sortedYears"
      :key="year"
      :id="yearIndex === 0 ? 'concert-archive' : undefined"
      class="content concert-group"
    >
      <div class="group-header" v-reveal>
        <span class="group-year">{{ year }}</span>
        <p class="group-mood">{{ concertMoods[year] || '' }}</p>
        <span class="group-count">{{ concertGroups[year]?.length ?? 0 }} {{ section.showUnit }}</span>
      </div>

      <div class="concert-list">
        <article
          v-for="item in concertGroups[year] ?? []"
          :key="item.id"
          :id="`concert-${item.id}`"
          class="concert-row"
          :class="{ upcoming: isUpcoming(item) }"
          v-reveal
          @mouseenter="preloadItem(item)"
          @focusin="preloadItem(item)"
        >
          <time class="concert-date" :datetime="item.date">
            {{ formatConcertDate(item.date) }}<span></span>
          </time>
          <div
            class="concert-poster"
            :class="{ land: item.land }"
            v-pointer-sheen="{ tilt: 6 }"
          >
            <button
              class="poster-open"
              type="button"
              :aria-label="`${messages.lightbox.openArchive}: ${item.artist} ${item.tour}`"
              @click="openLightbox(item, carouselIndexes[item.id] || 0, $event)"
            >
                <Transition name="poster-fade" mode="out-in">
                  <picture :key="currentImageName(item)">
                    <source :srcset="thumbnailUrl(currentImageName(item))" type="image/webp">
                    <img
                      :src="originalImageUrl(currentImageName(item))"
                      :alt="`${item.artist} ${item.tour} ${messages.lightbox.posterAlt}`"
                      :width="item.land ? 640 : 480"
                      :height="item.land ? 360 : 640"
                      loading="lazy"
                      decoding="async"
                    >
                  </picture>
                </Transition>
              <span class="poster-hint" aria-hidden="true">
                <span>{{ section.posterArchive }}</span><b>＋</b>
              </span>
            </button>
            <div v-if="item.images.length > 1" class="carousel-controls">
              <button type="button" :aria-label="messages.common.previous" @click.stop="moveCarousel(item, -1)">←</button>
              <span>{{ (carouselIndexes[item.id] || 0) + 1 }} / {{ item.images.length }}</span>
              <button type="button" :aria-label="messages.common.next" @click.stop="moveCarousel(item, 1)">→</button>
            </div>
          </div>
          <div class="concert-info">
            <span class="concert-status" :class="{ upcoming: isUpcoming(item) }">
              {{ isUpcoming(item) ? section.upcoming : section.attended }}
            </span>
            <span class="concert-venue">{{ item.venue }}</span>
            <h3>{{ item.artist }}</h3>
            <p>{{ item.tour }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
