/* 彩蛋：依次按下 y-a-n-c-e，屏幕上升起一串音符 */
import { onMounted, onUnmounted } from 'vue'

const SEQUENCE = ['y', 'a', 'n', 'c', 'e']
const NOTES = ['♪', '♫', '♬', '♩']
let progress = 0
let timers = []

function onKey(e) {
  const key = e.key.toLowerCase()
  if (key === SEQUENCE[progress]) {
    progress += 1
    if (progress === SEQUENCE.length) {
      progress = 0
      burst()
    }
  } else {
    progress = key === SEQUENCE[0] ? 1 : 0
  }
}

function burst() {
  const els = []
  for (let i = 0; i < 16; i += 1) {
    const el = document.createElement('i')
    el.className = 'music-note'
    el.setAttribute('aria-hidden', 'true')
    el.textContent = NOTES[i % NOTES.length]
    el.style.left = `${(6 + Math.random() * 88).toFixed(1)}vw`
    el.style.fontSize = `${(16 + Math.random() * 22).toFixed(0)}px`
    el.style.setProperty('--rise', `${(140 + Math.random() * 240).toFixed(0)}px`)
    el.style.setProperty('--drift', `${(Math.random() * 120 - 60).toFixed(0)}px`)
    el.style.animationDelay = `${(Math.random() * 0.35).toFixed(2)}s`
    document.body.appendChild(el)
    els.push(el)
  }
  timers.push(setTimeout(() => {
    els.forEach((el) => el.remove())
  }, 2600))
}

export function useMusicNotes() {
  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    window.addEventListener('keydown', onKey)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKey)
    timers.forEach(clearTimeout)
    timers = []
    document.querySelectorAll('.music-note').forEach((el) => el.remove())
  })
}
