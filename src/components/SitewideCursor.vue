<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

type CursorContext = 'surface' | 'interactive' | 'text' | 'particle'

const INTERACTIVE_SELECTOR = 'a[href], button, [role="button"], [role="link"], summary, select, input[type="button"], input[type="submit"], input[type="reset"], input[type="checkbox"], input[type="radio"]'
const TEXT_SELECTOR = 'textarea, [contenteditable="true"], [role="textbox"], input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"]'
const PARTICLE_SELECTOR = '.home-hero-particles, .home-hero-particles-canvas'

const cursorElement = ref<HTMLDivElement | null>(null)
const isSupported = ref(false)
const isVisible = ref(false)
const context = ref<CursorContext>('surface')

let finePointerMedia: MediaQueryList | null = null
let hoverMedia: MediaQueryList | null = null
let reducedMotionMedia: MediaQueryList | null = null
let forcedColorsMedia: MediaQueryList | null = null
let observer: MutationObserver | null = null
let themeObserver: MutationObserver | null = null
let animationFrame = 0
let lastFrameTime = 0
let activationVersion = 0
let modalIsOpen = false
let cursorListenersAttached = false
let targetPosition = { x: 0, y: 0 }
let currentPosition = { x: 0, y: 0 }
let lastPointerPosition = { x: 0, y: 0 }

function canUseCustomCursor() {
  return Boolean(
    finePointerMedia?.matches
    && hoverMedia?.matches
    && !reducedMotionMedia?.matches
    && !forcedColorsMedia?.matches
    && typeof window.requestAnimationFrame === 'function'
  )
}

function setNativeCursorVisibility() {
  const root = document.documentElement
  const hideNativeCursor = isSupported.value
    && isVisible.value
    && context.value !== 'text'

  if (!hideNativeCursor) {
    activationVersion += 1
    root.classList.remove('sitewide-cursor-active')
    return
  }

  const activation = ++activationVersion
  void nextTick(() => {
    window.requestAnimationFrame(() => {
      if (activation !== activationVersion) return
      if (!cursorElement.value?.classList.contains('is-visible')) return
      if (context.value === 'text' || !isSupported.value || !isVisible.value) return
      root.classList.add('sitewide-cursor-active')
    })
  })
}

function writePosition() {
  cursorElement.value?.style.setProperty('--cursor-x', `${currentPosition.x.toFixed(2)}px`)
  cursorElement.value?.style.setProperty('--cursor-y', `${currentPosition.y.toFixed(2)}px`)
}

function stopAnimation() {
  if (animationFrame) window.cancelAnimationFrame(animationFrame)
  animationFrame = 0
  lastFrameTime = 0
}

function resetCursor() {
  isVisible.value = false
  context.value = 'surface'
  stopAnimation()
  setNativeCursorVisibility()
}

function classifyTarget(target: Element | null): CursorContext {
  if (!target) return 'surface'
  if (target.closest(PARTICLE_SELECTOR)) return 'particle'
  if (target.closest(TEXT_SELECTOR)) return 'text'
  if (target.closest(INTERACTIVE_SELECTOR)) return 'interactive'
  return 'surface'
}

function animatePosition(timestamp: number) {
  if (!isVisible.value || !isSupported.value) {
    animationFrame = 0
    return
  }

  const elapsed = lastFrameTime ? Math.min(64, timestamp - lastFrameTime) : 16.67
  lastFrameTime = timestamp
  const easing = 1 - Math.exp(-elapsed / 38)
  currentPosition.x += (targetPosition.x - currentPosition.x) * easing
  currentPosition.y += (targetPosition.y - currentPosition.y) * easing

  const distance = Math.hypot(targetPosition.x - currentPosition.x, targetPosition.y - currentPosition.y)
  if (distance < .16) {
    currentPosition = { ...targetPosition }
    writePosition()
    animationFrame = 0
    lastFrameTime = 0
    return
  }

  writePosition()
  animationFrame = window.requestAnimationFrame(animatePosition)
}

function schedulePosition() {
  if (animationFrame) return
  animationFrame = window.requestAnimationFrame(animatePosition)
}

function updateFromPointer(x: number, y: number, target: Element | null) {
  if (!isSupported.value) return

  lastPointerPosition = { x, y }
  targetPosition = { x, y }
  const nextContext = classifyTarget(target)
  if (context.value !== nextContext) {
    context.value = nextContext
    setNativeCursorVisibility()
  }

  if (!isVisible.value) {
    isVisible.value = true
    currentPosition = { ...targetPosition }
    void nextTick(() => {
      if (!isVisible.value) return
      writePosition()
      setNativeCursorVisibility()
    })
    return
  }

  schedulePosition()
}

function handlePointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  updateFromPointer(event.clientX, event.clientY, event.target instanceof Element ? event.target : null)
}

function refreshTargetUnderStationaryPointer() {
  if (!isVisible.value || !isSupported.value) return
  const target = document.elementFromPoint(lastPointerPosition.x, lastPointerPosition.y)
  updateFromPointer(lastPointerPosition.x, lastPointerPosition.y, target)
}

function handleKeyboardInput() {
  if (isVisible.value) resetCursor()
}

function handlePointerOut(event: PointerEvent) {
  if (event.relatedTarget === null) resetCursor()
}

function handleModalChange() {
  const nextModalState = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'))
  if (nextModalState === modalIsOpen) return
  modalIsOpen = nextModalState
  resetCursor()
}

function updateSupport() {
  const nextSupport = canUseCustomCursor()
  if (nextSupport === isSupported.value) return
  isSupported.value = nextSupport
  resetCursor()
  if (nextSupport) attachCursorListeners()
  else detachCursorListeners()
}

function attachCursorListeners() {
  if (cursorListenersAttached) return
  cursorListenersAttached = true

  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('scroll', refreshTargetUnderStationaryPointer, { passive: true, capture: true })
  window.addEventListener('resize', refreshTargetUnderStationaryPointer, { passive: true })
  window.addEventListener('blur', resetCursor)
  window.addEventListener('pagehide', handlePageHide)
  document.addEventListener('keydown', handleKeyboardInput, true)
  document.addEventListener('pointerout', handlePointerOut, true)

  modalIsOpen = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'))
  observer = new MutationObserver(handleModalChange)
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['aria-modal', 'role'],
    childList: true,
    subtree: true
  })
  themeObserver = new MutationObserver(resetCursor)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
}

function detachCursorListeners() {
  if (!cursorListenersAttached) return
  cursorListenersAttached = false

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('scroll', refreshTargetUnderStationaryPointer, true)
  window.removeEventListener('resize', refreshTargetUnderStationaryPointer)
  window.removeEventListener('blur', resetCursor)
  window.removeEventListener('pagehide', handlePageHide)
  document.removeEventListener('keydown', handleKeyboardInput, true)
  document.removeEventListener('pointerout', handlePointerOut, true)
  observer?.disconnect()
  themeObserver?.disconnect()
  observer = null
  themeObserver = null
}

function addMediaListener(media: MediaQueryList | null) {
  if (!media) return
  if (media.addEventListener) media.addEventListener('change', updateSupport)
  else media.addListener(updateSupport)
}

function removeMediaListener(media: MediaQueryList | null) {
  if (!media) return
  if (media.removeEventListener) media.removeEventListener('change', updateSupport)
  else media.removeListener(updateSupport)
}

function handlePageHide() {
  resetCursor()
}

onMounted(() => {
  if (typeof window.matchMedia !== 'function') return

  finePointerMedia = window.matchMedia('(pointer: fine)')
  hoverMedia = window.matchMedia('(hover: hover)')
  reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
  forcedColorsMedia = window.matchMedia('(forced-colors: active)')
  updateSupport()

  addMediaListener(finePointerMedia)
  addMediaListener(hoverMedia)
  addMediaListener(reducedMotionMedia)
  addMediaListener(forcedColorsMedia)

})

onBeforeUnmount(() => {
  resetCursor()
  removeMediaListener(finePointerMedia)
  removeMediaListener(hoverMedia)
  removeMediaListener(reducedMotionMedia)
  removeMediaListener(forcedColorsMedia)
  detachCursorListeners()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isSupported"
      ref="cursorElement"
      class="sitewide-cursor"
      :class="{ 'is-visible': isVisible }"
      :data-context="context"
      aria-hidden="true"
    >
      <span class="sitewide-cursor-dot"></span>
    </div>
  </Teleport>
</template>
