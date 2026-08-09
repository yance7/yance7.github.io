<script setup>
import { computed } from 'vue'
import { heroGeo } from '../data'

const props = defineProps({
  page: { type: String, required: true },
  no: { type: String, default: '00' },
  total: { type: Number, default: 6 },
  error: { type: Boolean, default: false },
  kicker: { type: String, default: '' },
  title: { type: String, default: '' },
  copy: { type: String, default: '' },
  credit: { type: Object, default: null },
  isHome: { type: Boolean, default: false }
})

const coordsLabel = computed(() =>
  props.error ? 'ARCHIVE / ERROR' : `ARCHIVE ${props.no} / ${props.total}`
)
const geo = computed(() => (props.error ? '—' : heroGeo[props.page] || '—'))
const lyricChars = computed(() => props.title.split(''))
const accessibleTitle = computed(() =>
  props.error ? props.title : `「${props.title}」`
)
</script>

<template>
  <section class="archive-hero" :class="{ 'hero-home': isHome }">
    <div class="hero-inner">
      <div class="hero-main">
        <p class="hero-kicker" v-reveal>{{ kicker }}</p>
        <h1 v-if="isHome" class="hero-name" v-reveal="{ delay: 90 }">Yance<span>.</span></h1>
        <h1
          v-else
          class="hero-title hero-lyric"
          :class="{ 'hero-works-title': page === 'works' }"
          :aria-label="accessibleTitle"
        >
          <template v-for="(ch, i) in lyricChars" :key="`${ch}-${i}`">
            <span
              class="lyric-char"
              :style="{ '--ci': i }"
              aria-hidden="true"
            >{{ ch }}</span>
          </template>
        </h1>
        <p class="hero-copy" v-reveal="{ delay: 180 }">{{ copy }}</p>
        <p v-if="credit && !isHome" class="lyric-credit" v-reveal="{ delay: 270 }">
          <b>{{ credit.artist }}</b>
          <i aria-hidden="true">/</i>
          <span>「{{ credit.song }}」</span>
          <i aria-hidden="true">/</i>
          <span v-if="credit.album" class="lc-album">《{{ credit.album }}》</span>
          <span v-else class="lc-album">单曲</span>
        </p>
        <div class="hero-line" v-reveal="{ delay: 300 }"><span></span></div>
      </div>

      <aside v-if="isHome" class="hero-side" aria-hidden="true">
        <div class="archive-coords">
          <span class="coords-label">{{ coordsLabel }}</span>
          <span class="coords-geo">{{ geo }}</span>
        </div>
        <div v-if="isHome" class="hero-scroll"><span></span>SCROLL</div>
      </aside>
    </div>
  </section>
</template>
