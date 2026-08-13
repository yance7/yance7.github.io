<script setup lang="ts">
import { computed } from 'vue'

interface HeroCredit {
  artist: string
  song: string
  album?: string
}

const props = withDefaults(defineProps<{
  page: string
  error?: boolean
  kicker?: string
  title?: string
  copy?: string
  credit?: HeroCredit | null
}>(), {
  error: false,
  kicker: '',
  title: '',
  copy: '',
  credit: null
})
const lyricChars = computed(() => props.title.split(''))
const accessibleTitle = computed(() =>
  props.error ? props.title : `「${props.title}」`
)
</script>

<template>
  <section class="archive-hero">
    <div class="hero-inner">
      <div class="hero-main">
        <p class="hero-kicker" v-reveal>{{ kicker }}</p>
        <h1
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
        <p v-if="credit" class="lyric-credit" v-reveal="{ delay: 270 }">
          <b>{{ credit.artist }}</b>
          <i aria-hidden="true">/</i>
          <span>「{{ credit.song }}」</span>
          <i aria-hidden="true">/</i>
          <span v-if="credit.album" class="lc-album">《{{ credit.album }}》</span>
          <span v-else class="lc-album">单曲</span>
        </p>
        <div class="hero-line" v-reveal="{ delay: 300 }"><span></span></div>
      </div>
    </div>
  </section>
</template>
