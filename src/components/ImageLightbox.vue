<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import type { LightboxMeta, NonEmptyArray } from '../data/types'
import { useModalDialog } from '../composables/useModalDialog'
import { sharedImagePreloader } from '../utils/imagePreload'
import { clampLightboxIndex } from '../utils/lightbox'
import YanceButton from './YanceButton.vue'

const props = defineProps<{
  images: NonEmptyArray<string>
  index: number
  meta?: LightboxMeta | null
}>()
const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()

const loading = ref(true)
const loadError = ref(false)
const retryKey = ref(0)
const dialogRef = ref<HTMLElement | null>(null)
const closeButton = ref<{ focus: () => void } | null>(null)
const isVisible = ref(true)
const dialogActive = ref(true)
const imagePreloader = sharedImagePreloader
const safeIndex = computed(() => clampLightboxIndex(props.index, props.images.length))

function closeLightbox() {
  if (!isVisible.value) return
  isVisible.value = false
}

function afterLeave() {
  dialogActive.value = false
  emit('close')
}

useModalDialog(dialogActive, {
  dialogRef,
  initialFocus: closeButton,
  inertSelectors: ['.site-shell'],
  deferInert: true,
  onClose: closeLightbox,
})

function preloadNeighbors(index: number) {
  if (props.images.length < 2) return
  const total = props.images.length
  const neighborIndexes = [(index - 1 + total) % total, (index + 1) % total]
  neighborIndexes.forEach((neighborIndex) => {
    const src = props.images[neighborIndex]
    if (src) imagePreloader.preload(src)
  })
}

function onImgLoad() {
  loading.value = false
  loadError.value = false
  preloadNeighbors(safeIndex.value)
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

function onKey(e: KeyboardEvent) {
  if (!isVisible.value) return
  if (e.key === 'ArrowLeft') emit('prev')
  else if (e.key === 'ArrowRight') emit('next')
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})

watch(() => [safeIndex.value, props.images[safeIndex.value]], () => {
  loading.value = true
  loadError.value = false
  preloadNeighbors(safeIndex.value)
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="lightbox" appear @after-leave="afterLeave">
      <div
        v-if="isVisible"
        ref="dialogRef"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        :aria-busy="loading"
        aria-label="演唱会海报大图"
        @click.self="closeLightbox"
      >
        <div class="lb-meta-dock" aria-hidden="true"></div>

        <YanceButton ref="closeButton" class="lb-close" variant="quiet" size="icon" aria-label="关闭灯箱" @click="closeLightbox">
          ×
        </YanceButton>

      <YanceButton v-if="images.length > 1" class="lb-nav lb-prev" variant="quiet" size="icon" aria-label="上一张" @click="emit('prev')">
        ←
      </YanceButton>

      <figure class="lb-stage">
        <img
          :key="`${images[safeIndex]}-${retryKey}`"
          :src="images[safeIndex]"
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
          <YanceButton class="lb-retry" variant="quiet" size="sm" @click="retryImage">重试</YanceButton>
        </div>
        <figcaption v-if="meta" class="lb-meta">
          <span class="lb-meta-copy">
            <small>LIVE ARCHIVE</small>
            <strong>{{ meta.artist }}</strong>
            <span>{{ meta.tour }}</span>
          </span>
          <span class="lb-meta-index">{{ safeIndex + 1 }} / {{ images.length }}</span>
        </figcaption>
        <p class="sr-only" aria-live="polite">
          {{ meta ? `${meta.artist} · ${meta.tour}` : '演唱会海报' }}，第 {{ safeIndex + 1 }} 张，共 {{ images.length }} 张
        </p>
      </figure>

      <YanceButton v-if="images.length > 1" class="lb-nav lb-next" variant="quiet" size="icon" aria-label="下一张" @click="emit('next')">
        →
      </YanceButton>
      </div>
    </Transition>
  </Teleport>
</template>
