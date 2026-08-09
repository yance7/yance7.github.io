<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import type { ProjectIcon } from '../data/types'

const props = defineProps<{ icon: ProjectIcon }>()
const mark = ref<HTMLElement | null>(null)
let frame = 0
let nextX = 0
let nextY = 0

function queueMarkPosition(x: number, y: number) {
  nextX = x
  nextY = y
  if (frame) return
  frame = requestAnimationFrame(() => {
    mark.value?.style.setProperty('--mark-x', nextX.toFixed(3))
    mark.value?.style.setProperty('--mark-y', nextY.toFixed(3))
    frame = 0
  })
}

function moveMark(event: PointerEvent) {
  if (!mark.value || event.pointerType === 'touch') return
  const rect = mark.value.getBoundingClientRect()
  const x = Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / (rect.width / 2)))
  const y = Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / (rect.height / 2)))
  queueMarkPosition(x, y)
}

function resetMark() {
  queueMarkPosition(0, 0)
}

onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <div
    ref="mark"
    class="project-mark"
    :class="`project-mark-${props.icon}`"
    aria-hidden="true"
    @pointermove="moveMark"
    @pointerleave="resetMark"
  >
    <div v-if="props.icon === 'eye'" class="mark-fish">
      <span class="mark-fish-halo"></span>
      <span class="mark-fish-bubble mark-fish-bubble-one"></span>
      <span class="mark-fish-bubble mark-fish-bubble-two"></span>
      <span class="mark-fish-spark">✦</span>
      <span class="mark-fish-fin mark-fish-fin-left"></span>
      <span class="mark-fish-fin mark-fish-fin-right"></span>
      <span class="mark-fish-face">
        <span class="mark-fish-eye">
          <i class="mark-fish-pupil"></i>
          <b></b>
          <span class="mark-fish-eye-ring"></span>
        </span>
        <span class="mark-fish-cheek mark-fish-cheek-left"></span>
        <span class="mark-fish-cheek mark-fish-cheek-right"></span>
        <span class="mark-fish-mouth"></span>
      </span>
    </div>

    <div v-else class="mark-spotlight">
      <span class="mark-spotlight-halo"></span>
      <span class="mark-spotlight-lamp"></span>
      <span class="mark-spotlight-cone"></span>
      <span class="mark-spotlight-beam-mark">✦</span>
      <span class="mark-spotlight-floor"></span>
      <span class="mark-spotlight-star mark-spotlight-star-one">✦</span>
      <span class="mark-spotlight-star mark-spotlight-star-two">·</span>
    </div>
  </div>
</template>
