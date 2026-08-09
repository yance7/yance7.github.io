<script setup lang="ts">
import { ref } from 'vue'
import type { ProjectIcon } from '../data/types'

const props = defineProps<{ icon: ProjectIcon }>()
const mark = ref<HTMLElement | null>(null)

function moveMark(event: PointerEvent) {
  if (!mark.value || event.pointerType === 'touch') return
  const rect = mark.value.getBoundingClientRect()
  const x = Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / (rect.width / 2)))
  const y = Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / (rect.height / 2)))
  mark.value.style.setProperty('--mark-x', x.toFixed(3))
  mark.value.style.setProperty('--mark-y', y.toFixed(3))
}

function resetMark() {
  mark.value?.style.setProperty('--mark-x', '0')
  mark.value?.style.setProperty('--mark-y', '0')
}
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
      <span class="mark-fish-fin mark-fish-fin-left"></span>
      <span class="mark-fish-fin mark-fish-fin-right"></span>
      <span class="mark-fish-face">
        <span class="mark-fish-eye">
          <i class="mark-fish-pupil"></i>
          <b></b>
        </span>
        <span class="mark-fish-cheek mark-fish-cheek-left"></span>
        <span class="mark-fish-cheek mark-fish-cheek-right"></span>
        <span class="mark-fish-mouth"></span>
      </span>
    </div>

    <div v-else class="mark-spotlight">
      <span class="mark-spotlight-lamp"></span>
      <span class="mark-spotlight-cone"></span>
      <span class="mark-spotlight-floor"></span>
      <span class="mark-spotlight-star mark-spotlight-star-one">✦</span>
      <span class="mark-spotlight-star mark-spotlight-star-two">·</span>
    </div>
  </div>
</template>
