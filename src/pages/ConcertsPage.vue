<script setup lang="ts">
import { reactive } from 'vue'
import { concertGroups, getConcertState, isConcertUpcoming } from '../data'
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

const concertState = getConcertState(new Date())
const venueCount = concertState.venueCount
const artistCount = concertState.stats.artistCount
const posterCount = concertState.stats.posterCount

const concertMetrics = [
  { value: String(concertState.stats.attended), label: '已赴约', note: `${concertState.stats.upcoming} 待相见` },
  { value: String(venueCount), label: '场馆', note: concertState.stats.venues },
  { value: `${artistCount}+`, label: '艺人', note: `${posterCount} 张海报` },
  { value: String(concertState.stats.total), label: '总现场', note: '已记录的演出' }
]

const sortedYears = Object.keys(concertGroups).sort()
const upcomingConcerts = concertState.upcoming
const concertMoods = concertState.moods

function formatConcertDate(date: string) { return date.replaceAll('-', '.') }
function formatNextDate(date: string) {
  const [, month, day] = date.split('-')
  const monthLabel = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(month) - 1] ?? '---'
  return `${monthLabel} ${day}`
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

</script>

<template>
  <div class="page-concerts">
    <section id="concerts-overview" class="content">
      <SectionHeading
        no="01"
        label="LIVE ARCHIVE"
        title="现场是"
        accent="另一种记忆"
        copy="点击海报进入全屏档案。每张图都保留原始比例，轮播记录同一场演出的不同视觉。"
      />

      <MetricStrip :metrics="concertMetrics" />

      <div v-if="upcomingConcerts.length" class="next-up" aria-labelledby="next-up-title" v-reveal>
        <div class="next-up-head">
          <span id="next-up-title" class="next-up-label">NEXT UP</span>
          <span class="next-up-note">现实时间</span>
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

    <!-- 按年份分组 -->
    <section
      v-for="(year, yearIndex) in sortedYears"
      :key="year"
      :id="yearIndex === 0 ? 'concert-archive' : undefined"
      class="content concert-group"
    >
      <div class="group-header" v-reveal>
        <span class="group-year">{{ year }}</span>
        <p class="group-mood">{{ concertMoods[year as keyof typeof concertMoods] || '' }}</p>
        <span class="group-count">{{ concertGroups[year]?.length ?? 0 }} 场</span>
      </div>

      <div class="concert-list">
        <article
          v-for="item in concertGroups[year] ?? []"
          :key="item.id"
          :id="`concert-${item.id}`"
          class="concert-row"
          :class="{ upcoming: isConcertUpcoming(item, concertState.now) }"
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
              :aria-label="`打开 ${item.artist} ${item.tour} 海报档案`"
              @click="openLightbox(item, carouselIndexes[item.id] || 0, $event)"
            >
                <Transition name="poster-fade" mode="out-in">
                  <picture :key="currentImageName(item)">
                    <source :srcset="thumbnailUrl(currentImageName(item))" type="image/webp">
                    <img
                      :src="originalImageUrl(currentImageName(item))"
                      :alt="`${item.artist} ${item.tour} 海报`"
                      :width="item.land ? 640 : 480"
                      :height="item.land ? 360 : 640"
                      loading="lazy"
                      decoding="async"
                    >
                  </picture>
                </Transition>
              <span class="poster-hint" aria-hidden="true">
                <span>打开档案</span><b>＋</b>
              </span>
            </button>
            <div v-if="item.images.length > 1" class="carousel-controls">
              <button type="button" aria-label="上一张" @click.stop="moveCarousel(item, -1)">←</button>
              <span>{{ (carouselIndexes[item.id] || 0) + 1 }} / {{ item.images.length }}</span>
              <button type="button" aria-label="下一张" @click.stop="moveCarousel(item, 1)">→</button>
            </div>
          </div>
          <div class="concert-info">
            <span class="concert-status" :class="{ upcoming: isConcertUpcoming(item, concertState.now) }">
              {{ isConcertUpcoming(item, concertState.now) ? 'UPCOMING · 待相见' : 'ATTENDED · 已赴约' }}
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
