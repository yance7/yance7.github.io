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
const loadError = ref(false)
const retryKey = ref(0)
const dialogRef = ref(null)
const closeButton = ref(null)
const isOpen = ref(true)
let lastFocus = null
const neighborPreloaded = new Set()

useBodyScrollLock(isOpen)

function preloadNeighbors(index) {
  if (props.images.length < 2) return
  const total = props.images.length
  const neighborIndexes = [(index - 1 + total) % total, (index + 1) % total]
  neighborIndexes.forEach((neighborIndex) => {
    const src = props.images[neighborIndex]
    if (neighborPreloaded.has(src)) return
    const image = new Image()
    image.decoding = 'async'
    image.src = src
    neighborPreloaded.add(src)
  })
}

function onImgLoad() {
  loading.value = false
  loadError.value = false
  preloadNeighbors(props.index)
}

function onImgError() {
  loading.value = false
  loadError.value = true
}

function retryImage() {
  loading.value = true
  loadError.value = false
  retryKey.value += 1
}

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

watch(() => [props.index, props.images[props.index]], () => {
  loading.value = true
  loadError.value = false
  preloadNeighbors(props.index)
}, { immediate: true })
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
          :key="`${images[index]}-${retryKey}`"
          :src="images[index]"
          :alt="meta ? `${meta.artist} · ${meta.tour} 海报大图` : '演唱会海报大图'"
          :class="{ loaded: !loading }"
          fetchpriority="high"
          decoding="async"
          @load="onImgLoad"
          @error="onImgError"
        >
        <div v-if="loading" class="lb-loading" role="status" aria-live="polite">
          <span class="sr-only">正在加载图片</span>
          <i aria-hidden="true"></i>
        </div>
        <div v-else-if="loadError" class="lb-error" role="alert">
          <p>图片加载失败</p>
          <button type="button" class="lb-retry" @click="retryImage">重试</button>
        </div>
        <figcaption v-if="meta" class="lb-meta">
          <span>{{ meta.artist }} · {{ meta.tour }}</span>
          <span>{{ index + 1 }} / {{ images.length }}</span>
        </figcaption>
        <p class="sr-only" aria-live="polite">
          {{ meta ? `${meta.artist} · ${meta.tour}` : '演唱会海报' }}，第 {{ index + 1 }} 张，共 {{ images.length }} 张
        </p>
      </figure>

      <button v-if="images.length > 1" class="lb-nav lb-next" type="button" aria-label="下一张" @click="emit('next')">→</button>
    </div>
  </Teleport>
</template>
