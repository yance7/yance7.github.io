<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRef, watch } from 'vue'
import type { HomeHeroSlide } from '../data/homeHeroSlides'
import { HOME_HERO_IMAGE_SIZES, homeHeroSlides } from '../data/homeHeroSlides'
import { useHomeHeroSlideshow } from '../composables/useHomeHeroSlideshow'
import type { UiMessages } from '../i18n/types'

const props = defineProps<{
  container: HTMLElement | null
  introReady: boolean
  controlsEnabled: boolean
  messages: UiMessages['page']['home']['slideshow']
}>()

const messages = computed(() => props.messages)
const controls = ref<HTMLElement | null>(null)
const controller = useHomeHeroSlideshow({
  slides: homeHeroSlides,
  container: toRef(props, 'container'),
  controls,
  imageSizes: HOME_HERO_IMAGE_SIZES
})
const state = controller.state
const media = ref<HTMLElement | null>(null)
const transitionActive = ref(false)
const currentImageFailed = ref(false)
const announcement = computed(() => {
  const { announcement: result, announcementIndex } = state.value
  const labels = messages.value
  if (!result || announcementIndex === null) return ''
  const name = photoName(announcementIndex)
  return result === 'loadFailed'
    ? labels.status.loadFailed(name)
    : result === 'photoSelected'
      ? labels.status.photoSelected(announcementIndex + 1, homeHeroSlides.length, name)
      : labels.status.photoShown(announcementIndex + 1, homeHeroSlides.length, name)
})
const scrimStyle = computed(() => ({
  '--home-hero-scrim': String(homeHeroSlides[state.value.targetIndex ?? state.value.currentIndex]!.scrim)
}))

let transitionFrame = 0
let cancelTargetReadiness: (() => void) | null = null
let pointerPlaybackIntent: 'play' | 'pause' | null = null
const targetImageReadinessDeadlineMs = 10_000

function photoName(index: number) {
  const photoIndex = (index + 1) as keyof typeof messages.value.photos
  return messages.value.photos[photoIndex]
}

function photoButtonLabel(index: number) {
  const labels = messages.value
  return labels.showPhoto(index + 1, homeHeroSlides.length, photoName(index))
}

function imageSrcset(slide: HomeHeroSlide, format: 'webp' | 'jpeg') {
  const candidates = state.value.saveData ? slide.sources[format].slice(0, 1) : slide.sources[format]
  return candidates.map((candidate) => `${candidate.src} ${candidate.width}w`).join(', ')
}

function imageFallbackSrc(slide: HomeHeroSlide, format: 'webp' | 'jpeg') {
  const candidates = state.value.saveData ? slide.sources[format].slice(0, 1) : slide.sources[format]
  return candidates[0]!.src
}

function imageSizes() {
  return state.value.saveData
    ? '640px'
    : '(max-width: 760px) calc(100vw - 40px), calc(min(1260px, 100vw) - 10vw)'
}

function imageStyle(slide: HomeHeroSlide) {
  return {
    '--home-hero-position-desktop': slide.position.desktop,
    '--home-hero-position-mobile': slide.position.mobile
  }
}

function rememberPointerPlaybackIntent() {
  pointerPlaybackIntent = state.value.userPaused || state.value.focusPaused ? 'play' : 'pause'
}

function clearPointerPlaybackIntent() {
  pointerPlaybackIntent = null
}

function togglePlayback(event: MouseEvent) {
  const intent = event.detail > 0 ? pointerPlaybackIntent : null
  pointerPlaybackIntent = null
  const action = intent ?? (state.value.userPaused || state.value.focusPaused ? 'play' : 'pause')
  if (action === 'play') controller.play()
  else controller.pause()
}

function transitionEnded(event: TransitionEvent, transactionId: number) {
  if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
  controller.finishTransition(transactionId)
}

function currentImageError() {
  currentImageFailed.value = true
}

function targetImageError(transactionId: number) {
  controller.failTransition(transactionId)
}

function isCurrentTransition(transactionId: number) {
  return transactionId === state.value.transactionId && state.value.transitioning
}

function waitForImageDecode(image: HTMLImageElement) {
  return new Promise<boolean>((resolve) => {
    let settled = false
    let timeout: ReturnType<typeof window.setTimeout> | null = null
    const settle = (decoded: boolean) => {
      if (settled) return
      settled = true
      if (timeout !== null) window.clearTimeout(timeout)
      if (cancelTargetReadiness === cancel) cancelTargetReadiness = null
      resolve(decoded)
    }
    const cancel = () => settle(false)
    cancelTargetReadiness = cancel
    timeout = window.setTimeout(cancel, targetImageReadinessDeadlineMs)
    try {
      void image.decode().then(() => settle(true), () => settle(false))
    } catch {
      settle(false)
    }
  })
}

async function waitForCurrentTargetImage(image: HTMLImageElement, transactionId: number) {
  while (isCurrentTransition(transactionId)) {
    const requestedSource = image.currentSrc || image.src
    const decoded = await waitForImageDecode(image)
    if (!isCurrentTransition(transactionId)) return false

    const selectedSource = image.currentSrc || image.src
    if (requestedSource !== selectedSource) continue
    return decoded && image.naturalWidth > 0 ? selectedSource : null
  }
  return null
}

async function prepareTargetTransition(image: HTMLImageElement, transactionId: number) {
  const decodedSource = await waitForCurrentTargetImage(image, transactionId)
  if (!isCurrentTransition(transactionId)) return
  if (!decodedSource) {
    controller.failTransition(transactionId)
    return
  }

  transitionFrame = requestAnimationFrame(() => {
    transitionFrame = 0
    if (!isCurrentTransition(transactionId)) return

    const selectedSource = image.currentSrc || image.src
    if (selectedSource !== decodedSource || image.naturalWidth === 0) {
      void prepareTargetTransition(image, transactionId)
      return
    }
    if (controller.activateTransition(transactionId)) transitionActive.value = true
  })
}

watch(() => props.introReady, (introReady) => {
  controller.setEnvironment({ introReady })
}, { immediate: true })

watch(() => [state.value.currentIndex, state.value.currentFormat] as const, () => {
  currentImageFailed.value = false
})

watch(() => [state.value.transactionId, state.value.transitioning] as const, async ([transactionId, transitioning]) => {
  cancelTargetReadiness?.()
  cancelTargetReadiness = null
  if (transitionFrame) cancelAnimationFrame(transitionFrame)
  transitionFrame = 0
  transitionActive.value = false
  if (!transitioning) return
  await nextTick()
  if (transactionId !== state.value.transactionId || !state.value.transitioning) return
  const targetImage = media.value?.querySelector<HTMLImageElement>('.home-hero-slideshow__image--target')
  if (!targetImage) {
    controller.failTransition(transactionId)
    return
  }
  void prepareTargetTransition(targetImage, transactionId)
}, { flush: 'post' })

onBeforeUnmount(() => {
  cancelTargetReadiness?.()
  if (transitionFrame) cancelAnimationFrame(transitionFrame)
})
</script>

<template>
  <div
    ref="media"
    class="home-hero-slideshow__media"
    :class="{ 'is-transitioning': transitionActive }"
    :data-transitioning="transitionActive"
    :data-direction="state.direction"
    :data-current-index="state.currentIndex"
    :data-target-index="state.targetIndex"
    :data-page-visible="state.pageVisible"
    :data-in-viewport="state.inViewport"
    :data-hovered="state.hovered"
    :data-touch-active="state.touchActive"
    :style="scrimStyle"
    aria-hidden="true"
  >
    <img
      v-if="!state.forcedColors"
      class="home-hero-slideshow__image home-hero-slideshow__image--current"
      :class="{ 'is-failed': currentImageFailed }"
      :src="imageFallbackSrc(controller.currentSlide.value, state.currentFormat ?? 'webp')"
      :srcset="imageSrcset(controller.currentSlide.value, state.currentFormat ?? 'webp')"
      :sizes="imageSizes()"
      :style="imageStyle(controller.currentSlide.value)"
      :width="controller.currentSlide.value.width"
      :height="controller.currentSlide.value.height"
      alt=""
      loading="eager"
      decoding="async"
      draggable="false"
      @error="currentImageError"
    >
    <img
      v-if="state.transitioning && state.targetIndex !== null && state.targetFormat && controller.targetSlide.value"
      class="home-hero-slideshow__image home-hero-slideshow__image--target"
      :class="`is-${state.direction}`"
      :src="imageFallbackSrc(controller.targetSlide.value, state.targetFormat)"
      :srcset="imageSrcset(controller.targetSlide.value, state.targetFormat)"
      :sizes="imageSizes()"
      :style="imageStyle(controller.targetSlide.value)"
      :width="controller.targetSlide.value.width"
      :height="controller.targetSlide.value.height"
      alt=""
      loading="eager"
      decoding="async"
      draggable="false"
      @transitionend="transitionEnded($event, state.transactionId)"
      @error="targetImageError(state.transactionId)"
    >
    <div class="home-hero-slideshow__scrim"></div>
  </div>

  <div
    v-if="props.controlsEnabled"
    ref="controls"
    class="home-hero-slideshow__controls"
    role="group"
    :aria-roledescription="messages.roleDescription"
    :aria-label="messages.groupLabel"
  >
    <div class="home-hero-slideshow__panel" data-home-hero-control>
      <div class="home-hero-slideshow__dots">
        <button
          v-for="(slide, index) in homeHeroSlides"
          :key="slide.id"
          class="home-hero-slideshow__dot-button"
          type="button"
          :aria-label="photoButtonLabel(index)"
          :aria-current="index === controller.displayIndicatorIndex.value ? 'true' : undefined"
          @click="controller.select(index)"
        >
          <span class="home-hero-slideshow__dot" aria-hidden="true"></span>
        </button>
      </div>

      <button
        class="home-hero-slideshow__play-button"
        type="button"
        :aria-label="state.reducedMotion || state.forcedColors
          ? messages.static
          : state.userPaused || state.focusPaused
            ? messages.play
            : messages.pause"
        :disabled="state.reducedMotion || state.forcedColors"
        @pointerdown="rememberPointerPlaybackIntent"
        @pointercancel="clearPointerPlaybackIntent"
        @click="togglePlayback($event)"
      >
        <svg v-if="state.userPaused || state.focusPaused || state.reducedMotion || state.forcedColors" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.5v13L19 12 8 5.5Z" fill="currentColor"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 5h4v14H7zM15 5h4v14h-4z" fill="currentColor"></path>
        </svg>
      </button>
    </div>
    <span class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</span>
  </div>
</template>
