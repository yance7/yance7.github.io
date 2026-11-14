<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  TYPEWRITER_TIMINGS,
  buildTypewriterLine,
  getTypewriterReveal
} from '../utils/homeHeroIntro'
import { loadHomeGreetingFont } from '../utils/homeGreetingFont'

const props = defineProps<{
  greeting: string
  statement: string
}>()

interface NetworkInformation extends EventTarget {
  saveData?: boolean
}

const fontState = ref<'loading' | 'ready' | 'fallback'>('loading')
const finalState = ref(false)
const greetingRevealed = ref(0)
const statementRevealed = ref(0)
const greetingTimeline = computed(() => buildTypewriterLine(props.greeting))
const statementTimeline = computed(() => buildTypewriterLine(props.statement))
let frame = 0
let startedAt = 0
let disposed = false
let motionPreference: MediaQueryList | null = null
let connection: NetworkInformation | undefined

function stopFrame() {
  if (frame) window.cancelAnimationFrame(frame)
  frame = 0
}

function showFinal() {
  stopFrame()
  greetingRevealed.value = greetingTimeline.value.graphemes.length
  statementRevealed.value = statementTimeline.value.graphemes.length
  finalState.value = true
}

function applyReveal(elapsedMs: number) {
  const greeting = greetingTimeline.value
  const statement = statementTimeline.value
  const statementStartMs = greeting.totalMs + TYPEWRITER_TIMINGS.linePauseMs
  const statementElapsedMs = elapsedMs - statementStartMs

  greetingRevealed.value = getTypewriterReveal(greeting, elapsedMs)
  statementRevealed.value = statementElapsedMs < 0 ? 0 : getTypewriterReveal(statement, statementElapsedMs)

  if (elapsedMs >= statementStartMs + statement.totalMs) {
    showFinal()
    return true
  }
  return false
}

function tick() {
  frame = 0
  if (disposed) return
  if (applyReveal(performance.now() - startedAt)) return
  frame = window.requestAnimationFrame(tick)
}

function stopForMotionPreference() {
  if (motionPreference?.matches) showFinal()
}

function stopForDataPreference() {
  if (connection?.saveData) showFinal()
}

onMounted(() => {
  void loadHomeGreetingFont(`${props.greeting} ${props.statement}`).then(state => {
    if (disposed) return
    fontState.value = state
    if (state === 'fallback') showFinal()
  })

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
  if (reducedMotion || connection?.saveData) {
    showFinal()
    return
  }

  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionPreference.addEventListener('change', stopForMotionPreference)
  connection?.addEventListener('change', stopForDataPreference)

  startedAt = performance.now()
  tick()
})

onBeforeUnmount(() => {
  disposed = true
  stopFrame()
  motionPreference?.removeEventListener('change', stopForMotionPreference)
  connection?.removeEventListener('change', stopForDataPreference)
})
</script>

<template>
  <div
    class="home-hero-typewriter"
    aria-hidden="true"
    :data-font-state="fontState"
    :data-final-state="finalState"
    :data-greeting-revealed="greetingRevealed"
    :data-statement-revealed="statementRevealed"
  >
    <span class="home-hero-typewriter-line home-hero-typewriter-line-greeting"><span
      v-for="(glyph, index) in greetingTimeline.graphemes"
      :key="`g-${index}`"
      class="home-hero-typewriter-glyph"
      :class="{ 'is-revealed': index < greetingRevealed }"
    >{{ glyph }}</span></span>
    <span class="home-hero-typewriter-line home-hero-typewriter-line-statement home-hero-typewriter-line-accent">
      <span class="home-hero-typewriter-copy"><span
        v-for="(glyph, index) in statementTimeline.graphemes"
        :key="`s-${index}`"
        class="home-hero-typewriter-glyph"
        :class="{ 'is-revealed': index < statementRevealed }"
      >{{ glyph }}</span></span><span class="home-hero-cursor" aria-hidden="true">_</span>
    </span>
  </div>
</template>
