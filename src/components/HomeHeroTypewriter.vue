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

const fontState = ref<'loading' | 'ready' | 'fallback'>('loading')
const finalState = ref(false)
const greetingLine = ref<HTMLElement | null>(null)
const statementLine = ref<HTMLElement | null>(null)
const greetingTimeline = computed(() => buildTypewriterLine(props.greeting))
const statementTimeline = computed(() => buildTypewriterLine(props.statement))
let frame = 0
let startedAt = 0
let disposed = false

function setClip(element: HTMLElement | null, revealed: number, total: number) {
  if (!element) return
  if (revealed >= total) {
    element.style.clipPath = 'none'
    return
  }
  const right = total <= 0 ? 100 : Math.max(0, Math.min(100, (1 - revealed / total) * 100))
  element.style.clipPath = `inset(0 ${right}% 0 0)`
}

function showFinal() {
  if (frame) window.cancelAnimationFrame(frame)
  frame = 0
  if (greetingLine.value) greetingLine.value.style.clipPath = 'none'
  if (statementLine.value) statementLine.value.style.clipPath = 'none'
  finalState.value = true
}

function applyReveal(elapsedMs: number) {
  const greeting = greetingTimeline.value
  const statement = statementTimeline.value
  const statementStartMs = greeting.totalMs + TYPEWRITER_TIMINGS.linePauseMs
  const statementElapsedMs = elapsedMs - statementStartMs

  setClip(greetingLine.value, getTypewriterReveal(greeting, elapsedMs), greeting.graphemes.length)
  setClip(
    statementLine.value,
    statementElapsedMs < 0 ? 0 : getTypewriterReveal(statement, statementElapsedMs),
    statement.graphemes.length
  )

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

onMounted(() => {
  void loadHomeGreetingFont(`${props.greeting} ${props.statement}`).then(state => {
    if (disposed) return
    fontState.value = state
    if (state === 'fallback') showFinal()
  })

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  if (reducedMotion || saveData) {
    showFinal()
    return
  }

  startedAt = performance.now()
  tick()
})

onBeforeUnmount(() => {
  disposed = true
  if (frame) window.cancelAnimationFrame(frame)
})
</script>

<template>
  <div
    class="home-hero-typewriter"
    aria-hidden="true"
    :data-font-state="fontState"
    :data-final-state="finalState"
  >
    <span ref="greetingLine" class="home-hero-typewriter-line home-hero-typewriter-line-greeting">{{ props.greeting }}</span>
    <span ref="statementLine" class="home-hero-typewriter-line home-hero-typewriter-line-statement home-hero-typewriter-line-accent">
      <span class="home-hero-typewriter-copy">{{ props.statement }}</span><span class="home-hero-cursor" aria-hidden="true">_</span>
    </span>
  </div>
</template>
