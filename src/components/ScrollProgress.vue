<script setup lang="ts">
import { useScrollProgress } from '../composables/useScrollProgress'
const { progress, percent, showTop } = useScrollProgress()

function goTop() {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  window.scrollTo({ top: 0, behavior })
}
</script>

<template>
  <div
    class="scroll-progress"
    role="progressbar"
    aria-label="页面阅读进度"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="scroll-bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>
  <button
    class="scroll-to-top"
    :class="{ visible: showTop }"
    type="button"
    :tabindex="showTop ? 0 : -1"
    :aria-label="`回到顶部，当前阅读进度 ${percent}%`"
    :title="`回到顶部 · ${percent}%`"
    @click="goTop"
  >
    <span aria-hidden="true">↑</span>
    <small>{{ percent }}%</small>
  </button>
</template>
