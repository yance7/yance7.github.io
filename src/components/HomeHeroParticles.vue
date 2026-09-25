<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BrandMark from './BrandMark.vue'
import {
  HOME_HERO_PARTICLE_GATHER_DURATION_MS,
  createSeededRandom,
  getHomeHeroParticleCount,
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

const FRAME_INTERVAL_MS = 1000 / 30
const PARTICLE_SEED = 0x59a7ce

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const renderMode = ref(props.animateIntro ? 'initializing' : 'static')
const particleState = ref(props.animateIntro ? 'gathering' : 'static')
const particleCount = ref(0)
const lastInput = ref('none')

let canvasContext: CanvasRenderingContext2D | null = null
let maskCanvas: HTMLCanvasElement | null = null
let image: HTMLImageElement | null = null
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
let colors = { gold: '#c7a96b', aqua: '#71b8b2', dim: '#8a8a86' }
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let themeObserver: MutationObserver | null = null

function readThemeColors() {
  const style = getComputedStyle(stage.value ?? document.documentElement)
  colors = {
    gold: style.getPropertyValue('--gold').trim() || colors.gold,
    aqua: style.getPropertyValue('--aqua').trim() || colors.aqua,
    dim: style.getPropertyValue('--dim').trim() || colors.dim
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
  if (!image || !maskCanvas) throw new Error('HomeHero particle image is unavailable')
  maskCanvas.width = Math.ceil(width)
  maskCanvas.height = Math.ceil(height)
  const context = maskCanvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('HomeHero particle mask context is unavailable')

  context.clearRect(0, 0, width, height)
  const logoSize = Math.min(isMobile ? 112 : 220, width * 0.28, height * 0.56)
  context.drawImage(image, (width - logoSize) / 2, (height - logoSize) / 2, logoSize, logoSize)

  const labelSize = Math.max(8, Math.min(12, width * 0.029))
  context.fillStyle = '#fff'
  context.font = `600 ${labelSize}px Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('RESEARCH   BUILD   LIVE', width / 2, height - Math.max(24, labelSize * 2.4))

  const imageData = context.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
  const alpha = new Uint8Array(maskCanvas.width * maskCanvas.height)
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = imageData.data[index * 4 + 3] ?? 0
  }

  const count = getHomeHeroParticleCount(width, height, isMobile)
  return sampleMaskTargets(alpha, maskCanvas.width, maskCanvas.height, count, PARTICLE_SEED)
}

function resizeCanvas() {
  const element = stage.value
  const targetCanvas = canvas.value
  if (!element || !targetCanvas || !canvasContext || !image) return

  const bounds = element.getBoundingClientRect()
  const width = Math.floor(bounds.width)
  const height = Math.floor(bounds.height)
  if (width <= 0 || height <= 0) return

  logicalWidth = width
  logicalHeight = height
  pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
  targetCanvas.width = Math.ceil(width * pixelRatio)
  targetCanvas.height = Math.ceil(height * pixelRatio)
  canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

  const isMobile = width <= 760 || window.matchMedia('(pointer: coarse)').matches
  const targets = createMaskTargets(width, height, isMobile)
  if (targets.length < 200) throw new Error('HomeHero particle target image is too sparse')

  const random = createSeededRandom(PARTICLE_SEED ^ 0x17a9)
  particles = targets.map((target, index) => ({
    targetX: target.x,
    targetY: target.y,
    startX: random() * width,
    startY: random() * height,
    delayMs: target.delayMs,
    size: 0.7 + random() * 0.9,
    color: target.y > height * 0.78 || index % 11 === 0 ? colors.dim : index % 4 === 0 ? colors.aqua : colors.gold,
    offsetX: 0,
    offsetY: 0,
    drawX: target.x,
    drawY: target.y,
    opacity: 0.35
  }))
  particleCount.value = particles.length
  drawParticles(startedAt)
}

function drawParticles(now: number) {
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

    particle.offsetX += (targetOffsetX - particle.offsetX) * 0.24
    particle.offsetY += (targetOffsetY - particle.offsetY) * 0.24
    if (Math.abs(targetOffsetX - particle.offsetX) > 0.2 || Math.abs(targetOffsetY - particle.offsetY) > 0.2) {
      needsAnotherFrame = true
    }

    particle.drawX = x + particle.offsetX
    particle.drawY = y + particle.offsetY
    particle.opacity = Math.round((0.35 + progress * 0.42) * 16) / 16
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

  lastFrameAt = now
  const hasOffsetMotion = drawParticles(now)
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
    particleState.value = 'paused'
    stopFrame()
  } else {
    updatePausedState()
  }
}

function handleIntersection(entries: IntersectionObserverEntry[]) {
  visibleInViewport = entries.some((entry) => entry.isIntersecting)
  if (!visibleInViewport) {
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

async function initializeParticles() {
  const introStartedAt = props.introStartedAt
  if (!props.animateIntro || introStartedAt === null || !canvas.value || !stage.value) return
  disposed = false
  pageVisible = document.visibilityState === 'visible'
  startedAt = introStartedAt
  readThemeColors()

  try {
    canvasContext = canvas.value.getContext('2d', { alpha: true })
    maskCanvas = document.createElement('canvas')
    image = new Image()
    image.src = '/assets/brand/yance-mark-fallback.png'
    await image.decode()
    if (!canvasContext || !maskCanvas.getContext('2d', { willReadFrequently: true })) {
      throw new Error('HomeHero Canvas 2D is unavailable')
    }
    if (disposed || !canvas.value) return

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
        particle.color = particle.targetY > logicalHeight * 0.78 || index % 11 === 0
          ? colors.dim
          : index % 4 === 0 ? colors.aqua : colors.gold
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
  if (props.animateIntro) void initializeParticles()
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
    <span class="home-hero-particles-orbit home-hero-particles-orbit-one"></span>
    <span class="home-hero-particles-orbit home-hero-particles-orbit-two"></span>
    <span class="home-hero-particles-dot home-hero-particles-dot-one"></span>
    <span class="home-hero-particles-dot home-hero-particles-dot-two"></span>
    <canvas
      v-if="props.animateIntro && renderMode !== 'static-fallback'"
      ref="canvas"
      class="home-hero-particles-canvas"
      :data-particle-state="particleState"
      :data-particle-count="particleCount"
      :data-last-input="lastInput"
    ></canvas>
    <div class="home-hero-particles-mark">
      <BrandMark variant="full" />
    </div>
    <div class="home-hero-particles-labels">
      <span>RESEARCH</span>
      <span>BUILD</span>
      <span>LIVE</span>
    </div>
  </div>
</template>
