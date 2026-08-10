<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: String, required: true },
  error: { type: Boolean, default: false },
  kicker: { type: String, default: '' },
  title: { type: String, default: '' },
  copy: { type: String, default: '' },
  credit: { type: Object, default: null }
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
