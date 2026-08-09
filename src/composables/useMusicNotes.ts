import { onMounted, onUnmounted } from 'vue'

const SEQUENCE = ['y', 'a', 'n', 'c', 'e']
const NOTES = ['♪', '♫', '♬', '♩']
let progress = 0
let timers: number[] = []

function onKey(e: KeyboardEvent) {
  if (e.repeat) return
  const target = e.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return
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
  const els: HTMLElement[] = []
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
  let timer = 0
  timer = window.setTimeout(() => {
    els.forEach((el) => el.remove())
    timers = timers.filter((id) => id !== timer)
  }, 2600)
  timers.push(timer)
}

export function useMusicNotes() {
  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    window.addEventListener('keydown', onKey)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKey)
    progress = 0
    timers.forEach((timer) => window.clearTimeout(timer))
    timers = []
    document.querySelectorAll('.music-note').forEach((el) => el.remove())
  })
}
