<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { HomeHeroParticleEngine } from '../utils/homeHeroParticlePhysics'
import { createHomeHeroParticleScene, createHomeHeroTextMask, getHomeHeroParticleGridStep, getHomeHeroParticlePixelRatio, type HomeHeroGlyphLayout } from '../utils/homeHeroParticleScene'
import { HomeHeroParticleRenderer, type HomeHeroParticleColors } from '../utils/homeHeroParticleRenderer'

const props = defineProps<{ animateIntro: boolean; introStartedAt: number | null }>()
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const fallbackText = ref<SVGTextElement | null>(null)
const renderMode = ref('initializing')
const particleState = ref('initializing')
const particleCount = ref(0)
const sourceParticleCount = ref(0)
const inkArea = ref(0)
const movingParticleCount = ref(0)
const pixelRatio = ref(1)
const gridStep = ref(2)
const lastInput = ref('none')
const frameCount = ref(0)
const animationRunning = ref(false)
const physicsMs = ref(0)
const renderMs = ref(0)
const peakActive = ref(0)
const peakCandidates = ref(0)
const fallbackSize = ref({ width: 1080, height: 430 })
const glyphLayout = ref<HomeHeroGlyphLayout>({ fontSize: 220, x: 175, baseline: 290, bounds: { left: 175, top: 130, width: 730, height: 170 } })
const glyphFont = ref({ family: '', weight: '400' })

let engine: HomeHeroParticleEngine | null = null
let renderer: HomeHeroParticleRenderer | null = null
let frameId = 0
let frameFallback = 0
let generation = 0
let disposed = false
let firstScene = true
let visible = true
let focused = true
let pageVisible = true
let inputDownAt = 0
let dimensionsKey = ''
let pointerBounds: DOMRect | null = null
let inputBounds: DOMRect | null = null
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
  return { word: style.getPropertyValue('--hero-particle').trim() }
}
function clearFrame() {
  if (frameId) cancelAnimationFrame(frameId)
  if (frameFallback) clearTimeout(frameFallback)
  frameId = 0
  frameFallback = 0
}
function schedule() {
  if (frameId || frameFallback || !running()) return
  frameId = requestAnimationFrame(animate)
  // Some foreground WebKit loads stop delivering RAF callbacks temporarily.
  // Share one pending frame with a bounded fallback, cancelled by normal RAF
  // delivery and every lifecycle pause. Settled scenes schedule neither.
  frameFallback = window.setTimeout(animate, 250)
}
function clearScene() {
  clearFrame()
  renderer?.destroy()
  renderer = null
  engine = null
  movingParticleCount.value = 0
  animationRunning.value = false
  dimensionsKey = ''
  touches.clear()
  pointerBounds = null
  inputBounds = null
}
function staticMode(mode = 'static') {
  firstScene = false
  generation += 1
  clearScene()
  renderMode.value = mode
  particleState.value = mode
}
function dynamicParticles() {
  return [...(engine?.active ?? [])].map(id => engine!.scene.particles[id]!)
}
function updateState() {
  movingParticleCount.value = engine?.active.size ?? 0
  peakActive.value = engine?.stats.peakActive ?? 0
  peakCandidates.value = engine?.stats.peakCandidates ?? 0
  particleState.value = engine?.phase ?? renderMode.value
  animationRunning.value = engine?.needsFrame ?? false
}
function animate() {
  clearFrame()
  // A browser can update the query without delivering its change event (for
  // example during native pinch emulation). Never leave a stale dynamic canvas.
  if (!disposed && !allowed()) {
    staticMode()
    return
  }
  if (!running() || !engine || !renderer) return
  const start = performance.now()
  // WebKit can deliver an RAF timestamp older than live input. Use the same
  // monotonic clock as input and lifecycle updates, avoiding rewind or lag.
  const at = start / 1000
  engine.advanceTo(at)
  physicsMs.value = performance.now() - start
  const renderStart = performance.now()
  renderer.drawActive(dynamicParticles())
  renderMs.value = performance.now() - renderStart
  frameCount.value += 1
  updateState()
  if (engine.needsFrame) schedule()
}

// This independent SVG measurement also works when Canvas/readback is blocked.
async function fitStaticGlyph(width: number, height: number, revision = generation) {
  await nextTick()
  const text = fallbackText.value
  if (!text || disposed || revision !== generation) return
  const box = text.getBBox()
  if (box.width <= 0 || box.height <= 0) return
  const previous = glyphLayout.value
  const scale = Math.min(width * (width <= 760 ? 0.82 : 0.74) / box.width, height * 0.48 / box.height)
  glyphLayout.value = { fontSize: previous.fontSize * scale,
    x: (width - box.width * scale) / 2 - (box.x - previous.x) * scale,
    baseline: (height - box.height * scale) / 2 - (box.y - previous.baseline) * scale,
    bounds: { left: (width - box.width * scale) / 2, top: (height - box.height * scale) / 2, width: box.width * scale, height: box.height * scale } }
}

async function rebuild(force = false) {
  const bounds = stage.value?.getBoundingClientRect()
  if (!bounds || disposed) return
  const width = Math.floor(bounds.width - stage.value!.clientLeft * 2)
  const height = Math.floor(bounds.height - stage.value!.clientTop * 2)
  if (width < 1 || height < 1) return
  fallbackSize.value = { width, height }
  const title = stage.value?.closest('.home-hero')?.querySelector<HTMLElement>('.home-hero-typewriter')
  const style = getComputedStyle(title ?? stage.value!)
  glyphFont.value = { family: style.fontFamily, weight: style.fontWeight }
  gridStep.value = getHomeHeroParticleGridStep(lowResource())
  if (!allowed()) {
    staticMode()
    const revision = generation
    await fitStaticGlyph(width, height, revision)
    await document.fonts.load(`${style.fontWeight} 100px ${style.fontFamily}`, 'YANCE').catch(() => [])
    await fitStaticGlyph(width, height, revision)
    return
  }
  const step = getHomeHeroParticleGridStep(lowResource())
  const ratio = getHomeHeroParticlePixelRatio(devicePixelRatio, lowResource())
  const key = `${width}:${height}:${step}:${ratio}`
  if (!force && dimensionsKey === key && renderer) return
  const revision = ++generation
  clearScene()
  renderMode.value = 'initializing'
  await fitStaticGlyph(width, height, revision)
  if (disposed || revision !== generation || !allowed() || !canvas.value) return
  try {
    // YANCE uses the installed Latin serif stack; do not wait for CJK fonts.
    await document.fonts.load(`${style.fontWeight} 100px ${style.fontFamily}`, 'YANCE')
    if (disposed || revision !== generation || !allowed() || !canvas.value) return
    const mask = createHomeHeroTextMask(width, height, style.fontFamily, style.fontWeight)
    glyphLayout.value = mask.layout
    const scene = createHomeHeroParticleScene({ width, height, rgba: mask.rgba, gridStep: step, alphaThreshold: 72, maxParticles: lowResource() ? 4000 : 9000 })
    if (scene.particles.length < 40) throw new Error('HomeHero text mask is incomplete')
    const at = performance.now() / 1000
    engine = new HomeHeroParticleEngine(scene, { startedAt: at, mobile: width <= 760 })
    renderer = new HomeHeroParticleRenderer(canvas.value, { scene, pixelRatio: ratio, colors: colors() })
    dimensionsKey = key
    gridStep.value = step
    pixelRatio.value = ratio
    particleCount.value = scene.particles.length
    sourceParticleCount.value = scene.sampledCount
    inkArea.value = Math.round(mask.inkArea)
    if (firstScene && props.animateIntro) engine.gather()
    firstScene = false
    renderMode.value = 'canvas'
    updatePausedState()
  } catch {
    staticMode('static-fallback')
    await fitStaticGlyph(width, height)
  }
}

function updatePausedState() {
  if (!engine || !renderer) return
  if (!running()) {
    clearFrame()
    engine.reset(performance.now() / 1000)
    touches.clear()
    pointerBounds = null
    inputBounds = null
    renderer.drawStatic()
    movingParticleCount.value = 0
    animationRunning.value = false
    particleState.value = 'paused'
  } else {
    engine.advanceTo(performance.now() / 1000)
    renderer.drawActive(dynamicParticles())
    updateState()
    if (engine.needsFrame) schedule()
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
  inputBounds = pointerBounds
  const samples = event.getCoalescedEvents?.() ?? []
  for (const sample of samples.length ? samples : [event]) {
    engine.pointer.move({ pointerId: event.pointerId, pointerType: event.pointerType,
      x: sample.clientX - pointerBounds.left - stage.value!.clientLeft,
      y: sample.clientY - pointerBounds.top - stage.value!.clientTop, at: eventTime(sample) })
  }
  lastInput.value = event.pointerType || 'pointer'
  schedule()
}
function down(event: PointerEvent) {
  if (event.pointerType !== 'touch') return
  touches.add(event.pointerId)
  if (touches.size > 1) {
    engine?.pointer.reset()
    schedule()
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
  // A queued scroll can arrive after input sampled the final stage geometry.
  // Only cancel that stream if its coordinate frame actually changed.
  if (!inputBounds || inputBounds.left !== bounds.left || inputBounds.top !== bounds.top ||
    inputBounds.width !== bounds.width || inputBounds.height !== bounds.height) {
    engine?.pointer.reset()
    inputBounds = null
  }
  pointerBounds = null
  visible = bounds.bottom > 0 && bounds.top < innerHeight
  updatePausedState()
}
function resize() { void rebuild() }
function preference() {
  void rebuild(true)
}
function preferenceSentinel(event: TransitionEvent) {
  if (event.propertyName === 'width' || event.propertyName === 'height') preference()
}
function theme() {
  if (!renderer || !engine) return
  renderer.setColors(colors())
  renderer.drawActive(dynamicParticles())
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
  stage.value!.addEventListener('transitionend', preferenceSentinel)
  void rebuild()
})
onBeforeUnmount(() => {
  disposed = true
  generation += 1
  clearScene()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  stage.value?.removeEventListener('transitionend', preferenceSentinel)
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
    :data-source-particle-count="sourceParticleCount"
    :data-ink-area="inkArea"
    :data-moving-particle-count="movingParticleCount"
    :data-particle-state="particleState"
    :data-pixel-ratio="pixelRatio"
    :data-last-input="lastInput"
    :data-frame-count="frameCount"
    :data-animation-running="animationRunning"
    :data-physics-ms="physicsMs"
    :data-render-ms="renderMs"
    :data-peak-active="peakActive"
    :data-peak-candidates="peakCandidates"
    :data-cache-count="renderer ? 1 : 0"
    :data-ink-bounds="JSON.stringify(glyphLayout.bounds)"
    aria-hidden="true"
  >
    <span class="home-hero-particles-preference-sentinel" aria-hidden="true"></span>
    <canvas v-if="renderMode === 'canvas' || renderMode === 'initializing'" ref="canvas" class="home-hero-particles-canvas" aria-hidden="true"></canvas>
    <svg class="home-hero-particles-word" :viewBox="`0 0 ${fallbackSize.width} ${fallbackSize.height}`" :style="{ fontFamily: glyphFont.family, fontWeight: glyphFont.weight }" aria-hidden="true">
      <defs><pattern id="home-hero-static-dots" :width="gridStep" :height="gridStep" patternUnits="userSpaceOnUse"><circle :cx="gridStep / 2" :cy="gridStep / 2" r=".8" fill="currentColor" /></pattern></defs>
      <text ref="fallbackText" :x="glyphLayout.x" :y="glyphLayout.baseline" :font-size="glyphLayout.fontSize" fill="url(#home-hero-static-dots)">YANCE</text>
    </svg>
  </div>
</template>
