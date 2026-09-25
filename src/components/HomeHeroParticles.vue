<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  HOME_HERO_Y_BRANCH_PATH,
  HOME_HERO_Y_MIRROR_TRANSFORM,
  HOME_HERO_Y_STEM_PATH,
  HOME_HERO_Y_STROKE_WIDTH,
  HOME_HERO_Y_VECTOR_SIZE,
  HOME_HERO_PARTICLE_GATHER_DURATION_MS,
  createSeededRandom,
  getHomeHeroParticleCount,
  getHomeHeroParticlePixelRatio,
  getHomeHeroMotionEasing,
  getHomeHeroParticleState,
  sampleMaskTargets
} from '../utils/homeHeroParticles'

const props = defineProps<{ animateIntro: boolean; introStartedAt: number | null }>()

interface Particle {
  targetX: number
  targetY: number
  startX: number
  startY: number
  delayMs: number
  size: number
  color: string
  offsetX: number
  offsetY: number
  drawX: number
  drawY: number
  opacity: number
}

interface ParticlePointer {
  x: number
  y: number
  radius: number
  maxDisplacement: number
}

const FRAME_INTERVAL_MS = 1000 / 60
const PARTICLE_SEED = 0x59a7ce

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const renderMode = ref(props.animateIntro ? 'initializing' : 'static')
const particleState = ref(props.animateIntro ? 'gathering' : 'static')
const particleCount = ref(0)
const lastInput = ref('none')

let canvasContext: CanvasRenderingContext2D | null = null
let maskCanvas: HTMLCanvasElement | null = null
let particles: Particle[] = []
let pointer: ParticlePointer | null = null
let frameId = 0
let lastFrameAt = -Infinity
let startedAt = 0
let logicalWidth = 0
let logicalHeight = 0
let pixelRatio = 1
let visibleInViewport = true
let pageVisible = true
let disposed = false
let colors = { gold: '#b1843e', aqua: '#4e9087', light: '#e8dfcb' }
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let themeObserver: MutationObserver | null = null

function readThemeColors() {
  const style = getComputedStyle(stage.value ?? document.documentElement)
  colors = {
    gold: style.getPropertyValue('--gold').trim() || colors.gold,
    aqua: style.getPropertyValue('--aqua').trim() || colors.aqua,
    light: style.getPropertyValue('--hero-particle-light').trim() || colors.light
  }
}

function stopFrame() {
  if (!frameId) return
  cancelAnimationFrame(frameId)
  frameId = 0
}

function canDraw() {
  return !disposed && Boolean(canvasContext) && pageVisible && visibleInViewport
}

function updatePausedState() {
  if (!canDraw()) {
    particleState.value = 'paused'
    stopFrame()
    return
  }
  scheduleFrame()
}

function createMaskTargets(width: number, height: number, isMobile: boolean) {
  if (!maskCanvas) throw new Error('HomeHero particle mask canvas is unavailable')
  maskCanvas.width = Math.ceil(width)
  maskCanvas.height = Math.ceil(height)
  const context = maskCanvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('HomeHero particle mask context is unavailable')

  context.clearRect(0, 0, width, height)
  const markSize = Math.min(isMobile ? 168 : 196, width * 0.48, height * 0.68)
  const markScale = markSize / HOME_HERO_Y_VECTOR_SIZE
  const branch = new Path2D(HOME_HERO_Y_BRANCH_PATH)
  const stem = new Path2D(HOME_HERO_Y_STEM_PATH)

  context.save()
  context.translate((width - markSize) / 2, (height - markSize) / 2 - 8)
  context.scale(markScale, markScale)
  context.strokeStyle = '#fff'
  context.lineWidth = HOME_HERO_Y_STROKE_WIDTH
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.stroke(branch)
  context.save()
  context.translate(HOME_HERO_Y_VECTOR_SIZE, 0)
  context.scale(-1, 1)
  context.stroke(branch)
  context.restore()
  context.stroke(stem)
  context.restore()

  const imageData = context.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
  const alpha = new Uint8Array(maskCanvas.width * maskCanvas.height)
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = imageData.data[index * 4 + 3] ?? 0
  }

  const device = navigator as Navigator & { deviceMemory?: number }
  const count = getHomeHeroParticleCount(
    width,
    height,
    isMobile,
    device.deviceMemory ?? 4,
    navigator.hardwareConcurrency || 4
  )
  return sampleMaskTargets(alpha, maskCanvas.width, maskCanvas.height, count, PARTICLE_SEED, 1)
}

function resizeCanvas() {
  const element = stage.value
  const targetCanvas = canvas.value
  if (!element || !targetCanvas || !canvasContext) return

  const bounds = element.getBoundingClientRect()
  const width = Math.floor(bounds.width)
  const height = Math.floor(bounds.height)
  if (width <= 0 || height <= 0) return

  logicalWidth = width
  logicalHeight = height
  const device = navigator as Navigator & { deviceMemory?: number }
  pixelRatio = getHomeHeroParticlePixelRatio(
    window.devicePixelRatio || 1,
    device.deviceMemory ?? 4,
    navigator.hardwareConcurrency || 4
  )
  targetCanvas.width = Math.ceil(width * pixelRatio)
  targetCanvas.height = Math.ceil(height * pixelRatio)
  canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

  const isMobile = width <= 760 || window.matchMedia('(pointer: coarse)').matches
  const targets = createMaskTargets(width, height, isMobile)
  if (targets.length < 200) throw new Error('HomeHero vector particle target is too sparse')

  const random = createSeededRandom(PARTICLE_SEED ^ 0x17a9)
  particles = targets.map((target, index) => ({
    targetX: target.x,
    targetY: target.y,
    startX: random() * width,
    startY: random() * height,
    delayMs: target.delayMs,
    size: 0.72 + random() * 0.76,
    color: index % 23 === 0 ? colors.aqua : index % 5 === 0 ? colors.light : colors.gold,
    offsetX: 0,
    offsetY: 0,
    drawX: target.x,
    drawY: target.y,
    opacity: 0.35
  }))
  particleCount.value = particles.length
  drawParticles(startedAt, FRAME_INTERVAL_MS)
}

function drawParticles(now: number, deltaMs: number) {
  if (!canvasContext || !canvas.value) return false

  canvasContext.clearRect(0, 0, logicalWidth, logicalHeight)
  let needsAnotherFrame = false
  const elapsed = Math.max(0, now - startedAt)
  const groups = new Map<string, { color: string; opacity: number; particles: Particle[] }>()

  for (const particle of particles) {
    const span = HOME_HERO_PARTICLE_GATHER_DURATION_MS - particle.delayMs
    const progress = Math.max(0, Math.min(1, (elapsed - particle.delayMs) / span))
    const easedProgress = progress * progress * (3 - 2 * progress)
    const x = particle.startX + (particle.targetX - particle.startX) * easedProgress
    const y = particle.startY + (particle.targetY - particle.startY) * easedProgress
    let targetOffsetX = 0
    let targetOffsetY = 0

    if (pointer) {
      let deltaX = x - pointer.x
      let deltaY = y - pointer.y
      let distance = Math.hypot(deltaX, deltaY)
      if (distance < 0.1) {
        deltaX = particle.targetX - logicalWidth / 2 || 1
        deltaY = particle.targetY - logicalHeight / 2 || 1
        distance = Math.hypot(deltaX, deltaY)
      }
      if (distance < pointer.radius) {
        const force = 1 - distance / pointer.radius
        targetOffsetX = (deltaX / distance) * pointer.maxDisplacement * force
        targetOffsetY = (deltaY / distance) * pointer.maxDisplacement * force
      }
    }

    const easing = getHomeHeroMotionEasing(deltaMs)
    particle.offsetX += (targetOffsetX - particle.offsetX) * easing
    particle.offsetY += (targetOffsetY - particle.offsetY) * easing
    if (Math.abs(targetOffsetX - particle.offsetX) > 0.15 || Math.abs(targetOffsetY - particle.offsetY) > 0.15) {
      needsAnotherFrame = true
    }

    particle.drawX = x + particle.offsetX
    particle.drawY = y + particle.offsetY
    particle.opacity = Math.round((0.62 + progress * 0.24) * 16) / 16
    const groupKey = `${particle.color}:${particle.opacity}`
    let group = groups.get(groupKey)
    if (!group) {
      group = { color: particle.color, opacity: particle.opacity, particles: [] }
      groups.set(groupKey, group)
    }
    group.particles.push(particle)
  }

  for (const group of groups.values()) {
    canvasContext.globalAlpha = group.opacity
    canvasContext.fillStyle = group.color
    canvasContext.beginPath()
    for (const particle of group.particles) {
      canvasContext.moveTo(particle.drawX + particle.size, particle.drawY)
      canvasContext.arc(particle.drawX, particle.drawY, particle.size, 0, Math.PI * 2)
    }
    canvasContext.fill()
  }

  canvasContext.globalAlpha = 1
  return needsAnotherFrame
}

function renderFrame(now: number) {
  frameId = 0
  if (!canDraw()) {
    particleState.value = 'paused'
    return
  }

  if (now - lastFrameAt < FRAME_INTERVAL_MS) {
    frameId = requestAnimationFrame(renderFrame)
    return
  }

  const deltaMs = Number.isFinite(lastFrameAt) ? Math.min(now - lastFrameAt, 120) : FRAME_INTERVAL_MS
  lastFrameAt = now
  const hasOffsetMotion = drawParticles(now, deltaMs)
  const isGathering = getHomeHeroParticleState(startedAt, now) === 'gathering'
  particleState.value = isGathering ? 'gathering' : 'settled'
  if (isGathering || hasOffsetMotion) frameId = requestAnimationFrame(renderFrame)
}

function scheduleFrame() {
  if (!canDraw() || frameId) return
  frameId = requestAnimationFrame(renderFrame)
}

function pointerPosition(event: PointerEvent) {
  const bounds = canvas.value?.getBoundingClientRect()
  if (!bounds) return
  const isTouch = event.pointerType === 'touch'
  pointer = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
    radius: isTouch ? 72 : 120,
    maxDisplacement: isTouch ? 24 : 40
  }
  scheduleFrame()
}

function handlePointerMove(event: PointerEvent) {
  pointerPosition(event)
}

function handlePointerDown(event: PointerEvent) {
  lastInput.value = event.pointerType === 'touch' ? 'touch' : 'mouse'
  pointerPosition(event)
}

function clearPointer() {
  pointer = null
  scheduleFrame()
}

function handleVisibilityChange() {
  pageVisible = document.visibilityState === 'visible'
  if (!pageVisible) {
    pointer = null
    particleState.value = 'paused'
    stopFrame()
  } else {
    updatePausedState()
  }
}

function handleIntersection(entries: IntersectionObserverEntry[]) {
  visibleInViewport = entries.some((entry) => entry.isIntersecting)
  if (!visibleInViewport) {
    pointer = null
    particleState.value = 'paused'
    stopFrame()
  } else {
    updatePausedState()
  }
}

function removeCanvasListeners() {
  const element = canvas.value
  if (!element) return
  element.removeEventListener('pointermove', handlePointerMove)
  element.removeEventListener('pointerdown', handlePointerDown)
  element.removeEventListener('pointerup', clearPointer)
  element.removeEventListener('pointercancel', clearPointer)
  element.removeEventListener('pointerleave', clearPointer)
}

function useStaticFallback() {
  disposed = true
  stopFrame()
  removeCanvasListeners()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  renderMode.value = 'static-fallback'
  particleState.value = 'fallback'
  particleCount.value = 0
}

function initializeParticles() {
  const introStartedAt = props.introStartedAt
  if (!props.animateIntro || introStartedAt === null || !canvas.value || !stage.value) return
  disposed = false
  pageVisible = document.visibilityState === 'visible'
  startedAt = introStartedAt
  readThemeColors()

  try {
    canvasContext = canvas.value.getContext('2d', { alpha: true })
    maskCanvas = document.createElement('canvas')
    if (!canvasContext || !maskCanvas.getContext('2d', { willReadFrequently: true })) {
      throw new Error('HomeHero Canvas 2D is unavailable')
    }

    resizeCanvas()
    renderMode.value = 'canvas'
    particleState.value = pageVisible ? getHomeHeroParticleState(startedAt, performance.now()) : 'paused'

    canvas.value.addEventListener('pointermove', handlePointerMove, { passive: true })
    canvas.value.addEventListener('pointerdown', handlePointerDown, { passive: true })
    canvas.value.addEventListener('pointerup', clearPointer, { passive: true })
    canvas.value.addEventListener('pointercancel', clearPointer, { passive: true })
    canvas.value.addEventListener('pointerleave', clearPointer, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        try {
          readThemeColors()
          resizeCanvas()
          scheduleFrame()
        } catch {
          useStaticFallback()
        }
      })
      resizeObserver.observe(stage.value)
    }
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(handleIntersection, { threshold: 0 })
      intersectionObserver.observe(stage.value)
    }
    themeObserver = new MutationObserver(() => {
      readThemeColors()
      particles.forEach((particle, index) => {
        particle.color = index % 23 === 0 ? colors.aqua : index % 5 === 0 ? colors.light : colors.gold
      })
      scheduleFrame()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    updatePausedState()
  } catch {
    useStaticFallback()
  }
}

watch(() => props.animateIntro, (shouldAnimate) => {
  if (shouldAnimate) return
  disposed = true
  stopFrame()
  removeCanvasListeners()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  canvasContext = null
  renderMode.value = 'static'
  particleState.value = 'static'
  particleCount.value = 0
}, { flush: 'post' })

onMounted(() => {
  if (props.animateIntro) initializeParticles()
})

onBeforeUnmount(() => {
  disposed = true
  stopFrame()
  removeCanvasListeners()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div
    ref="stage"
    class="home-hero-particles"
    :data-render-mode="renderMode"
    aria-hidden="true"
  >
    <span class="home-hero-particles-ring"></span>
    <canvas
      v-if="props.animateIntro && renderMode !== 'static-fallback'"
      ref="canvas"
      class="home-hero-particles-canvas"
      data-target-source="vector-path"
      :data-particle-state="particleState"
      :data-particle-count="particleCount"
      :data-last-input="lastInput"
    ></canvas>
    <svg class="home-hero-particles-mark" data-mark-source="vector" viewBox="0 0 220 220" focusable="false" aria-hidden="true">
      <path data-y-branch="left" :d="HOME_HERO_Y_BRANCH_PATH" />
      <path data-y-branch="right" :d="HOME_HERO_Y_BRANCH_PATH" :transform="HOME_HERO_Y_MIRROR_TRANSFORM" />
      <path data-y-stem="true" :d="HOME_HERO_Y_STEM_PATH" />
    </svg>
    <div class="home-hero-particles-labels">
      <span>RESEARCH</span>
      <span>BUILD</span>
      <span>LIVE</span>
    </div>
  </div>
</template>
