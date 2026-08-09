<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface SectionNavItem {
  id: string
  label: string
}

const props = defineProps<{ sections: SectionNavItem[] }>()

const active = ref(props.sections[0]?.id || '')
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!('IntersectionObserver' in window)) return
  const nextObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) active.value = entry.target.id
    })
  }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 })
  observer = nextObserver
  props.sections.forEach((s) => {
    const el = document.getElementById(s.id)
    if (el) nextObserver.observe(el)
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
      :aria-current="active === s.id ? 'location' : undefined"
    >
      <i></i>
      <span class="section-dot-label">{{ s.label }}</span>
    </a>
  </nav>
</template>
