<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  stagger: { type: Number, default: 80 },
  threshold: { type: Number, default: 0.12 }
})

const el = ref(null)
let observer = null

onMounted(() => {
  if (!('IntersectionObserver' in window) || !el.value) return
  const children = el.value.querySelectorAll('[data-group-item]')
  children.forEach((child, i) => {
    child.style.transitionDelay = `${i * props.stagger}ms`
    child.classList.add('reveal')
  })
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: props.threshold, rootMargin: '0px 0px -36px 0px' })
  children.forEach((child) => observer.observe(child))
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
