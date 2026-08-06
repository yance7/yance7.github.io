<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  sections: { type: Array, required: true }
})

const active = ref(props.sections[0]?.id || '')
let observer = null

function go(id) {
  const el = document.getElementById(id)
  if (!el) return
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  el.scrollIntoView({ behavior, block: 'start' })
}

onMounted(() => {
  if (!('IntersectionObserver' in window)) return
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) active.value = entry.target.id
    })
  }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 })
  props.sections.forEach((s) => {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <nav class="section-dots" aria-label="页面章节导航">
    <a
      v-for="s in sections"
      :key="s.id"
      class="section-dot"
      :class="{ active: active === s.id }"
      :href="`#${s.id}`"
      :aria-label="s.label"
      @click.prevent="go(s.id)"
    >
      <i></i>
      <span class="section-dot-label">{{ s.label }}</span>
    </a>
  </nav>
</template>
