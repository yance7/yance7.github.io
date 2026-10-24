<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Concert, LightboxPayload } from '../data/types'
import type { ConcertLocaleCopy } from '../data/locales/types'
import { isConcertUpcoming } from '../data/concerts'
import { useLocale } from '../i18n'
import { originalImageUrl } from '../utils/concertMedia'
import ConcertPoster from './ConcertPoster.vue'
import { findNearestCenteredIndex, getCenteredScrollLeft, getRailInset, isRailDestinationPending } from '../utils/horizontalRail'

const props = defineProps<{
  concerts: Concert[]
  now: Date
  section: ConcertLocaleCopy['section']
}>()
const emit = defineEmits<{ 'open-lightbox': [payload: LightboxPayload] }>()
const railRef = ref<HTMLElement | null>(null)
const railControls = reactive({ previous: false, next: false })
const reducedMotion = ref(false)
const { messages } = useLocale()
let resizeObserver: ResizeObserver | undefined
let reducedMotionQuery: MediaQueryList | undefined
let pendingIndex: number | undefined
let pendingScrollStart = 0
let visibleIndex = 0
let layoutFrame: number | undefined
let controlFrame: number | undefined
let hasLayout = false
let needsAlignment = false
let layoutWidth = 0
let layoutCardWidth = 0
let mounted = false

function formatConcertDate(date: string) {
  return date.replaceAll('-', '.')
}

function openLightbox(item: Concert, event?: MouseEvent) {
  if (event?.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  emit('open-lightbox', {
    images: [originalImageUrl(item.poster.file)],
    index: 0,
    meta: { artist: item.artist, tour: item.tour }
  })
}

function statusFor(item: Concert) {
  return isConcertUpcoming(item, props.now) ? 'upcoming' : 'attended'
}

function cardsFor(rail: HTMLElement) {
  return [...rail.querySelectorAll<HTMLElement>('.concert-rail-card')]
}

function centersFor(cards: HTMLElement[]) {
  return cards.map(card => card.offsetLeft + card.offsetWidth / 2)
}

function updateRailControls() {
  const rail = railRef.value
  if (!rail) return
  const cards = cardsFor(rail)
  const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth)
  if (cards.length < 2 || maxScrollLeft <= 1) {
    railControls.previous = false
    railControls.next = false
    pendingIndex = undefined
    return
  }
  const centers = centersFor(cards)
  // Keep rapid clicks queued only while movement follows the requested path.
  if (pendingIndex !== undefined && !isRailDestinationPending(rail.scrollLeft, pendingScrollStart, getCenteredScrollLeft(centers[pendingIndex]!, rail.clientWidth, maxScrollLeft))) pendingIndex = undefined
  visibleIndex = findNearestCenteredIndex(centers, rail.scrollLeft + rail.clientWidth / 2)
  const index = pendingIndex ?? visibleIndex
  railControls.previous = index > 0
  railControls.next = index < cards.length - 1
}

function onRailScroll() {
  if (controlFrame !== undefined) return
  controlFrame = requestAnimationFrame(() => {
    controlFrame = undefined
    if (layoutFrame !== undefined) return
    updateRailControls()
  })
}

function clearPendingTarget() {
  pendingIndex = undefined
  onRailScroll()
}

function onRailTarget(event: Event) {
  const rail = railRef.value
  if (!rail) return
  const index = cardsFor(rail).indexOf((event as CustomEvent<HTMLElement>).detail)
  if (index < 0) return
  pendingScrollStart = rail.scrollLeft
  pendingIndex = index
  visibleIndex = index
}

function scrollRail(direction: -1 | 1) {
  const rail = railRef.value
  if (!rail) return
  const centers = centersFor(cardsFor(rail))
  if (!centers.length || rail.scrollWidth <= rail.clientWidth + 1) return
  const current = pendingIndex ?? findNearestCenteredIndex(centers, rail.scrollLeft + rail.clientWidth / 2)
  pendingScrollStart = rail.scrollLeft
  pendingIndex = Math.max(0, Math.min(centers.length - 1, current + direction))
  rail.scrollTo({
    left: getCenteredScrollLeft(centers[pendingIndex]!, rail.clientWidth, rail.scrollWidth - rail.clientWidth),
    behavior: reducedMotion.value ? 'auto' : 'smooth'
  })
  updateRailControls()
}

function measureLayout() {
  layoutFrame = undefined
  const rail = railRef.value
  if (!rail || !mounted) return
  const previousInset = rail.style.getPropertyValue('--rail-inset')
  const cards = cardsFor(rail)
  const first = cards[0]
  const last = cards.at(-1)
  const width = rail.clientWidth
  const cardWidth = first?.offsetWidth ?? 0
  const index = hasLayout ? pendingIndex ?? visibleIndex : 0
  const span = first && last ? last.offsetLeft + last.offsetWidth - first.offsetLeft : 0
  const inset = getRailInset(width, cardWidth, span, cards.length)
  const changed = previousInset !== inset + 'px' || layoutWidth !== width || layoutCardWidth !== cardWidth
  rail.style.setProperty('--rail-inset', inset + 'px')
  if ((changed || !hasLayout || needsAlignment) && cards[index]) {
    const card = cards[index]!
    rail.scrollTo({ left: getCenteredScrollLeft(card.offsetLeft + card.offsetWidth / 2, rail.clientWidth, rail.scrollWidth - rail.clientWidth), behavior: 'auto' })
    pendingIndex = undefined
  }
  hasLayout = true
  layoutWidth = width
  layoutCardWidth = cardWidth
  needsAlignment = false
  rail.dataset.railReady = 'true'
  updateRailControls()
}

function scheduleLayout() {
  if (!mounted || layoutFrame !== undefined) return
  layoutFrame = requestAnimationFrame(measureLayout)
}

function observeCards() {
  resizeObserver?.disconnect()
  const rail = railRef.value
  if (rail) {
    resizeObserver?.observe(rail)
    const first = cardsFor(rail)[0]
    if (first) resizeObserver?.observe(first)
  }
  scheduleLayout()
}

function syncReducedMotion(event?: MediaQueryListEvent) {
  reducedMotion.value = event?.matches ?? reducedMotionQuery?.matches ?? false
  const rail = railRef.value
  if (reducedMotion.value && rail && pendingIndex !== undefined) {
    const card = cardsFor(rail)[pendingIndex]
    if (card) rail.scrollTo({ left: getCenteredScrollLeft(card.offsetLeft + card.offsetWidth / 2, rail.clientWidth, rail.scrollWidth - rail.clientWidth), behavior: 'auto' })
  }
  clearPendingTarget()
}

watch(() => props.concerts.map(item => item.id).join('|'), (ids, previousIds) => {
  const previousId = previousIds.split('|')[pendingIndex ?? visibleIndex]
  const retainedIndex = ids.split('|').indexOf(previousId ?? '')
  pendingIndex = undefined
  visibleIndex = retainedIndex >= 0 ? retainedIndex : Math.max(0, Math.min(visibleIndex, props.concerts.length - 1))
  needsAlignment = true
  void nextTick(observeCards)
}, { flush: 'post' })

onMounted(() => {
  mounted = true
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncReducedMotion()
  reducedMotionQuery.addEventListener('change', syncReducedMotion)
  if (typeof ResizeObserver !== 'undefined') resizeObserver = new ResizeObserver(scheduleLayout)
  const rail = railRef.value
  rail?.addEventListener('pointerdown', clearPendingTarget, { passive: true })
  rail?.addEventListener('wheel', clearPendingTarget, { passive: true })
  rail?.addEventListener('touchstart', clearPendingTarget, { passive: true })
  window.addEventListener('resize', scheduleLayout)
  document.fonts?.addEventListener('loadingdone', scheduleLayout)
  void document.fonts?.ready.then(() => { if (mounted) scheduleLayout() })
  observeCards()
})

onBeforeUnmount(() => {
  mounted = false
  resizeObserver?.disconnect()
  reducedMotionQuery?.removeEventListener('change', syncReducedMotion)
  railRef.value?.removeEventListener('pointerdown', clearPendingTarget)
  railRef.value?.removeEventListener('wheel', clearPendingTarget)
  railRef.value?.removeEventListener('touchstart', clearPendingTarget)
  window.removeEventListener('resize', scheduleLayout)
  document.fonts?.removeEventListener('loadingdone', scheduleLayout)
  if (layoutFrame !== undefined) cancelAnimationFrame(layoutFrame)
  if (controlFrame !== undefined) cancelAnimationFrame(controlFrame)
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
      data-horizontal-align="center"
      role="region"
      :aria-label="section.archive"
      @scroll="onRailScroll"
      @rail-target="onRailTarget"
      @pointerdown="clearPendingTarget"
      @focusin="clearPendingTarget"
    >
      <div class="concert-rail-track">
        <article
          v-for="(item, i) in props.concerts"
          :key="item.id"
          class="concert-rail-card"
          :data-anchor-id="`concert-${item.id}`"
          :data-concert-id="item.id"
          :data-concert-status="statusFor(item)"
          v-reveal="{ delay: Math.min(i, 3) * 60 }"
        >
          <ConcertPoster
            :poster="item.poster"
            :artist="item.artist"
            :tour="item.tour"
            :open-label="messages.lightbox.openArchive + ': ' + item.artist + ' ' + item.tour"
            :hint="section.posterArchive"
            @open="openLightbox(item, $event)"
          />

          <div class="concert-rail-card-info">
            <time class="concert-date" :datetime="item.date">
              {{ formatConcertDate(item.date) }}<span></span>
            </time>
            <div class="concert-info">
              <span class="concert-status" :class="{ upcoming: statusFor(item) === 'upcoming' }">
                {{ statusFor(item) === 'upcoming' ? section.upcoming : section.attended }}
              </span>
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
