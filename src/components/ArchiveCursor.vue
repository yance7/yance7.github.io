<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const x = ref(0)
const y = ref(0)
const visible = ref(false)
const hovering = ref(false)

let raf = 0
let targetX = 0, targetY = 0

function onMove(e) {
  targetX = e.clientX
  targetY = e.clientY
  if (!visible.value) visible.value = true
  const el = e.target
  hovering.value = !!(el.closest && el.closest('a, button, [data-cursor]'))
}

function loop() {
  x.value += (targetX - x.value) * 0.15
  y.value += (targetY - y.value) * 0.15
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', onMove)
    loop()
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMove)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div
    class="archive-cursor"
    :class="{ visible, hovering }"
    :style="{ transform: `translate(${x}px, ${y}px)` }"
    aria-hidden="true"
  >
    <i></i>
  </div>
</template>
