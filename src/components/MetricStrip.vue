<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Metric } from '../data/types'
import { isInInitialViewport } from '../utils/reveal'

const props = withDefaults(defineProps<{ metrics: Metric[]; large?: boolean; animateOnEnter?: boolean }>(), {
  large: false,
  animateOnEnter: false
})

const COUNT_DURATION_MS = 950
// Trigger slightly before the strip scrolls in so the reset to zero happens off-screen.
const COUNT_ROOT_MARGIN = '0px 0px 120px 0px'

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function parseValue(value: string) {
  const match = String(value).match(/^(-?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return null
  return {
    num: parseFloat(match[1] ?? '0'),
    suffix: match[2] ?? '',
    decimals: (match[1]?.split('.')[1] || '').length
  }
}

const displays = ref(props.metrics.map((metric) => String(metric.value)))
const metricStrip = ref<HTMLElement | null>(null)
const metricsReady = ref(false)
const rafs = new Set<number>()
let observer: IntersectionObserver | null = null
let motionQuery: MediaQueryList | null = null
const animatedIndexes = new Set<number>()
const completedIndexes = new Set<number>()
const observedIndexes = new Set<number>()
let initialObservationComplete = false

function refreshReady() {
  if (!initialObservationComplete) {
    metricsReady.value = false
    return
  }
  metricsReady.value = [...animatedIndexes].every((index) => completedIndexes.has(index))
}

function finishAll() {
  rafs.forEach((id) => cancelAnimationFrame(id))
  rafs.clear()
  displays.value = props.metrics.map((metric) => String(metric.value))
  animatedIndexes.forEach((index) => completedIndexes.add(index))
  metricsReady.value = true
}

function animateIndex(i: number) {
  if (animatedIndexes.has(i)) return
  animatedIndexes.add(i)
  refreshReady()

  const metric = props.metrics[i]
  const parsed = metric ? parseValue(metric.value) : null
  if (!metric || !parsed) {
    completedIndexes.add(i)
    refreshReady()
    return
  }

  displays.value[i] = (0).toFixed(parsed.decimals) + parsed.suffix
  const start = performance.now()
  let currentRaf = 0
  const step = (now: number) => {
    rafs.delete(currentRaf)
    const t = Math.min((now - start) / COUNT_DURATION_MS, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    displays.value[i] = (parsed.num * eased).toFixed(parsed.decimals) + parsed.suffix
    if (t < 1) {
      currentRaf = requestAnimationFrame(step)
      rafs.add(currentRaf)
      return
    }
    displays.value[i] = String(metric.value)
    completedIndexes.add(i)
    refreshReady()
  }
  currentRaf = requestAnimationFrame(step)
  rafs.add(currentRaf)
}

function handleMotionChange() {
  if (motionQuery?.matches) finishAll()
}

onMounted(() => {
  const strip = metricStrip.value
  if (!strip) return
  if (prefersReducedMotion() || !props.animateOnEnter || !('IntersectionObserver' in window)) {
    displays.value = props.metrics.map((metric) => String(metric.value))
    metricsReady.value = true
    return
  }

  const cards = [...strip.querySelectorAll<HTMLElement>('[data-metric-index]')]
  const initiallyVisible = new Set<number>()
  cards.forEach((card) => {
    const index = Number(card.dataset.metricIndex)
    if (!Number.isInteger(index)) return
    observedIndexes.add(index)
    // Content already on screen keeps its rendered final value (no reset flash).
    if (isInInitialViewport(card.getBoundingClientRect(), window.innerHeight)) {
      initiallyVisible.add(index)
      completedIndexes.add(index)
    }
  })

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const index = Number((entry.target as HTMLElement).dataset.metricIndex)
      if (!Number.isInteger(index)) return
      observedIndexes.add(index)
      if (!entry.isIntersecting) return
      const target = entry.target as HTMLElement
      const rect = target.getBoundingClientRect()
      const onScreenNow = rect.bottom > 0 && rect.top < window.innerHeight
      observer?.unobserve(target)
      // Only reset a value to zero while it is still off-screen, so the final
      // server-rendered number is never replaced by zero in front of the reader.
      if (onScreenNow) {
        completedIndexes.add(index)
        refreshReady()
        return
      }
      animateIndex(index)
    })
    if (observedIndexes.size >= cards.length) {
      initialObservationComplete = true
      refreshReady()
    }
  }, { threshold: 0, rootMargin: COUNT_ROOT_MARGIN })

  cards.forEach((card) => {
    const index = Number(card.dataset.metricIndex)
    if (initiallyVisible.has(index)) return
    observer?.observe(card)
  })

  if (!cards.length) {
    initialObservationComplete = true
    metricsReady.value = true
  } else {
    if (observedIndexes.size >= cards.length) initialObservationComplete = true
    refreshReady()
  }

  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', handleMotionChange)
})

onUnmounted(() => {
  rafs.forEach((id) => cancelAnimationFrame(id))
  rafs.clear()
  observer?.disconnect()
  observer = null
  motionQuery?.removeEventListener('change', handleMotionChange)
  motionQuery = null
  animatedIndexes.clear()
  completedIndexes.clear()
  observedIndexes.clear()
  initialObservationComplete = false
})
</script>

<template>
  <div ref="metricStrip" class="metric-strip" :class="{ large }" :data-metrics-ready="metricsReady ? 'true' : 'false'" v-reveal>
    <div
      v-for="(m, i) in metrics"
      :key="m.label"
      class="metric-card"
      :data-metric-index="i"
    >
      <b>{{ displays[i] ?? m.value }}</b>
      <span>{{ m.label }}</span>
      <small v-if="m.note">{{ m.note }}</small>
    </div>
  </div>
</template>
