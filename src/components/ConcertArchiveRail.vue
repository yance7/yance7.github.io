<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { Concert, LightboxPayload } from '../data/types'
import type { ConcertLocaleCopy } from '../data/locales/types'
import { useLocale } from '../i18n'
import { originalImageUrl, thumbnailUrl } from '../utils/concertMedia'
import { sharedImagePreloader } from '../utils/imagePreload'

const props = defineProps<{
  concerts: Concert[]
  section: ConcertLocaleCopy['section']
}>()

const emit = defineEmits<{
  'open-lightbox': [payload: LightboxPayload]
}>()

const railRef = ref<HTMLElement | null>(null)
const carouselIndexes = reactive<Record<string, number>>({})
const railControls = reactive({ previous: false, next: false })
const reducedMotion = ref(false)
const imagePreloader = sharedImagePreloader
const { messages } = useLocale()
let resizeObserver: ResizeObserver | undefined
let reducedMotionQuery: MediaQueryList | undefined

function formatConcertDate(date: string) {
  return date.replaceAll('-', '.')
}

function currentImageName(item: Concert, fallbackIndex = 0) {
  const index = carouselIndexes[item.id] ?? fallbackIndex
  return item.images[index] ?? item.images[0]
}

function moveCarousel(item: Concert, step: number) {
  const current = carouselIndexes[item.id] || 0
  const next = (current + step + item.images.length) % item.images.length
  carouselIndexes[item.id] = next
}

function openLightbox(item: Concert, index = 0, event?: MouseEvent) {
  if (event?.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  const [first, ...rest] = item.images.map(originalImageUrl)
  if (!first) return
  emit('open-lightbox', {
    images: [first, ...rest],
    index,
    meta: { artist: item.artist, tour: item.tour }
  })
}

function preloadItem(item: Concert) {
  imagePreloader.preload(originalImageUrl(currentImageName(item)))
}

function updateRailControls() {
  const rail = railRef.value
  if (!rail) return
  const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth)
  const tolerance = 1
  railControls.previous = rail.scrollLeft > tolerance
  railControls.next = rail.scrollLeft < maxScrollLeft - tolerance
}

function scrollRail(direction: -1 | 1) {
  const rail = railRef.value
  const cards = rail ? [...rail.querySelectorAll<HTMLElement>('.concert-rail-card')] : []
  const firstCard = cards[0]
  if (!rail || !firstCard) return

  const currentIndex = cards.reduce((nearestIndex, card, index) => {
    const nearestCard = cards[nearestIndex]!
    const cardOffset = Math.abs((card.offsetLeft - firstCard.offsetLeft) - rail.scrollLeft)
    const nearestOffset = Math.abs((nearestCard.offsetLeft - firstCard.offsetLeft) - rail.scrollLeft)
    return cardOffset < nearestOffset ? index : nearestIndex
  }, 0)
  const targetCard = cards[Math.max(0, Math.min(cards.length - 1, currentIndex + direction))]
  if (!targetCard) return
  const behavior = reducedMotion.value ? 'auto' : 'smooth'
  const isTouchViewport = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
  if (isTouchViewport) {
    if (behavior === 'auto') {
      targetCard.scrollIntoView({ behavior, block: 'nearest', inline: 'start' })
      updateRailControls()
      return
    }
    requestAnimationFrame(() => {
      targetCard.scrollIntoView({ behavior, block: 'nearest', inline: 'start' })
      updateRailControls()
    })
    return
  }

  const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth)
  const targetScrollLeft = Math.max(0, Math.min(
    maxScrollLeft,
    targetCard.offsetLeft - firstCard.offsetLeft
  ))
  requestAnimationFrame(() => {
    if (behavior === 'auto') {
      rail.scrollLeft = targetScrollLeft
    } else {
      rail.scrollTo({
        left: targetScrollLeft,
        behavior
      })
    }
    updateRailControls()
  })
}

function onRailWheel(event: WheelEvent) {
  if (!event.shiftKey) return
  const delta = event.deltaX || event.deltaY
  if (!delta) return
  const rail = event.currentTarget as HTMLElement
  const previousSnapType = rail.style.scrollSnapType
  const previousBehavior = rail.style.scrollBehavior
  rail.style.scrollSnapType = 'none'
  rail.style.scrollBehavior = 'auto'
  rail.scrollLeft = Math.max(0, Math.min(rail.scrollWidth - rail.clientWidth, rail.scrollLeft + delta))
  requestAnimationFrame(() => {
    rail.style.scrollSnapType = previousSnapType
    rail.style.scrollBehavior = previousBehavior
  })
  event.preventDefault()
}

function syncReducedMotion(event?: MediaQueryListEvent) {
  reducedMotion.value = event?.matches ?? reducedMotionQuery?.matches ?? false
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncReducedMotion()
  reducedMotionQuery.addEventListener('change', syncReducedMotion)

  const rail = railRef.value
  if (rail) {
    resizeObserver = new ResizeObserver(updateRailControls)
    resizeObserver.observe(rail)
  }
  nextTick(updateRailControls)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  reducedMotionQuery?.removeEventListener('change', syncReducedMotion)
})
</script>

<template>
  <div class="concert-archive-shell">
    <div class="concert-archive-tools">
      <span class="concert-archive-hint" aria-hidden="true">↔</span>
      <div class="concert-rail-controls" role="group" :aria-label="section.archive">
        <button
          type="button"
          data-rail-direction="previous"
          aria-controls="concert-archive-rail"
          :aria-label="messages.common.previous"
          :disabled="!railControls.previous"
          @click="scrollRail(-1)"
        >
          ←
        </button>
        <button
          type="button"
          data-rail-direction="next"
          aria-controls="concert-archive-rail"
          :aria-label="messages.common.next"
          :disabled="!railControls.next"
          @click="scrollRail(1)"
        >
          →
        </button>
      </div>
    </div>

    <div
      ref="railRef"
      id="concert-archive-rail"
      class="concert-archive-rail"
      data-horizontal-scroll
      role="region"
      :aria-label="section.archive"
      @scroll="updateRailControls"
      @wheel="onRailWheel"
    >
      <div class="concert-rail-track">
        <article
          v-for="item in props.concerts"
          :key="item.id"
          class="concert-rail-card"
          :data-anchor-id="`concert-${item.id}`"
          :data-concert-id="item.id"
          data-concert-status="attended"
          v-reveal
          @mouseenter="preloadItem(item)"
          @focusin="preloadItem(item)"
        >
          <div
            class="concert-poster"
            :class="{ land: item.land }"
            v-pointer-sheen="{ tilt: 6, tiltExclude: '.carousel-controls' }"
          >
            <button
              class="poster-open"
              type="button"
              :aria-label="`${messages.lightbox.openArchive}: ${item.artist} ${item.tour}`"
              @click="openLightbox(item, carouselIndexes[item.id] || 0, $event)"
            >
              <Transition name="poster-fade" mode="out-in">
                <picture :key="currentImageName(item)">
                  <source :srcset="thumbnailUrl(currentImageName(item))" type="image/webp">
                  <img
                    :src="originalImageUrl(currentImageName(item))"
                    :alt="`${item.artist} ${item.tour} ${messages.lightbox.posterAlt}`"
                    :width="item.land ? 640 : 480"
                    :height="item.land ? 360 : 640"
                    loading="lazy"
                    decoding="async"
                  >
                </picture>
              </Transition>
              <span class="poster-hint" aria-hidden="true">
                <span>{{ section.posterArchive }}</span><b>＋</b>
              </span>
            </button>
            <div v-if="item.images.length > 1" class="carousel-controls">
              <button type="button" :aria-label="messages.common.previous" @click.stop="moveCarousel(item, -1)">←</button>
              <span>{{ (carouselIndexes[item.id] || 0) + 1 }} / {{ item.images.length }}</span>
              <button type="button" :aria-label="messages.common.next" @click.stop="moveCarousel(item, 1)">→</button>
            </div>
          </div>

          <div class="concert-rail-card-info">
            <time class="concert-date" :datetime="item.date">
              {{ formatConcertDate(item.date) }}<span></span>
            </time>
            <div class="concert-info">
              <span class="concert-status">{{ section.attended }}</span>
              <span class="concert-venue">{{ item.venue }}</span>
              <h3>{{ item.artist }}</h3>
              <p>{{ item.tour }}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
