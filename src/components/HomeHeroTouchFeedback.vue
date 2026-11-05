<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const hasCoarsePointer = ref(false)
const root = typeof document === 'undefined' ? null : document.documentElement
const earlyTouchExpiresAt = Number(root?.dataset.homeHeroTouchUntil)
const earlyTouch = root && Number.isFinite(earlyTouchExpiresAt) && earlyTouchExpiresAt > Date.now()
  ? {
      x: Number(root.dataset.homeHeroTouchX) || 0,
      y: Number(root.dataset.homeHeroTouchY) || 0,
      expiresAt: earlyTouchExpiresAt
    }
  : null
const touchActive = ref(earlyTouch !== null)
const touchPosition = reactive({ x: earlyTouch?.x ?? 0, y: earlyTouch?.y ?? 0 })
const touchStyle = computed(() => ({
  '--touch-x': `${touchPosition.x}px`,
  '--touch-y': `${touchPosition.y}px`
}))

let hero: HTMLElement | null = null
let coarsePointerMedia: MediaQueryList | null = null
let motionMedia: MediaQueryList | null = null
let connection: (EventTarget & { saveData?: boolean }) | undefined
let rippleTimer = 0

function startTouchRipple(event: PointerEvent) {
  if (!hero || !hasCoarsePointer.value || event.pointerType !== 'touch') return
  const bounds = hero.getBoundingClientRect()
  const target = event.target instanceof Node ? event.target : null
  if (target instanceof Element && target.closest('[data-home-hero-control]')) return
  const inside = Boolean(target && hero.contains(target))
    && event.clientX >= bounds.left
    && event.clientX <= bounds.right
    && event.clientY >= bounds.top
    && event.clientY <= bounds.bottom
  if (!inside) return

  touchPosition.x = event.clientX - bounds.left
  touchPosition.y = event.clientY - bounds.top
  delete document.documentElement.dataset.homeHeroTouchUntil
  delete document.documentElement.dataset.homeHeroTouchX
  delete document.documentElement.dataset.homeHeroTouchY
  touchActive.value = true
  window.clearTimeout(rippleTimer)
  rippleTimer = window.setTimeout(() => { touchActive.value = false }, 540)
}

function updateTouchSupport() {
  const saveData = connection?.saveData === true
  const reducedMotion = motionMedia?.matches === true
  hasCoarsePointer.value = Boolean(coarsePointerMedia?.matches && !saveData && !reducedMotion)
}

onMounted(() => {
  hero = document.querySelector<HTMLElement>('.home-hero')
  coarsePointerMedia = window.matchMedia('(pointer: coarse)')
  motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
  connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection
  updateTouchSupport()
  const bootstrapWindow = window as Window & { __yanceEarlyHomeHeroTouchTimer?: number }
  if (bootstrapWindow.__yanceEarlyHomeHeroTouchTimer !== undefined) {
    window.clearTimeout(bootstrapWindow.__yanceEarlyHomeHeroTouchTimer)
    delete bootstrapWindow.__yanceEarlyHomeHeroTouchTimer
  }
  delete document.documentElement.dataset.homeHeroTouchUntil
  delete document.documentElement.dataset.homeHeroTouchX
  delete document.documentElement.dataset.homeHeroTouchY
  if (earlyTouch) {
    const remaining = Math.max(0, earlyTouch.expiresAt - Date.now())
    if (remaining > 0) rippleTimer = window.setTimeout(() => { touchActive.value = false }, remaining)
    else touchActive.value = false
  }
  window.addEventListener('pointerdown', startTouchRipple, { passive: true })
  coarsePointerMedia.addEventListener('change', updateTouchSupport)
  motionMedia.addEventListener('change', updateTouchSupport)
  connection?.addEventListener('change', updateTouchSupport)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', startTouchRipple)
  coarsePointerMedia?.removeEventListener('change', updateTouchSupport)
  motionMedia?.removeEventListener('change', updateTouchSupport)
  connection?.removeEventListener('change', updateTouchSupport)
  window.clearTimeout(rippleTimer)
})
</script>

<template>
  <span
    class="home-hero-touch-ripple"
    :class="{ 'is-active': touchActive }"
    :data-active="touchActive"
    :style="touchStyle"
    aria-hidden="true"
  ></span>
</template>
