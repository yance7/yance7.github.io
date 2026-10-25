<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import type { ConcertPoster as PosterInfo } from '../data/types'
import { useLocale } from '../i18n'
import { concertPosterPresentation, originalImageUrl, thumbnailFallbackUrl, thumbnailUrl } from '../utils/concertMedia'

const props = defineProps<{ poster: PosterInfo; artist: string; tour: string; openLabel: string; hint: string }>()
const emit = defineEmits<{ open: [event: MouseEvent] }>()
const { messages } = useLocale()
const statusId = useId()
const containerRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const backdropRef = ref<HTMLImageElement | null>(null)
const openRef = ref<HTMLButtonElement | null>(null)
const state = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const requestId = ref(0)
const jpegFallback = ref(false)
const backdropFailed = ref(false)
const showSkeleton = ref(false)
let observer: IntersectionObserver | undefined
let skeletonTimer: ReturnType<typeof setTimeout> | undefined
let deadline: ReturnType<typeof setTimeout> | undefined
let nearViewport = false
let mounted = false
let fallbackFrame: number | undefined
let pendingRetryPointer: {
  pointerId: number
  rail: HTMLElement
  onRailScroll: () => void
  onPointerEnd: (event: Event) => void
} | null = null

function clearPendingRetryPointer() {
  const pending = pendingRetryPointer
  if (!pending) return
  pending.rail.removeEventListener('scroll', pending.onRailScroll)
  document.removeEventListener('pointerup', pending.onPointerEnd, true)
  document.removeEventListener('pointercancel', pending.onPointerEnd, true)
  pendingRetryPointer = null
}

function captureRetryPointerDuringRailScroll(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0) return
  const button = event.currentTarget as HTMLButtonElement
  const rail = button.closest<HTMLElement>('.concert-archive-rail')
  if (!rail) return

  clearPendingRetryPointer()
  const pointerId = event.pointerId
  const onRailScroll = () => {
    if (!button.isConnected) {
      clearPendingRetryPointer()
      return
    }
    try {
      // Native snap can move the button after pointerdown, changing the click target.
      button.setPointerCapture(pointerId)
    } catch {
      clearPendingRetryPointer()
    }
  }
  const onPointerEnd = (endEvent: Event) => {
    if ((endEvent as PointerEvent).pointerId === pointerId) clearPendingRetryPointer()
  }

  pendingRetryPointer = { pointerId, rail, onRailScroll, onPointerEnd }
  rail.addEventListener('scroll', onRailScroll, { once: true })
  document.addEventListener('pointerup', onPointerEnd, true)
  document.addEventListener('pointercancel', onPointerEnd, true)
}

function updateFallbackVisibility() {
  fallbackFrame = undefined
  const rect = containerRef.value?.getBoundingClientRect()
  nearViewport = !!rect && rect.bottom >= -200 && rect.top <= innerHeight + 200 && rect.right >= -200 && rect.left <= innerWidth + 200
  if (nearViewport) startLoading()
}

function scheduleFallbackVisibility() {
  if (fallbackFrame === undefined) fallbackFrame = requestAnimationFrame(updateFallbackVisibility)
}

function clearTimers() {
  clearTimeout(skeletonTimer)
  clearTimeout(deadline)
  skeletonTimer = undefined
  deadline = undefined
}

function finishError() {
  state.value = 'error'
  showSkeleton.value = false
  clearTimers()
}

function startLoading() {
  if (!mounted || state.value !== 'idle') return
  state.value = 'loading'
  const attempt = requestId.value
  skeletonTimer = setTimeout(() => {
    if (attempt === requestId.value && state.value === 'loading') showSkeleton.value = true
  }, 120)
  deadline = setTimeout(() => {
    if (attempt === requestId.value && state.value === 'loading') finishError()
  }, 12000)
}

function isCurrent(image: HTMLImageElement, attempt: number) {
  return mounted && image === imageRef.value && attempt === requestId.value && (state.value === 'idle' || state.value === 'loading')
}

function failImage(image: HTMLImageElement) {
  if (!isCurrent(image, requestId.value)) return
  if (!jpegFallback.value) {
    jpegFallback.value = true
    void nextTick(checkCachedImage)
  } else finishError()
}

async function settleImage(image: HTMLImageElement, attempt: number) {
  if (!isCurrent(image, attempt)) return
  if (!image.naturalWidth) {
    failImage(image)
    return
  }
  try {
    await image.decode()
    if (!isCurrent(image, attempt)) return
    state.value = 'ready'
    showSkeleton.value = false
    clearTimers()
  } catch {
    if (isCurrent(image, attempt)) failImage(image)
  }
}

function checkCachedImage() {
  const image = imageRef.value
  if (image?.complete && image.currentSrc) void settleImage(image, requestId.value)
}

function onImageLoad(event: Event) {
  if (event.currentTarget === imageRef.value) void settleImage(event.currentTarget as HTMLImageElement, requestId.value)
}

function onImageError(event: Event) {
  if (event.currentTarget === imageRef.value) failImage(event.currentTarget as HTMLImageElement)
}

function onBackdropError(event: Event) {
  if (event.currentTarget === backdropRef.value) backdropFailed.value = true
}

function resetRequest() {
  requestId.value += 1
  clearTimers()
  jpegFallback.value = false
  backdropFailed.value = false
  showSkeleton.value = false
  state.value = 'idle'
  if (nearViewport) startLoading()
  void nextTick(checkCachedImage)
}

function retryImage() {
  resetRequest()
  startLoading()
  openRef.value?.focus({ preventScroll: true })
}

watch(() => props.poster.file, () => { if (mounted) resetRequest() }, { flush: 'post' })

onMounted(() => {
  mounted = true
  resetRequest()
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(entries => {
      nearViewport = entries.some(entry => entry.isIntersecting)
      if (nearViewport) startLoading()
    }, { rootMargin: '200px' })
    if (containerRef.value) observer.observe(containerRef.value)
  } else {
    // Native lazy loading remains responsible for offscreen network scheduling.
    window.addEventListener('scroll', scheduleFallbackVisibility, { capture: true, passive: true })
    window.addEventListener('resize', scheduleFallbackVisibility)
    updateFallbackVisibility()
  }
})

onBeforeUnmount(() => {
  mounted = false
  clearPendingRetryPointer()
  requestId.value += 1
  observer?.disconnect()
  window.removeEventListener('scroll', scheduleFallbackVisibility, true)
  window.removeEventListener('resize', scheduleFallbackVisibility)
  if (fallbackFrame !== undefined) cancelAnimationFrame(fallbackFrame)
  clearTimers()
})
</script>

<template>
  <div
    ref="containerRef"
    class="concert-poster"
    :data-poster-state="state"
    :data-poster-ratio="concertPosterPresentation(poster).kind"
    :style="{ aspectRatio: concertPosterPresentation(poster).aspectRatio }"
    :aria-busy="state === 'loading'"
    v-pointer-sheen="{ tilt: 2.5 }"
  >
    <picture v-if="!backdropFailed" :key="requestId" class="poster-backdrop-layer" aria-hidden="true">
      <source :srcset="thumbnailUrl(poster.file)" type="image/webp">
      <img ref="backdropRef" class="poster-backdrop" :src="thumbnailFallbackUrl(poster.file)" alt="" :width="poster.width" :height="poster.height" loading="lazy" decoding="async" @error="onBackdropError">
    </picture>
    <button ref="openRef" class="poster-open" type="button" :aria-label="openLabel" :aria-describedby="state === 'loading' || state === 'error' ? statusId : undefined" @click="emit('open', $event)">
      <picture :key="requestId" class="poster-foreground-layer">
        <source v-if="!jpegFallback" :srcset="thumbnailUrl(poster.file)" type="image/webp">
        <img
          :key="requestId + '-' + (jpegFallback ? 'jpeg' : 'webp')"
          ref="imageRef"
          class="poster-foreground"
          :src="thumbnailFallbackUrl(poster.file)"
          :data-original-src="originalImageUrl(poster.file)"
          :alt="artist + ' ' + tour + ' ' + messages.lightbox.posterAlt"
          :width="poster.width"
          :height="poster.height"
          loading="lazy"
          decoding="async"
          @load="onImageLoad"
          @error="onImageError"
        >
      </picture>
      <span class="poster-hint" aria-hidden="true"><span>{{ hint }}</span><b>＋</b></span>
    </button>
    <span v-if="state === 'loading'" :id="statusId" class="sr-only" role="status" aria-live="off">{{ messages.poster.loading }}</span>
    <div v-if="showSkeleton" class="poster-skeleton" aria-hidden="true"></div>
    <div v-if="state === 'error'" class="poster-error">
      <p :id="statusId">{{ messages.poster.failed }}</p>
      <button class="poster-retry" type="button" @pointerdown="captureRetryPointerDuringRailScroll" @click.stop="retryImage">{{ messages.poster.retry }}</button>
      <a class="poster-original-link" :href="originalImageUrl(poster.file)" target="_blank" rel="noopener noreferrer">{{ messages.poster.original }}</a>
    </div>
  </div>
</template>

<style scoped>
.concert-poster:not([data-poster-state='ready']) .poster-foreground { opacity: 0; }
.poster-skeleton { position: absolute; inset: 0; z-index: 3; pointer-events: none; background: linear-gradient(125deg, var(--surface), var(--surface-strong)); }
.poster-error { position: absolute; inset: 0; z-index: 4; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 8px; padding: 16px; color: var(--ink); background: var(--surface-strong); text-align: center; }
.poster-error p { flex-basis: 100%; margin: 0 0 4px; font-size: var(--text-sm); }
.poster-error button, .poster-error a { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; max-width: 100%; padding: 8px 12px; border: 1px solid var(--line); border-radius: var(--control-radius); background: var(--surface); color: var(--ink); font-family: var(--font-interface); font-size: var(--text-sm); overflow-wrap: anywhere; }
.poster-error a { text-decoration: underline; text-underline-offset: 3px; }
</style>
