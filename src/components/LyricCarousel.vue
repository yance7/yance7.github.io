<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { homeLyrics } from '../data'

const ROTATION_MS = 6000

const root = ref<HTMLElement | null>(null)
const currentIndex = ref(0)
const manuallyPaused = ref(false)
const isHovered = ref(false)
const isFocusWithin = ref(false)
const isReducedMotion = ref(false)
const isDocumentHidden = ref(false)
const supportsHoverPause = ref(false)
const isMounted = ref(false)
let timer: number | null = null
let reducedMotionQuery: MediaQueryList | null = null

const activeLyric = computed(() => homeLyrics[currentIndex.value])
const total = homeLyrics.length
const canAutoAdvance = computed(() => (
  isMounted.value &&
  !manuallyPaused.value &&
  (!isHovered.value || !supportsHoverPause.value) &&
  !isFocusWithin.value &&
  !isReducedMotion.value &&
  !isDocumentHidden.value
))
const toggleLabel = computed(() => (
  isReducedMotion.value ? '播放轮播' : manuallyPaused.value ? '继续轮播' : '暂停轮播'
))
const stateLabel = computed(() => {
  if (isReducedMotion.value) return 'REDUCED MOTION'
  if (manuallyPaused.value || isHovered.value || isFocusWithin.value) return 'PAUSED'
  return 'AUTO / 06S'
})

function formatIndex(index: number) {
  return String(index + 1).padStart(2, '0')
}

function clearTimer() {
  if (timer === null) return
  window.clearTimeout(timer)
  timer = null
}

function scheduleTimer() {
  clearTimer()
  if (!canAutoAdvance.value || total < 2) return
  timer = window.setTimeout(() => {
    currentIndex.value = (currentIndex.value + 1) % total
    scheduleTimer()
  }, ROTATION_MS)
}

function syncTimer() {
  if (!isMounted.value) return
  scheduleTimer()
}

function goTo(index: number) {
  currentIndex.value = (index + total) % total
  syncTimer()
}

function move(step: number) {
  goTo(currentIndex.value + step)
}

function togglePaused() {
  if (isReducedMotion.value) return
  manuallyPaused.value = !manuallyPaused.value
  syncTimer()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'Home') {
    event.preventDefault()
    goTo(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    goTo(total - 1)
  } else if (event.key === ' ' && event.target === root.value) {
    event.preventDefault()
    togglePaused()
  }
}

function onFocusIn() {
  isFocusWithin.value = true
}

function onFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null
  if (!root.value?.contains(nextTarget)) isFocusWithin.value = false
}

function onVisibilityChange() {
  isDocumentHidden.value = document.hidden
  syncTimer()
}

function onPointerEnter() {
  if (supportsHoverPause.value) isHovered.value = true
}

function onPointerLeave() {
  if (supportsHoverPause.value) isHovered.value = false
}

function onReducedMotionChange(event: MediaQueryListEvent) {
  isReducedMotion.value = event.matches
  syncTimer()
}

onMounted(() => {
  isMounted.value = true
  supportsHoverPause.value = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  isReducedMotion.value = reducedMotionQuery.matches
  isDocumentHidden.value = document.hidden
  reducedMotionQuery.addEventListener('change', onReducedMotionChange)
  document.addEventListener('visibilitychange', onVisibilityChange)
  syncTimer()
})

onUnmounted(() => {
  clearTimer()
  reducedMotionQuery?.removeEventListener('change', onReducedMotionChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

watch([manuallyPaused, isHovered, isFocusWithin, isReducedMotion, isDocumentHidden], syncTimer)
</script>

<template>
  <section
    ref="root"
    class="lyric-carousel"
    :class="`tone-${activeLyric.accent}`"
    :data-index="currentIndex"
    role="region"
    aria-roledescription="carousel"
    aria-label="首页歌词轮播"
    aria-keyshortcuts="ArrowLeft ArrowRight Home End Space"
    tabindex="0"
    @keydown="onKeydown"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <div class="lyric-carousel-head">
      <div class="lyric-carousel-index">
        <span>SONG NOTES</span>
        <span>{{ formatIndex(currentIndex) }} / {{ formatIndex(total - 1) }}</span>
      </div>
      <span class="lyric-carousel-state">{{ stateLabel }}</span>
    </div>

    <div class="lyric-stage" aria-live="polite">
      <Transition name="lyric-fade" mode="out-in">
        <article
          :key="activeLyric.id"
          class="lyric-slide"
          :aria-label="`${activeLyric.artist} · ${activeLyric.song}`"
          aria-roledescription="slide"
        >
          <h1 class="lyric-quote">“{{ activeLyric.quote }}”</h1>
          <p class="lyric-carousel-credit">
            <strong class="lyric-artist">{{ activeLyric.artist }}</strong>
            <span aria-hidden="true">/</span>
            <span>《{{ activeLyric.song }}》</span>
          </p>
        </article>
      </Transition>
    </div>

    <div class="lyric-carousel-foot">
      <div class="lyric-controls" aria-label="歌词轮播控制">
        <button class="lyric-control" type="button" aria-label="上一句" @click="move(-1)">
          <span aria-hidden="true">←</span>
        </button>
        <button
          class="lyric-control lyric-toggle"
          type="button"
          :aria-label="toggleLabel"
          :aria-pressed="manuallyPaused || isReducedMotion"
          @click="togglePaused"
        >
          <span aria-hidden="true">{{ manuallyPaused || isReducedMotion ? '▶' : 'Ⅱ' }}</span>
        </button>
        <button class="lyric-control" type="button" aria-label="下一句" @click="move(1)">
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="lyric-dots" aria-label="选择歌词">
        <button
          v-for="(lyric, index) in homeLyrics"
          :key="lyric.id"
          class="lyric-dot"
          :class="{ active: currentIndex === index }"
          type="button"
          :aria-label="`显示${lyric.artist}的《${lyric.song}》`"
          :aria-current="currentIndex === index ? 'true' : undefined"
          @click="goTo(index)"
        >
          <span aria-hidden="true">{{ formatIndex(index) }}</span>
        </button>
      </div>
    </div>

    <div class="lyric-progress" aria-hidden="true">
      <span
        :key="`${currentIndex}-${canAutoAdvance}`"
        class="lyric-progress-fill"
        :class="{ paused: !canAutoAdvance }"
      ></span>
    </div>
  </section>
</template>
