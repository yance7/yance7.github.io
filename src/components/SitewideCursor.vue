<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { observePointerMotion } from '../utils/pointerMotion'

type CursorContext = 'surface' | 'interactive' | 'text' | 'particle'

const INTERACTIVE_SELECTOR = 'a[href], button, [role="button"], [role="link"], summary, select, input[type="button"], input[type="submit"], input[type="reset"], input[type="checkbox"], input[type="radio"]'
const TEXT_SELECTOR = 'textarea, [contenteditable], [role="textbox"], input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"]'
const BODY_TEXT_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, dt, dd, blockquote, figcaption, td, th'
const DISABLED_SELECTOR = ':disabled, [aria-disabled="true"]'
const PARTICLE_SELECTOR = '.home-hero-particles, .home-hero-particles-canvas'
const CURSOR_SELECTOR = '.sitewide-cursor'

const cursorElement = ref<HTMLDivElement | null>(null)
const isSupported = ref(false)
const isVisible = ref(false)
const context = ref<CursorContext>('surface')
const isPressed = ref(false)

let motion: ReturnType<typeof observePointerMotion> | undefined
let domObserver: MutationObserver | null = null
let themeObserver: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrame = 0
let refreshFrame = 0
let lastFrameTime = 0
let activationVersion = 0
let modalIsOpen = false
let cursorListenersAttached = false
let targetPosition = { x: 0, y: 0 }
let currentRingPosition = { x: 0, y: 0 }
let lastPointerPosition = { x: 0, y: 0 }

function canUseCustomCursor() {
  return Boolean(
    motion?.allowed()
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

function writeDotPosition() {
  const element = cursorElement.value
  if (!element) return
  element.style.setProperty('--cursor-dot-x', `${lastPointerPosition.x.toFixed(2)}px`)
  element.style.setProperty('--cursor-dot-y', `${lastPointerPosition.y.toFixed(2)}px`)
}

function writeRingPosition() {
  const element = cursorElement.value
  if (!element) return
  element.style.setProperty('--cursor-ring-x', `${currentRingPosition.x.toFixed(2)}px`)
  element.style.setProperty('--cursor-ring-y', `${currentRingPosition.y.toFixed(2)}px`)
}

function stopAnimation() {
  if (animationFrame) window.cancelAnimationFrame(animationFrame)
  animationFrame = 0
  lastFrameTime = 0
}

function stopStationaryRefresh() {
  if (refreshFrame) window.cancelAnimationFrame(refreshFrame)
  refreshFrame = 0
}

function resetCursor() {
  isVisible.value = false
  isPressed.value = false
  context.value = 'surface'
  stopAnimation()
  stopStationaryRefresh()
  setNativeCursorVisibility()
}

function classifyTarget(target: Element | null): CursorContext | null {
  if (!target) return 'surface'

  if (target.closest(`${DISABLED_SELECTOR}, [inert]`)) return null
  const textTarget = target.closest(TEXT_SELECTOR)
  if (textTarget) {
    if (textTarget.hasAttribute('contenteditable')) {
      if (textTarget instanceof HTMLElement && textTarget.isContentEditable) return 'text'
    } else if (!textTarget.matches(DISABLED_SELECTOR)) {
      return 'text'
    }
  }

  if (target.closest(INTERACTIVE_SELECTOR)) return 'interactive'
  if (target.closest(PARTICLE_SELECTOR)) return 'particle'
  if (target.closest(BODY_TEXT_SELECTOR)) return 'text'
  return 'surface'
}

function animateRing(timestamp: number) {
  if (!isVisible.value || !isSupported.value) {
    animationFrame = 0
    return
  }

  const elapsed = lastFrameTime ? Math.min(64, timestamp - lastFrameTime) : 16.67
  lastFrameTime = timestamp
  const easing = 1 - Math.exp(-elapsed / 38)
  currentRingPosition.x += (targetPosition.x - currentRingPosition.x) * easing
  currentRingPosition.y += (targetPosition.y - currentRingPosition.y) * easing

  const distance = Math.hypot(targetPosition.x - currentRingPosition.x, targetPosition.y - currentRingPosition.y)
  if (distance < .16) {
    currentRingPosition = { ...targetPosition }
    writeRingPosition()
    animationFrame = 0
    lastFrameTime = 0
    return
  }

  writeRingPosition()
  animationFrame = window.requestAnimationFrame(animateRing)
}

function scheduleRingAnimation() {
  if (animationFrame) return
  animationFrame = window.requestAnimationFrame(animateRing)
}

function updateFromPointer(x: number, y: number, target: Element | null) {
  if (!isSupported.value) return

  lastPointerPosition = { x, y }
  targetPosition = { x, y }
  writeDotPosition()

  const nextContext = classifyTarget(target)
  if (!nextContext) {
    resetCursor()
    return
  }

  const contextChanged = context.value !== nextContext
  if (contextChanged) context.value = nextContext
  if (nextContext !== 'interactive') isPressed.value = false

  if (!isVisible.value) {
    isVisible.value = true
    currentRingPosition = { ...targetPosition }
    void nextTick(() => {
      if (!isVisible.value) return
      writeDotPosition()
      writeRingPosition()
      setNativeCursorVisibility()
    })
    return
  }

  if (contextChanged) setNativeCursorVisibility()
  scheduleRingAnimation()
}

function handlePointerMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse') {
    resetCursor()
    return
  }

  updateFromPointer(event.clientX, event.clientY, event.target instanceof Element ? event.target : null)
}

function refreshTargetUnderStationaryPointer() {
  refreshFrame = 0
  if (!isVisible.value || !isSupported.value) return
  const target = document.elementFromPoint(lastPointerPosition.x, lastPointerPosition.y)
  updateFromPointer(lastPointerPosition.x, lastPointerPosition.y, target)
}

function scheduleStationaryPointerRefresh() {
  if (!isVisible.value || !isSupported.value || refreshFrame) return
  refreshFrame = window.requestAnimationFrame(refreshTargetUnderStationaryPointer)
}

function handlePointerDown(event: PointerEvent) {
  if (event.pointerType !== 'mouse') {
    resetCursor()
    return
  }

  updateFromPointer(event.clientX, event.clientY, event.target instanceof Element ? event.target : null)
  if (isVisible.value && context.value === 'interactive') isPressed.value = true
}

function clearPressedState() {
  isPressed.value = false
}

function handleKeyboardInput() {
  if (isVisible.value) resetCursor()
}

function handlePointerOut(event: PointerEvent) {
  if (event.relatedTarget === null) resetCursor()
}

function isCursorMutationNode(node: Node) {
  return node instanceof Element
    ? Boolean(node.closest(CURSOR_SELECTOR))
    : Boolean(node.parentElement?.closest(CURSOR_SELECTOR))
}

function hasNonCursorChildMutation(record: MutationRecord) {
  return [...record.addedNodes, ...record.removedNodes].some((node) => !isCursorMutationNode(node))
}

function handleDomMutations(records: MutationRecord[]) {
  const nextModalState = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'))
  if (nextModalState !== modalIsOpen) {
    modalIsOpen = nextModalState
    resetCursor()
    return
  }

  const changedLayout = records.some((record) => {
    if (isCursorMutationNode(record.target)) return false
    if (record.type === 'childList') return hasNonCursorChildMutation(record)
    return true
  })

  if (changedLayout) scheduleStationaryPointerRefresh()
}

function handleRootAttributeChange() {
  resetCursor()
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') resetCursor()
}

function handlePageShow() {
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
  window.addEventListener('pointerdown', handlePointerDown, { passive: true })
  window.addEventListener('pointerup', clearPressedState, { passive: true })
  window.addEventListener('pointercancel', clearPressedState, { passive: true })
  window.addEventListener('scroll', scheduleStationaryPointerRefresh, { passive: true, capture: true })
  window.addEventListener('resize', scheduleStationaryPointerRefresh, { passive: true })
  window.addEventListener('orientationchange', scheduleStationaryPointerRefresh, { passive: true })
  window.addEventListener('blur', resetCursor)
  window.addEventListener('pagehide', resetCursor)
  window.addEventListener('pageshow', handlePageShow)
  window.addEventListener('transitionend', scheduleStationaryPointerRefresh, true)
  window.addEventListener('animationend', scheduleStationaryPointerRefresh, true)
  document.addEventListener('keydown', handleKeyboardInput, true)
  document.addEventListener('pointerout', handlePointerOut, true)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  modalIsOpen = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'))
  domObserver = new MutationObserver(handleDomMutations)
  domObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['aria-modal', 'aria-disabled', 'class', 'disabled', 'hidden', 'inert', 'role', 'style'],
    childList: true,
    subtree: true
  })

  themeObserver = new MutationObserver(handleRootAttributeChange)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-locale', 'data-theme', 'lang']
  })

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleStationaryPointerRefresh)
    resizeObserver.observe(document.documentElement)
    resizeObserver.observe(document.body)
  }
}

function detachCursorListeners() {
  if (!cursorListenersAttached) return
  cursorListenersAttached = false

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('pointerup', clearPressedState)
  window.removeEventListener('pointercancel', clearPressedState)
  window.removeEventListener('scroll', scheduleStationaryPointerRefresh, true)
  window.removeEventListener('resize', scheduleStationaryPointerRefresh)
  window.removeEventListener('orientationchange', scheduleStationaryPointerRefresh)
  window.removeEventListener('blur', resetCursor)
  window.removeEventListener('pagehide', resetCursor)
  window.removeEventListener('pageshow', handlePageShow)
  window.removeEventListener('transitionend', scheduleStationaryPointerRefresh, true)
  window.removeEventListener('animationend', scheduleStationaryPointerRefresh, true)
  document.removeEventListener('keydown', handleKeyboardInput, true)
  document.removeEventListener('pointerout', handlePointerOut, true)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  domObserver?.disconnect()
  themeObserver?.disconnect()
  resizeObserver?.disconnect()
  domObserver = null
  themeObserver = null
  resizeObserver = null
  stopStationaryRefresh()
}

onMounted(() => {
  if (typeof window.matchMedia !== 'function') return

  motion = observePointerMotion(updateSupport, { notifyWhenAllowed: true })
  updateSupport()
})

onBeforeUnmount(() => {
  resetCursor()
  motion?.stop()
  motion = undefined
  detachCursorListeners()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isSupported"
      ref="cursorElement"
      class="sitewide-cursor"
      :class="{ 'is-visible': isVisible, 'is-pressed': isPressed }"
      :data-context="context"
      aria-hidden="true"
    >
      <span class="sitewide-cursor-ring"></span>
      <span class="sitewide-cursor-dot"></span>
    </div>
  </Teleport>
</template>
