<script setup>
import { ref } from 'vue'

const props = defineProps({
  citation: { type: String, required: true }
})

const copied = ref(false)
let timer = 0

async function copy() {
  const text = props.citation
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
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => { copied.value = false }, 2000)
  } catch { /* 复制失败时静默 */ }
}
</script>

<template>
  <button
    class="tl-link copy-citation"
    type="button"
    :aria-label="copied ? '已复制引用' : '复制引用'"
    @click="copy"
  >
    {{ copied ? '已复制 ✓' : '复制引用' }}
  </button>
</template>
