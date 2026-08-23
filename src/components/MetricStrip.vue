<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Metric } from '../data/types'

const props = withDefaults(defineProps<{ metrics: Metric[]; large?: boolean }>(), { large: false })

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

function initialDisplay(value: string, reducedMotion: boolean) {
  if (reducedMotion) return String(value)
  const parsed = parseValue(value)
  if (!parsed) return String(value)
  return (0).toFixed(parsed.decimals) + parsed.suffix
}

const displays = ref(props.metrics.map((metric) => initialDisplay(metric.value, prefersReducedMotion())))
const metricStrip = ref<HTMLElement | null>(null)
const rafs = new Set<number>()
let observer: IntersectionObserver | null = null
const animatedIndexes = new Set<number>()

function animateIndex(i: number) {
  if (animatedIndexes.has(i)) return
  animatedIndexes.add(i)
  const metric = props.metrics[i]
  if (!metric) return
  const parsed = parseValue(metric.value)
  if (!parsed) return
  const start = performance.now()
  const duration = 650
  let currentRaf = 0
  const step = (now: number) => {
    rafs.delete(currentRaf)
    const t = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    displays.value[i] = (parsed.num * eased).toFixed(parsed.decimals) + parsed.suffix
    if (t < 1) {
      currentRaf = requestAnimationFrame(step)
      rafs.add(currentRaf)
    }
  }
  currentRaf = requestAnimationFrame(step)
  rafs.add(currentRaf)
}

onMounted(() => {
  const strip = metricStrip.value
  if (!strip) return
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    displays.value = props.metrics.map((metric) => String(metric.value))
    return
  }

  const cards = [...strip.querySelectorAll<HTMLElement>('[data-metric-index]')]
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const index = Number((entry.target as HTMLElement).dataset.metricIndex)
      if (Number.isInteger(index)) animateIndex(index)
      observer?.unobserve(entry.target)
    })
  }, { threshold: 0.3 })
  cards.forEach((card) => observer?.observe(card))
})

onUnmounted(() => {
  rafs.forEach((id) => cancelAnimationFrame(id))
  rafs.clear()
  observer?.disconnect()
  observer = null
  animatedIndexes.clear()
})
</script>

<template>
  <div ref="metricStrip" class="metric-strip" :class="{ large }" v-reveal>
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
