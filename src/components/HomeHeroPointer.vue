<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'
const hasFinePointer = ref(false)
const hasCoarsePointer = ref(false)
const isVisible = ref(false)
const isOverInteractive = ref(false)
const touchActive = ref(false)
const pointerPosition = reactive({ x: 0, y: 0 })
const touchPosition = reactive({ x: 0, y: 0 })
const pointerStyle = computed(() => ({
  '--pointer-x': `${pointerPosition.x}px`,
  '--pointer-y': `${pointerPosition.y}px`
}))
const touchStyle = computed(() => ({
  '--touch-x': `${touchPosition.x}px`,
  '--touch-y': `${touchPosition.y}px`
}))

let hero: HTMLElement | null = null
let pointerMedia: MediaQueryList | null = null
let coarsePointerMedia: MediaQueryList | null = null
let hoverMedia: MediaQueryList | null = null
let motionMedia: MediaQueryList | null = null
let connection: (EventTarget & { saveData?: boolean }) | undefined
let rippleTimer = 0
let lastClientPosition = { x: 0, y: 0 }

function updatePointer(event: PointerEvent) {
  if (!hero || event.pointerType === 'touch') return
  lastClientPosition = { x: event.clientX, y: event.clientY }
  const bounds = hero.getBoundingClientRect()
  const target = event.target instanceof Node ? event.target : null
  const inside = Boolean(target && hero.contains(target))
    && event.clientX >= bounds.left
    && event.clientX <= bounds.right
    && event.clientY >= bounds.top
    && event.clientY <= bounds.bottom
  isVisible.value = hasFinePointer.value && inside
  if (!inside) {
    isOverInteractive.value = false
    return
  }

  pointerPosition.x = event.clientX - bounds.left
  pointerPosition.y = event.clientY - bounds.top
  const interactiveTarget = event.target instanceof Element ? event.target.closest(INTERACTIVE_SELECTOR) : null
  isOverInteractive.value = Boolean(interactiveTarget && hero.contains(interactiveTarget))
}

function updatePointerAfterScroll() {
  if (!hero || !hasFinePointer.value) return
  const bounds = hero.getBoundingClientRect()
  const target = document.elementFromPoint(lastClientPosition.x, lastClientPosition.y)
  const inside = Boolean(target && hero.contains(target))
    && lastClientPosition.x >= bounds.left
    && lastClientPosition.x <= bounds.right
    && lastClientPosition.y >= bounds.top
    && lastClientPosition.y <= bounds.bottom
  isVisible.value = inside
  if (!inside) {
    isOverInteractive.value = false
    return
  }

  const interactiveTarget = target instanceof Element ? target.closest(INTERACTIVE_SELECTOR) : null
  isOverInteractive.value = Boolean(interactiveTarget && hero.contains(interactiveTarget))
  pointerPosition.x = lastClientPosition.x - bounds.left
  pointerPosition.y = lastClientPosition.y - bounds.top
}

function startTouchRipple(event: PointerEvent) {
  if (!hero || !hasCoarsePointer.value || event.pointerType !== 'touch') return
  const bounds = hero.getBoundingClientRect()
  const target = event.target instanceof Node ? event.target : null
  const inside = Boolean(target && hero.contains(target))
    && event.clientX >= bounds.left
    && event.clientX <= bounds.right
    && event.clientY >= bounds.top
    && event.clientY <= bounds.bottom
  if (!inside) return

  touchPosition.x = event.clientX - bounds.left
  touchPosition.y = event.clientY - bounds.top
  touchActive.value = true
  window.clearTimeout(rippleTimer)
  rippleTimer = window.setTimeout(() => { touchActive.value = false }, 540)
}

function updatePointerSupport() {
  const saveData = connection?.saveData === true
  const reducedMotion = motionMedia?.matches === true
  hasFinePointer.value = Boolean(hoverMedia?.matches && pointerMedia?.matches && !saveData && !reducedMotion)
  hasCoarsePointer.value = Boolean(coarsePointerMedia?.matches && !saveData && !reducedMotion)
  hero?.classList.toggle('home-hero-custom-pointer', hasFinePointer.value)
}

onMounted(() => {
  hero = document.querySelector<HTMLElement>('.home-hero')
  pointerMedia = window.matchMedia('(pointer: fine)')
  coarsePointerMedia = window.matchMedia('(pointer: coarse)')
  hoverMedia = window.matchMedia('(hover: hover)')
  motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
  connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection
  updatePointerSupport()
  window.addEventListener('pointermove', updatePointer, { passive: true })
  window.addEventListener('pointerdown', startTouchRipple, { passive: true })
  window.addEventListener('scroll', updatePointerAfterScroll, { passive: true })
  pointerMedia.addEventListener('change', updatePointerSupport)
  coarsePointerMedia.addEventListener('change', updatePointerSupport)
  hoverMedia.addEventListener('change', updatePointerSupport)
  motionMedia.addEventListener('change', updatePointerSupport)
  connection?.addEventListener('change', updatePointerSupport)
})

onBeforeUnmount(() => {
  hero?.classList.remove('home-hero-custom-pointer')
  window.removeEventListener('pointermove', updatePointer)
  window.removeEventListener('pointerdown', startTouchRipple)
  window.removeEventListener('scroll', updatePointerAfterScroll)
  pointerMedia?.removeEventListener('change', updatePointerSupport)
  coarsePointerMedia?.removeEventListener('change', updatePointerSupport)
  hoverMedia?.removeEventListener('change', updatePointerSupport)
  motionMedia?.removeEventListener('change', updatePointerSupport)
  connection?.removeEventListener('change', updatePointerSupport)
  window.clearTimeout(rippleTimer)
})
</script>

<template>
  <div
    v-if="hasFinePointer"
    class="home-hero-pointer"
    :class="{ 'is-visible': isVisible, 'is-over-interactive': isOverInteractive }"
    :style="pointerStyle"
    aria-hidden="true"
  >
    <span class="home-hero-pointer-dot"></span>
  </div>
  <span
    v-if="hasCoarsePointer"
    class="home-hero-touch-ripple"
    :class="{ 'is-active': touchActive }"
    :data-active="touchActive"
    :style="touchStyle"
    aria-hidden="true"
  ></span>
</template>
