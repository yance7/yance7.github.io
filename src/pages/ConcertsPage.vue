<script setup>
import { ref, computed } from 'vue'
import { concerts, concertGroups, concertMoods, concertStats, upcomingConcerts, isConcertUpcoming } from '../data'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
import { originalImageUrl, thumbnailUrl } from '../utils/concertMedia'

const emit = defineEmits(['open-lightbox'])

const carouselIndexes = ref({})
const preloaded = new Set()

const venueCount = computed(() => new Set(concerts.map((c) => c.venue)).size)
const artistCount = computed(() => concertStats.artistCount)
const posterCount = computed(() => concertStats.posterCount)

const concertMetrics = [
  { value: String(concertStats.attended), label: '已赴约', note: `${concertStats.upcoming} 待相见` },
  { value: String(venueCount.value), label: '场馆', note: concertStats.venues },
  { value: `${artistCount.value}+`, label: '艺人', note: `${posterCount.value} 张海报` }
]

const sortedYears = computed(() => Object.keys(concertGroups).sort())

function formatConcertDate(date) { return date.replaceAll('-', '.') }
function formatNextDate(date) {
  const [, month, day] = date.split('-')
  const monthLabel = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(month) - 1]
  return `${monthLabel} ${day}`
}
function currentImageName(item, fallbackIndex = 0) {
  const index = carouselIndexes.value[item.id] ?? fallbackIndex
  return item.images[index]
}
function moveCarousel(item, step) {
  const current = carouselIndexes.value[item.id] || 0
  const next = (current + step + item.images.length) % item.images.length
  carouselIndexes.value = { ...carouselIndexes.value, [item.id]: next }
}
function openLightbox(item, index = 0) {
  emit('open-lightbox', {
    images: item.images.map(originalImageUrl),
    index,
    meta: { artist: item.artist, tour: item.tour }
  })
}

/* 悬停时预载海报，点击打开灯箱时无需等待网络 */
function preloadItem(item) {
  const src = originalImageUrl(currentImageName(item))
  if (preloaded.has(src)) return
  preloaded.add(src)
  const img = new Image()
  img.src = src
  img.decoding = 'async'
}

function tiltPoster(e) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width - 0.5
  const py = (e.clientY - rect.top) / rect.height - 0.5
  el.style.setProperty('--rx', `${(-py * 2.5).toFixed(2)}deg`)
  el.style.setProperty('--ry', `${(px * 3).toFixed(2)}deg`)
}

function resetPoster(e) {
  const el = e.currentTarget
  el.style.removeProperty('--rx')
  el.style.removeProperty('--ry')
}
</script>

<template>
  <div class="page-concerts">
    <section class="content">
      <SectionHeading
        no="01"
        label="LIVE ARCHIVE"
        title="现场是"
        accent="另一种记忆。"
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

    <!-- 按年份分组 -->
    <section
      v-for="year in sortedYears"
      :key="year"
      class="content concert-group"
    >
      <div class="group-header" v-reveal>
        <span class="group-year">{{ year }}</span>
        <p class="group-mood">{{ concertMoods[year] || '' }}</p>
        <span class="group-count">{{ concertGroups[year].length }} 场</span>
      </div>

      <div class="concert-list">
        <article
          v-for="item in concertGroups[year]"
          :key="item.id"
          :id="`concert-${item.id}`"
          class="concert-row"
          :class="{ upcoming: isConcertUpcoming(item) }"
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
            @mousemove="tiltPoster"
            @mouseleave="resetPoster"
          >
            <button
              class="poster-open"
              type="button"
              :aria-label="`打开 ${item.artist} ${item.tour} 海报档案`"
              @click="openLightbox(item, carouselIndexes[item.id] || 0)"
            >
              <picture>
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
              <span class="poster-hint" aria-hidden="true">
                <span>打开档案</span><b>↗</b>
              </span>
            </button>
            <div v-if="item.images.length > 1" class="carousel-controls">
              <button type="button" aria-label="上一张" @click.stop="moveCarousel(item, -1)">←</button>
              <span>{{ (carouselIndexes[item.id] || 0) + 1 }} / {{ item.images.length }}</span>
              <button type="button" aria-label="下一张" @click.stop="moveCarousel(item, 1)">→</button>
            </div>
          </div>
          <div class="concert-info">
            <span class="concert-status" :class="{ upcoming: isConcertUpcoming(item) }">
              {{ isConcertUpcoming(item) ? 'UPCOMING · 待相见' : 'ATTENDED · 已赴约' }}
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
