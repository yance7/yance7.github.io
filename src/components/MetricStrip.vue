<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  metrics: { type: Array, required: true },
  large: { type: Boolean, default: false }
})

const displays = ref(props.metrics.map((m) => String(m.value)))
const cards = ref([])
let raf = 0
let observers = []

function parseValue(value) {
  const match = String(value).match(/^(-?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return null
  return {
    num: parseFloat(match[1]),
    suffix: match[2],
    decimals: (match[1].split('.')[1] || '').length
  }
}

function animateIndex(i) {
  const parsed = parseValue(props.metrics[i].value)
  if (!parsed) return
  const start = performance.now()
  const duration = 900
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    displays.value[i] = (parsed.num * eased).toFixed(parsed.decimals) + parsed.suffix
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
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
  }).filter(Boolean)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  observers.forEach((obs) => obs.disconnect())
})
</script>

<template>
  <div class="metric-strip" :class="{ large }">
    <div
      v-for="(m, i) in metrics"
      :key="m.label"
      class="metric-card"
      :ref="(el) => { if (el) cards[i] = el }"
      v-reveal
    >
      <b>{{ displays[i] ?? m.value }}</b>
      <span>{{ m.label }}</span>
      <small v-if="m.note">{{ m.note }}</small>
    </div>
  </div>
</template>
