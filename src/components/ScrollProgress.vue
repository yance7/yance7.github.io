<script setup lang="ts">
import { useScrollProgress } from '../composables/useScrollProgress'
import { useLocale } from '../i18n'

const { progress, percent } = useScrollProgress()
const { messages } = useLocale()
</script>

<template>
  <div
    class="scroll-progress"
    role="progressbar"
    :aria-label="messages.accessibility.readingProgress"
    :aria-valuetext="`${messages.accessibility.readingProgress} ${percent}%`"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="scroll-bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>
</template>
