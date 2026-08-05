<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  images: { type: Array, required: true },
  index: { type: Number, required: true },
  meta: { type: Object, default: null }
})
const emit = defineEmits(['close', 'prev', 'next'])

const loading = ref(true)
let lastFocus = null

function onKey(e) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') emit('prev')
  else if (e.key === 'ArrowRight') emit('next')
}

onMounted(() => {
  lastFocus = document.activeElement
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
  if (lastFocus && lastFocus.focus) lastFocus.focus()
})

watch(() => props.index, () => { loading.value = true })
</script>

<template>
  <Teleport to="body">
    <div
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="演唱会海报大图"
      @click.self="emit('close')"
    >
      <button class="lb-close" type="button" aria-label="关闭灯箱" @click="emit('close')">×</button>

      <button v-if="images.length > 1" class="lb-nav lb-prev" type="button" aria-label="上一张" @click="emit('prev')">←</button>

      <figure class="lb-stage">
        <img
          v-if="!loading"
          :src="images[index]"
          alt="演唱会海报大图"
          @load="loading = false"
        >
        <div v-else class="lb-loading" aria-label="加载中"><i></i></div>
        <figcaption v-if="meta" class="lb-meta">
          <span>{{ meta.artist }} · {{ meta.tour }}</span>
          <span>{{ index + 1 }} / {{ images.length }}</span>
        </figcaption>
      </figure>

      <button v-if="images.length > 1" class="lb-nav lb-next" type="button" aria-label="下一张" @click="emit('next')">→</button>
    </div>
  </Teleport>
</template>
