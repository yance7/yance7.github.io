<script setup>
import { computed } from 'vue'
import { heroGeo, homeSignals } from '../data'
import LyricCarousel from './LyricCarousel.vue'

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
        <LyricCarousel v-if="isHome" />
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
        <p v-if="isHome" class="hero-copy">{{ copy }}</p>
        <p v-else class="hero-copy" v-reveal="{ delay: 180 }">{{ copy }}</p>
        <nav v-if="isHome" class="home-hero-actions" aria-label="首页快速入口">
          <a class="hero-action primary" href="#selected-work">查看精选内容 <span aria-hidden="true">↓</span></a>
          <a class="hero-action secondary" href="research.html">从研究开始 <span aria-hidden="true">↗</span></a>
        </nav>
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

      <aside v-if="isHome" class="hero-side home-signal-board" aria-label="档案快速索引">
        <div class="home-signal-head">
          <span>LIVE INDEX</span>
          <span class="home-signal-online"><i aria-hidden="true"></i> ONLINE</span>
        </div>
        <a v-for="signal in homeSignals" :key="signal.label" class="home-signal" :href="signal.href">
          <span>{{ signal.label }}</span>
          <strong>{{ signal.value }}</strong>
          <small>{{ signal.meta }}</small>
          <i aria-hidden="true">↗</i>
        </a>
        <div class="archive-coords">
          <span class="coords-label">{{ coordsLabel }}</span>
          <span class="coords-geo">{{ geo }}</span>
        </div>
      </aside>
    </div>
  </section>
</template>
