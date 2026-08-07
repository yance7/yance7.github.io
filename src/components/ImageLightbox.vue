<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'

const props = defineProps({
  images: { type: Array, required: true },
  index: { type: Number, required: true },
  meta: { type: Object, default: null }
})
const emit = defineEmits(['close', 'prev', 'next'])

const loading = ref(true)
const dialogRef = ref(null)
const closeButton = ref(null)
const isOpen = ref(true)
let lastFocus = null

useBodyScrollLock(isOpen)

function onImgLoad() { loading.value = false }
function onImgError() { loading.value = false }

function onKey(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
  else if (e.key === 'ArrowLeft') emit('prev')
  else if (e.key === 'ArrowRight') emit('next')
  else if (e.key === 'Tab') {
    const focusable = [...dialogRef.value?.querySelectorAll('button:not([disabled])') || []]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

onMounted(() => {
  lastFocus = document.activeElement
  window.addEventListener('keydown', onKey)
  nextTick(() => closeButton.value?.focus())
})

onUnmounted(() => {
  isOpen.value = false
  window.removeEventListener('keydown', onKey)
  if (lastFocus && lastFocus.focus) lastFocus.focus()
})

watch(() => props.index, () => { loading.value = true })
</script>

<template>
  <Teleport to="body">
    <div
      ref="dialogRef"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="演唱会海报大图"
      @click.self="emit('close')"
    >
      <button ref="closeButton" class="lb-close" type="button" aria-label="关闭灯箱" @click="emit('close')">×</button>

      <button v-if="images.length > 1" class="lb-nav lb-prev" type="button" aria-label="上一张" @click="emit('prev')">←</button>

      <figure class="lb-stage">
        <img
          :src="images[index]"
          :alt="meta ? `${meta.artist} · ${meta.tour} 海报大图` : '演唱会海报大图'"
          :class="{ loaded: !loading }"
          fetchpriority="high"
          decoding="async"
          @load="onImgLoad"
          @error="onImgError"
        >
        <div v-if="loading" class="lb-loading" aria-label="加载中"><i></i></div>
        <figcaption v-if="meta" class="lb-meta">
          <span>{{ meta.artist }} · {{ meta.tour }}</span>
          <span>{{ index + 1 }} / {{ images.length }}</span>
        </figcaption>
      </figure>

      <button v-if="images.length > 1" class="lb-nav lb-next" type="button" aria-label="下一张" @click="emit('next')">→</button>
    </div>
  </Teleport>
</template>
