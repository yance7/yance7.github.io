<script setup>
import { ref, computed } from 'vue'
import { concerts, concertGroups, concertMoods, concertStats } from '../data/content'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'

const emit = defineEmits(['open-lightbox'])

const carouselIndexes = ref({})
const randomConcert = ref(null)

const concertMetrics = [
  { value: String(concertStats.total), label: '现场', note: concertStats.yearRange },
  { value: '3', label: '场馆', note: concertStats.venues },
  { value: '9+', label: '艺人', note: concertStats.artists.slice(0, 20) + '...' }
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
function pickRandom() {
  const idx = Math.floor(Math.random() * concerts.length)
  const item = concerts[idx]
  randomConcert.value = item
  openLightbox(item, 0)
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

    <!-- 随机回忆 -->
    <section class="content">
      <div class="random-memory" v-reveal>
        <button class="btn-primary random-btn" type="button" @click="pickRandom">
          随机回忆 <span aria-hidden="true">↻</span>
        </button>
        <p>从 {{ concertStats.total }} 场现场中随机打开一段记忆。</p>
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
          :key="item.date"
          class="concert-row"
          v-reveal
        >
          <div class="concert-date">{{ item.date }}<span></span></div>
          <div class="concert-poster" :class="{ land: item.land }">
            <img
              :src="currentImage(item, 0)"
              :alt="`${item.artist} ${item.tour} 海报`"
              loading="lazy"
              decoding="async"
              @click="openLightbox(item, carouselIndexes[item.date] || 0)"
            >
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
