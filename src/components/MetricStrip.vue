<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Metric } from '../data/types'

const props = withDefaults(defineProps<{ metrics: Metric[]; large?: boolean }>(), { large: false })

const displays = ref(props.metrics.map((m) => String(m.value)))
const cards = ref<HTMLElement[]>([])
const rafs = new Set<number>()
let observers: IntersectionObserver[] = []

function setCard(el: unknown, index: number) {
  if (el instanceof Element) cards.value[index] = el as HTMLElement
}

function parseValue(value: string) {
  const match = String(value).match(/^(-?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return null
  return {
    num: parseFloat(match[1]),
    suffix: match[2],
    decimals: (match[1].split('.')[1] || '').length
  }
}

function animateIndex(i: number) {
  const parsed = parseValue(props.metrics[i].value)
  if (!parsed) return
  const start = performance.now()
  const duration = 900
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
  if (!('IntersectionObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  observers = cards.value.map((el, i) => {
    if (!el) return null
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        animateIndex(i)
        obs.disconnect()
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return obs
  }).filter((observer): observer is IntersectionObserver => observer !== null)
})

onUnmounted(() => {
  rafs.forEach((id) => cancelAnimationFrame(id))
  rafs.clear()
  observers.forEach((obs) => obs.disconnect())
})
</script>

<template>
  <div class="metric-strip" :class="{ large }">
    <div
      v-for="(m, i) in metrics"
      :key="m.label"
      class="metric-card"
      :ref="(el) => setCard(el, i)"
      v-reveal
    >
      <b>{{ displays[i] ?? m.value }}</b>
      <span>{{ m.label }}</span>
      <small v-if="m.note">{{ m.note }}</small>
    </div>
  </div>
</template>
