<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = defineProps({
  citation: { type: String, required: true }
})

type CopyState = 'idle' | 'success' | 'error'

const state = ref<CopyState>('idle')
const copying = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  if (copying.value) return
  copying.value = true
  const text = props.citation
  clearTimeout(timer)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    state.value = 'success'
    clearTimeout(timer)
    timer = setTimeout(() => { state.value = 'idle' }, 2000)
  } catch {
    state.value = 'error'
  } finally {
    copying.value = false
  }
}

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <button
    class="tl-link copy-citation"
    type="button"
    :disabled="copying"
    :aria-label="state === 'success' ? '已复制引用' : '复制引用'"
    @click="copy"
  >
    {{ copying ? '复制中…' : state === 'success' ? '已复制 ✓' : '复制引用' }}
  </button>
  <span v-if="state === 'error'" class="copy-error" role="status" aria-live="polite">复制失败，请手动复制</span>
</template>
