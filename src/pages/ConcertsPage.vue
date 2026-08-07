<script setup>
import { ref, computed } from 'vue'
import { concerts, concertGroups, concertMoods, concertStats } from '../data/content'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'

const emit = defineEmits(['open-lightbox'])

const carouselIndexes = ref({})
const preloaded = new Set()

const venueCount = computed(() => new Set(concerts.map((c) => c.venue)).size)
const artistCount = computed(() => concertStats.artistCount)
const posterCount = computed(() => concertStats.posterCount)

const concertMetrics = [
  { value: String(concertStats.total), label: '现场', note: concertStats.yearRange },
  { value: String(venueCount.value), label: '场馆', note: concertStats.venues },
  { value: `${artistCount.value}+`, label: '艺人', note: `${posterCount.value} 张海报` }
]

const sortedYears = computed(() => Object.keys(concertGroups).sort())

function imagePath(name) { return `assets/concerts/${name}` }
function currentImage(item, index) {
  return imagePath(item.images[carouselIndexes.value[item.date] || index || 0])
}
function moveCarousel(item, step) {
  const current = carouselIndexes.value[item.date] || 0
  const next = (current + step + item.images.length) % item.images.length
  carouselIndexes.value = { ...carouselIndexes.value, [item.date]: next }
}
function openLightbox(item, index = 0) {
  emit('open-lightbox', {
    images: item.images.map(imagePath),
    index,
    meta: { artist: item.artist, tour: item.tour }
  })
}

/* 悬停时预载海报，点击打开灯箱时无需等待网络 */
function preloadItem(item) {
  for (const name of item.images) {
    const src = imagePath(name)
    if (preloaded.has(src)) continue
    preloaded.add(src)
    const img = new Image()
    img.src = src
    img.decoding = 'async'
  }
}

function tiltPoster(e) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width - 0.5
  const py = (e.clientY - rect.top) / rect.height - 0.5
  el.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`)
  el.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`)
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
          :key="item.date"
          class="concert-row"
          v-reveal
          @mouseenter="preloadItem(item)"
        >
          <div class="concert-date">{{ item.date }}<span></span></div>
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
              @click="openLightbox(item, carouselIndexes[item.date] || 0)"
            >
              <img
                :src="currentImage(item, 0)"
                :alt="`${item.artist} ${item.tour} 海报`"
                loading="lazy"
                decoding="async"
              >
              <span class="poster-hint" aria-hidden="true">
                <span>打开档案</span><b>↗</b>
              </span>
            </button>
            <div v-if="item.images.length > 1" class="carousel-controls">
              <button type="button" aria-label="上一张" @click.stop="moveCarousel(item, -1)">←</button>
              <span>{{ (carouselIndexes[item.date] || 0) + 1 }} / {{ item.images.length }}</span>
              <button type="button" aria-label="下一张" @click.stop="moveCarousel(item, 1)">→</button>
            </div>
          </div>
          <div class="concert-info">
            <span>{{ item.venue }}</span>
            <h3>{{ item.artist }}</h3>
            <p>{{ item.tour }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
