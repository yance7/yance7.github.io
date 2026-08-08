<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const TEXT = '$ whoami → Yance · 高中生 · 研究者 · 产品制造者'
const typed = ref('')
const time = ref('')
let typeTimer = 0
let clockTimer = 0
let started = false

function formatTime() {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date())
  const get = (type) => parts.find((p) => p.type === type)?.value || '00'
  return `BEIJING ${get('hour')}:${get('minute')}`
}

function startType() {
  if (started) return
  started = true
  let i = 0
  typeTimer = setInterval(() => {
    i += 1
    typed.value = TEXT.slice(0, i)
    if (i >= TEXT.length) clearInterval(typeTimer)
  }, 38)
}

onMounted(() => {
  time.value = formatTime()
  clockTimer = setInterval(() => { time.value = formatTime() }, 60000)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typed.value = TEXT
    return
  }
  if (!('IntersectionObserver' in window)) {
    startType()
    return
  }
  const el = document.querySelector('.terminal-status')
  if (!el) {
    startType()
    return
  }
  const obs = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      startType()
      obs.disconnect()
    }
  }, { threshold: 0.4 })
  obs.observe(el)
})

onUnmounted(() => {
  clearInterval(typeTimer)
  clearInterval(clockTimer)
})
</script>

<template>
  <div class="terminal-status" aria-label="系统状态">
    <span class="term-line">{{ typed }}<b class="term-caret" aria-hidden="true"></b></span>
    <span class="term-time">{{ time }}</span>
  </div>
</template>
