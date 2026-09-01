<script setup lang="ts">
import { computed } from 'vue'
import type { HeroCredit } from '../data/types'
import { splitLyricTokens } from '../utils/typography'
import { useLocale } from '../i18n'

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
const { locale, messages } = useLocale()
const lyricTokens = computed(() => splitLyricTokens(props.title, locale.value))
const accessibleTitle = computed(() =>
  props.error || locale.value === 'en' ? props.title : `「${props.title}」`
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
          <template v-for="(token, tokenIndex) in lyricTokens" :key="`${token.type}-${token.text}-${tokenIndex}`">
            <span v-if="token.type === 'space'" class="lyric-space" aria-hidden="true"></span>
            <span v-else-if="token.type === 'word'" class="lyric-word" aria-hidden="true">
              <span
                v-for="(ch, charIndex) in token.text"
                :key="`${ch}-${charIndex}`"
                class="lyric-char"
                :style="{ '--ci': token.animationStart + charIndex }"
              >{{ ch }}</span>
            </span>
            <span
              v-else
              class="lyric-char"
              :style="{ '--ci': token.animationStart }"
              aria-hidden="true"
            >{{ token.text }}</span>
          </template>
        </h1>
        <p class="hero-copy">{{ copy }}</p>
        <p v-if="credit" class="lyric-credit" v-reveal="{ delay: 240 }">
          <b>{{ credit.artist }}</b>
          <i aria-hidden="true">/</i>
          <span>「{{ credit.song }}」</span>
          <i aria-hidden="true">/</i>
          <span v-if="credit.album" class="lc-album">《{{ credit.album }}》</span>
          <span v-else class="lc-album">{{ messages.common.single }}</span>
        </p>
        <div class="hero-line" v-reveal="{ delay: 240 }"><span></span></div>
      </div>
    </div>
  </section>
</template>
