<script setup>
import { useScrollProgress } from '../composables/useScrollProgress'
const { progress } = useScrollProgress()
</script>

<template>
  <div class="scroll-progress" aria-hidden="true">
    <div class="scroll-bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>
</template>
