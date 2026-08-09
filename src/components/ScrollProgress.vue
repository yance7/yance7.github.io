<script setup lang="ts">
import { useScrollProgress } from '../composables/useScrollProgress'
const { progress, showTop } = useScrollProgress()

function goTop() {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  window.scrollTo({ top: 0, behavior })
}
</script>

<template>
  <div class="scroll-progress" aria-hidden="true">
    <div class="scroll-bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>
  <button
    class="scroll-to-top"
    :class="{ visible: showTop }"
    type="button"
    :tabindex="showTop ? 0 : -1"
    aria-label="回到顶部"
    title="回到顶部"
    @click="goTop"
  >
    <span aria-hidden="true">↑</span>
    <small>TOP</small>
  </button>
</template>
