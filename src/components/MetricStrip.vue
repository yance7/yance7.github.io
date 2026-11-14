<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Metric } from '../data/types'
import { isInInitialViewport } from '../utils/reveal'

const props = withDefaults(defineProps<{ metrics: Metric[]; large?: boolean; animateOnEnter?: boolean }>(), {
  large: false,
  animateOnEnter: false
})

const COUNT_DURATION_MS = 950
// The wider margin only arms (zeroes) a strip while it is still off-screen; the
// count itself starts from a second observer once the strip is really on screen.
const ARM_ROOT_MARGIN = '0px 0px 120px 0px'

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
let armObserver: IntersectionObserver | null = null
let startObserver: IntersectionObserver | null = null
let motionQuery: MediaQueryList | null = null
let reducedMotion = false
const startedIndexes = new Set<number>()
const completedIndexes = new Set<number>()
const observedIndexes = new Set<number>()
let initialObservationComplete = false

function refreshReady() {
  if (!initialObservationComplete) {
    metricsReady.value = false
    return
  }
  // A strip that is armed but not yet on screen has not started, so it counts as settled.
  metricsReady.value = [...startedIndexes].every((index) => completedIndexes.has(index))
}

function finishAll() {
  rafs.forEach((id) => cancelAnimationFrame(id))
  rafs.clear()
  displays.value = props.metrics.map((metric) => String(metric.value))
  props.metrics.forEach((_, index) => {
    startedIndexes.add(index)
    completedIndexes.add(index)
  })
  metricsReady.value = true
}

function animateIndex(i: number) {
  if (reducedMotion || prefersReducedMotion()) {
    displays.value[i] = String(props.metrics[i]?.value ?? '')
    startedIndexes.add(i)
    completedIndexes.add(i)
    refreshReady()
    return
  }
  if (startedIndexes.has(i)) return
  startedIndexes.add(i)
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
    if (reducedMotion) {
      displays.value[i] = String(metric.value)
      completedIndexes.add(i)
      refreshReady()
      return
    }
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

function maybeCompleteObservation(cardCount: number) {
  if (observedIndexes.size >= cardCount) {
    initialObservationComplete = true
    refreshReady()
  }
}

function stopObservers() {
  armObserver?.disconnect()
  startObserver?.disconnect()
  armObserver = null
  startObserver = null
}

function handleMotionChange() {
  if (!motionQuery?.matches) return
  reducedMotion = true
  stopObservers()
  finishAll()
}

onMounted(() => {
  const strip = metricStrip.value
  if (!strip) return
  if (prefersReducedMotion() || !props.animateOnEnter || !('IntersectionObserver' in window)) {
    displays.value = props.metrics.map((metric) => String(metric.value))
    metricsReady.value = true
    return
  }

  reducedMotion = false
  const cards = [...strip.querySelectorAll<HTMLElement>('[data-metric-index]')]
  if (!cards.length) {
    initialObservationComplete = true
    metricsReady.value = true
    return
  }

  armObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const target = entry.target as HTMLElement
      const index = Number(target.dataset.metricIndex)
      if (!Number.isInteger(index)) return
      observedIndexes.add(index)
      if (!entry.isIntersecting) return
      armObserver?.unobserve(target)
      maybeCompleteObservation(cards.length)

      const rect = target.getBoundingClientRect()
      const onScreenNow = rect.bottom > 0 && rect.top < window.innerHeight
      if (onScreenNow || reducedMotion) {
        // Already visible (or motion was reduced): keep the server-rendered value.
        displays.value[index] = String(props.metrics[index]?.value ?? '')
        startedIndexes.add(index)
        completedIndexes.add(index)
        refreshReady()
        return
      }

      // Off-screen: zero the value here so the count can start cleanly on entry.
      const parsed = parseValue(props.metrics[index]?.value ?? '')
      if (parsed) displays.value[index] = (0).toFixed(parsed.decimals) + parsed.suffix
      startObserver?.observe(target)
    })
    maybeCompleteObservation(cards.length)
  }, { threshold: 0, rootMargin: ARM_ROOT_MARGIN })

  startObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const target = entry.target as HTMLElement
      const index = Number(target.dataset.metricIndex)
      if (!Number.isInteger(index)) return
      if (!entry.isIntersecting) return
      startObserver?.unobserve(target)
      animateIndex(index)
    })
  }, { threshold: 0.3 })

  cards.forEach((card) => {
    const index = Number(card.dataset.metricIndex)
    if (!Number.isInteger(index)) return
    if (isInInitialViewport(card.getBoundingClientRect(), window.innerHeight)) {
      // Visible from the first paint: no reset, no flash.
      displays.value[index] = String(props.metrics[index]?.value ?? '')
      observedIndexes.add(index)
      startedIndexes.add(index)
      completedIndexes.add(index)
      return
    }
    armObserver?.observe(card)
  })

  maybeCompleteObservation(cards.length)
  if (observedIndexes.size >= cards.length) initialObservationComplete = true
  refreshReady()

  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', handleMotionChange)
})

onUnmounted(() => {
  rafs.forEach((id) => cancelAnimationFrame(id))
  rafs.clear()
  stopObservers()
  motionQuery?.removeEventListener('change', handleMotionChange)
  motionQuery = null
  startedIndexes.clear()
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
      <b aria-hidden="true">{{ displays[i] ?? m.value }}</b>
      <span class="sr-only">{{ m.value }}</span>
      <span class="metric-label">{{ m.label }}</span>
      <small v-if="m.note">{{ m.note }}</small>
    </div>
  </div>
</template>