<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { HomeHeroParticleEngine, type HomeHeroParticle } from '../utils/homeHeroParticlePhysics'
import { createHomeHeroParticleScene, createHomeHeroTextMask, getHomeHeroParticleGridStep, getHomeHeroParticlePixelRatio } from '../utils/homeHeroParticleScene'
import { HomeHeroParticleRenderer, type HomeHeroParticleColors } from '../utils/homeHeroParticleRenderer'

const props = defineProps<{ animateIntro: boolean; introStartedAt: number | null }>()
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const renderMode = ref('initializing')
const particleState = ref('initializing')
const particleCount = ref(0)
const fieldCount = ref(0)
const movingParticleCount = ref(0)
const ambientCount = ref(0)
const pixelRatio = ref(1)
const gridStep = ref(5)
const lastInput = ref('none')
const frameCount = ref(0)
const physicsMs = ref(0)
const renderMs = ref(0)
const peakActive = ref(0)
const peakCandidates = ref(0)
const fallbackSize = ref({ width: 1080, height: 430 })
const fallbackFontSize = ref(220)

let engine: HomeHeroParticleEngine | null = null
let renderer: HomeHeroParticleRenderer | null = null
let ambient: HomeHeroParticle[] = []
let frameId = 0
let generation = 0
let disposed = false
let firstScene = true
let visible = true
let focused = true
let pageVisible = true
let introUntil = 0
let ambientUntil = 0
let inputDownAt = 0
let dimensionsKey = ''
let pointerBounds: DOMRect | null = null
let motionMedia: MediaQueryList | null = null
let forcedMedia: MediaQueryList | null = null
let connection: (EventTarget & { saveData?: boolean }) | undefined
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let themeObserver: MutationObserver | null = null
const touches = new Set<number>()

function lowResource() {
  const device = navigator as Navigator & { deviceMemory?: number }
  return device.deviceMemory !== undefined && device.deviceMemory <= 2 || navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2
}
function allowed() { return !motionMedia?.matches && !forcedMedia?.matches && !connection?.saveData }
function running() { return !disposed && allowed() && visible && focused && pageVisible && renderMode.value === 'canvas' }
function colors(): HomeHeroParticleColors {
  const style = getComputedStyle(stage.value ?? document.documentElement)
  return { word: style.getPropertyValue('--hero-particle').trim(), field: style.getPropertyValue('--hero-field').trim(),
    trail: style.getPropertyValue('--hero-particle-trail').trim(), ambient: style.getPropertyValue('--hero-ambient').trim() }
}
function clearFrame() {
  if (frameId) cancelAnimationFrame(frameId)
  frameId = 0
}
function schedule() { if (!frameId && running()) frameId = requestAnimationFrame(animate) }
function clearScene() {
  clearFrame()
  renderer?.destroy()
  renderer = null
  engine = null
  ambient = []
  ambientCount.value = 0
  movingParticleCount.value = 0
  dimensionsKey = ''
  touches.clear()
  pointerBounds = null
}
function staticMode(mode = 'static') {
  generation += 1
  clearScene()
  renderMode.value = mode
  particleState.value = mode
}
function dynamicParticles(at: number) {
  const particles = [...(engine?.active ?? [])].map(id => engine!.scene.particles[id]!)
  const remaining = ambientUntil - at
  ambientCount.value = remaining > 0 ? ambient.length : 0
  for (const p of ambient) {
    const envelope = Math.min(1, Math.max(0, remaining / 0.5))
    const phase = p.id * 2.3999632297
    p.x = p.homeX + Math.sin(at * 1.4 + phase) * 4 * envelope
    p.y = p.homeY + Math.cos(at * 1.6 + phase) * 3 * envelope
    if (envelope > 0) particles.push(p)
  }
  return particles
}
function updateState(at: number) {
  movingParticleCount.value = engine?.active.size ?? 0
  peakActive.value = engine?.stats.peakActive ?? 0
  peakCandidates.value = engine?.stats.peakCandidates ?? 0
  particleState.value = at < introUntil ? 'gathering' : !engine?.active.size ? 'settled' : engine.pointer.connected ? 'disturbed' : 'recovering'
}
function animate() {
  frameId = 0
  if (!running() || !engine || !renderer) return
  const start = performance.now()
  // WebKit can deliver an RAF timestamp older than live input. Use the same
  // monotonic clock as input and lifecycle updates, avoiding rewind or lag.
  const at = start / 1000
  engine.advanceTo(at)
  physicsMs.value = performance.now() - start
  const renderStart = performance.now()
  renderer.drawActive(dynamicParticles(at))
  renderMs.value = performance.now() - renderStart
  frameCount.value += 1
  updateState(at)
  if (engine.needsFrame || at < introUntil || at < ambientUntil) schedule()
}

async function rebuild(force = false) {
  const bounds = stage.value?.getBoundingClientRect()
  if (!bounds || disposed) return
  const width = Math.floor(bounds.width - stage.value!.clientLeft * 2)
  const height = Math.floor(bounds.height - stage.value!.clientTop * 2)
  if (width < 1 || height < 1) return
  fallbackSize.value = { width, height }
  // The independent SVG fallback uses the same serif stack and width/height fit.
  fallbackFontSize.value = Math.min(width * (width <= 760 ? 0.82 : 0.74) / 3.3, height * 0.48 / 0.72)
  if (!allowed()) {
    staticMode()
    return
  }
  const step = getHomeHeroParticleGridStep(lowResource())
  const ratio = getHomeHeroParticlePixelRatio(devicePixelRatio, lowResource())
  const key = `${width}:${height}:${step}:${ratio}`
  if (!force && dimensionsKey === key && renderer) return
  const revision = ++generation
  clearScene()
  renderMode.value = 'initializing'
  await nextTick()
  if (disposed || revision !== generation || !allowed() || !canvas.value) return
  try {
    const title = stage.value?.closest('.home-hero')?.querySelector<HTMLElement>('.home-hero-typewriter')
    const style = getComputedStyle(title ?? stage.value!)
    // YANCE uses the installed Latin serif stack; do not wait for CJK fonts.
    const mask = createHomeHeroTextMask(width, height, style.fontFamily, style.fontWeight)
    const scene = createHomeHeroParticleScene({ width, height, rgba: mask, gridStep: step, alphaThreshold: 72 })
    if (scene.wordCount < 40) throw new Error('HomeHero text mask is incomplete')
    const at = performance.now() / 1000
    engine = new HomeHeroParticleEngine(scene, { startedAt: at, mobile: width <= 760 })
    const count = lowResource() ? 8 : width <= 760 ? 12 : 20
    ambient = Array.from({ length: count }, (_, i) => {
      const homeX = width * (0.08 + ((i * 73 % 101) / 101) * 0.84)
      const homeY = height * (0.1 + ((i * 47 % 103) / 103) * 0.76)
      return { id: -i - 1, kind: 'field', homeX, homeY, x: homeX, y: homeY, vx: 0, vy: 0, row: 0, column: 0, settledForMs: 40 }
    })
    renderer = new HomeHeroParticleRenderer(canvas.value, { scene, pixelRatio: ratio, colors: colors(), ambient })
    dimensionsKey = key
    gridStep.value = step
    pixelRatio.value = ratio
    particleCount.value = scene.wordCount
    fieldCount.value = scene.fieldCount
    const startedAt = (props.introStartedAt ?? 0) / 1000
    introUntil = firstScene && props.animateIntro && startedAt > 0 ? startedAt + 1.6 : 0
    if (at < introUntil) {
      engine.gather()
      ambientUntil = introUntil
    } else ambientUntil = 0
    firstScene = false
    renderMode.value = 'canvas'
    renderer.drawActive(dynamicParticles(at))
    updateState(at)
    updatePausedState()
  } catch { staticMode('static-fallback') }
}

function updatePausedState() {
  if (!engine || !renderer) return
  if (!running()) {
    clearFrame()
    engine.reset(performance.now() / 1000)
    ambientUntil = 0
    introUntil = 0
    touches.clear()
    pointerBounds = null
    renderer.drawStatic()
    movingParticleCount.value = 0
    ambientCount.value = 0
    particleState.value = 'paused'
  } else {
    engine.advanceTo(performance.now() / 1000)
    updateState(performance.now() / 1000)
    if (engine.moving || performance.now() / 1000 < introUntil || performance.now() / 1000 < ambientUntil) schedule()
  }
}
function eventTime(event: PointerEvent) {
  const now = performance.now()
  return (Math.abs(event.timeStamp - now) < 10000 ? event.timeStamp : now) / 1000
}
function move(event: PointerEvent) {
  if (!running() || !engine || event.pointerType === 'touch' && (touches.size !== 1 || !touches.has(event.pointerId))) return
  if (!frameId) engine.advanceTo(performance.now() / 1000)
  pointerBounds ??= stage.value!.getBoundingClientRect()
  const samples = event.getCoalescedEvents?.() ?? []
  for (const sample of samples.length ? samples : [event]) {
    engine.pointer.move({ pointerId: event.pointerId, pointerType: event.pointerType,
      x: sample.clientX - pointerBounds.left - stage.value!.clientLeft,
      y: sample.clientY - pointerBounds.top - stage.value!.clientTop, at: eventTime(sample) })
  }
  lastInput.value = event.pointerType || 'pointer'
  ambientUntil = performance.now() / 1000 + 3
  schedule()
}
function down(event: PointerEvent) {
  if (event.pointerType !== 'touch') return
  touches.add(event.pointerId)
  if (touches.size > 1) {
    engine?.pointer.reset()
    return
  }
  inputDownAt = eventTime(event)
  move(event)
}
function release(input: Event) {
  const event = input as PointerEvent
  if (event.pointerType === 'touch') touches.delete(event.pointerId)
  engine?.pointer.release(event.pointerType === 'touch' && event.type === 'pointerup' ? Math.max(eventTime(event), inputDownAt + 1 / 60) : eventTime(event))
  if (event.type === 'pointercancel') engine?.pointer.reset()
  pointerBounds = null
  schedule()
}
function intersection(entries: IntersectionObserverEntry[]) {
  visible = Boolean(entries[0]?.isIntersecting)
  updatePausedState()
}
function visibility() {
  pageVisible = document.visibilityState === 'visible'
  updatePausedState()
}
function blur() {
  focused = false
  updatePausedState()
}
function focus() {
  focused = true
  updatePausedState()
}
function pageShow(event: PageTransitionEvent) {
  pageVisible = document.visibilityState === 'visible'
  focused = true
  if (event.persisted) void rebuild(true)
  else updatePausedState()
}
function scroll() {
  const bounds = stage.value?.getBoundingClientRect()
  if (!bounds) return
  pointerBounds = null
  engine?.pointer.reset()
  visible = bounds.bottom > 0 && bounds.top < innerHeight
  updatePausedState()
}
function resize() { void rebuild() }
function preference() {
  if (!allowed()) staticMode()
  else void rebuild(true)
}
function theme() {
  if (!renderer || !engine) return
  renderer.setColors(colors())
  renderer.drawActive(dynamicParticles(performance.now() / 1000))
}

watch(() => props.introStartedAt, () => { if (!engine && allowed()) void rebuild() })
onMounted(() => {
  motionMedia = matchMedia('(prefers-reduced-motion: reduce)')
  forcedMedia = matchMedia('(forced-colors: active)')
  connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection
  motionMedia.addEventListener('change', preference)
  forcedMedia.addEventListener('change', preference)
  connection?.addEventListener('change', preference)
  pageVisible = document.visibilityState === 'visible'
  focused = document.hasFocus()
  stage.value!.addEventListener('pointermove', move, { passive: true })
  stage.value!.addEventListener('pointerdown', down, { passive: true })
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) stage.value!.addEventListener(type, release, { passive: true })
  document.addEventListener('visibilitychange', visibility)
  document.addEventListener('scroll', scroll, { capture: true, passive: true })
  window.addEventListener('resize', resize, { passive: true })
  window.addEventListener('blur', blur)
  window.addEventListener('focus', focus)
  window.addEventListener('pageshow', pageShow)
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(stage.value!)
  }
  if ('IntersectionObserver' in window) {
    intersectionObserver = new IntersectionObserver(intersection)
    intersectionObserver.observe(stage.value!)
  }
  themeObserver = new MutationObserver(theme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  void rebuild()
})
onBeforeUnmount(() => {
  disposed = true
  generation += 1
  clearScene()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  motionMedia?.removeEventListener('change', preference)
  forcedMedia?.removeEventListener('change', preference)
  connection?.removeEventListener('change', preference)
  stage.value?.removeEventListener('pointermove', move)
  stage.value?.removeEventListener('pointerdown', down)
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) stage.value?.removeEventListener(type, release)
  document.removeEventListener('visibilitychange', visibility)
  document.removeEventListener('scroll', scroll, true)
  window.removeEventListener('resize', resize)
  window.removeEventListener('blur', blur)
  window.removeEventListener('focus', focus)
  window.removeEventListener('pageshow', pageShow)
})
</script>

<template>
  <div
    ref="stage"
    class="home-hero-particles"
    :data-render-mode="renderMode"
    data-word="YANCE"
    :data-grid-step="gridStep"
    :data-particle-count="particleCount"
    :data-field-count="fieldCount"
    :data-moving-particle-count="movingParticleCount"
    :data-ambient-count="ambientCount"
    :data-particle-state="particleState"
    :data-pixel-ratio="pixelRatio"
    :data-last-input="lastInput"
    :data-frame-count="frameCount"
    :data-physics-ms="physicsMs"
    :data-render-ms="renderMs"
    :data-peak-active="peakActive"
    :data-peak-candidates="peakCandidates"
    :data-cache-count="renderer ? 1 : 0"
    aria-hidden="true"
  >
    <canvas v-if="renderMode === 'canvas' || renderMode === 'initializing'" ref="canvas" class="home-hero-particles-canvas" aria-hidden="true"></canvas>
    <svg class="home-hero-particles-word" :viewBox="`0 0 ${fallbackSize.width} ${fallbackSize.height}`" aria-hidden="true">
      <defs><pattern id="home-hero-static-dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.7" fill="currentColor" /></pattern></defs>
      <text :x="fallbackSize.width / 2" :y="fallbackSize.height * 0.46 + fallbackFontSize * 0.34" text-anchor="middle" :font-size="fallbackFontSize" fill="url(#home-hero-static-dots)">YANCE</text>
    </svg>
    <div class="home-hero-particles-labels"><span>RESEARCH</span><span>BUILD</span><span>LIVE</span></div>
  </div>
</template>
