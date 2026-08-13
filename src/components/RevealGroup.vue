<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{ stagger?: number; threshold?: number }>(), {
  stagger: 80,
  threshold: 0.12
})

const el = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!('IntersectionObserver' in window) || !el.value) return
  const children = el.value.querySelectorAll<HTMLElement>('[data-group-item]')
  children.forEach((child, i) => {
    child.style.transitionDelay = `${i * props.stagger}ms`
    child.classList.add('reveal')
  })
  const groupObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed')
        groupObserver.unobserve(entry.target)
      }
    })
  }, { threshold: props.threshold, rootMargin: '0px 0px -36px 0px' })
  observer = groupObserver
  children.forEach((child) => groupObserver.observe(child))
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <div ref="el" class="reveal-group">
    <slot />
  </div>
</template>
