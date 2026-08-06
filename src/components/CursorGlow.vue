<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const glow = ref(null)
let raf = 0

function onPointerMove(e) {
  if (e.pointerType === 'touch') return
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    if (!glow.value) return
    glow.value.style.setProperty('--cg-x', `${e.clientX}px`)
    glow.value.style.setProperty('--cg-y', `${e.clientY}px`)
  })
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!window.matchMedia('(hover: hover)').matches) return
  window.addEventListener('pointermove', onPointerMove, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div ref="glow" class="cursor-glow" aria-hidden="true"></div>
</template>
