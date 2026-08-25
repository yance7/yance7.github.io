<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { legacyCopyText, type LegacyCopyDocument } from '../utils/clipboard'
import { useLocale } from '../i18n'

const props = defineProps({
  citation: { type: String, required: true }
})

type CopyState = 'idle' | 'success' | 'error'

const state = ref<CopyState>('idle')
const { messages } = useLocale()
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
      const legacyDocument: LegacyCopyDocument<HTMLTextAreaElement> = {
        createTextarea: () => document.createElement('textarea'),
        appendTextarea: (textarea) => document.body.appendChild(textarea),
        execCopy: () => document.execCommand('copy')
      }
      const copied = legacyCopyText(text, legacyDocument)
      if (!copied) throw new Error('Legacy copy command was rejected')
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
    :class="`is-${state}`"
    type="button"
    :disabled="copying"
    :data-state="state"
    :aria-label="state === 'success' ? messages.common.copied : messages.common.copyCitation"
    @click="copy"
  >
    <span class="copy-icon" aria-hidden="true">
      <svg v-if="state === 'success'" viewBox="0 0 16 16"><path d="m3 8 3 3 7-7" /></svg>
      <svg v-else viewBox="0 0 16 16"><rect x="5" y="3" width="8" height="9" rx="1.5" /><path d="M3 6v6.5A1.5 1.5 0 0 0 4.5 14H10" /></svg>
    </span>
    <span class="copy-label" aria-live="polite">{{ copying ? messages.common.copyInProgress : state === 'success' ? messages.common.copied : messages.common.copyCitation }}</span>
  </button>
  <span v-if="state === 'error'" class="copy-error" role="status" aria-live="polite">{{ messages.common.copyFailed }}</span>
</template>
