<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useScrollProgress } from '../composables/useScrollProgress'
import type { PageCompassSection } from '../data/types'
import { decodeHashTarget } from '../utils/navigation'

const props = defineProps<{ sections: readonly PageCompassSection[] }>()
const { progress, percent } = useScrollProgress()
const activeId = ref(props.sections[0]?.id ?? '')
const mobileViewport = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)
type MobileCompassState = 'quiet' | 'reading' | 'visible'

const MOBILE_TOP_THRESHOLD = 16
const MOBILE_SCROLL_DELTA = 4
const MOBILE_IDLE_DELAY = 420
const mobileCompassState = ref<MobileCompassState>(mobileViewport.value ? 'quiet' : 'visible')
const mobileFocusWithin = ref(false)
const mobileCompassVisible = computed(() => !mobileViewport.value || mobileFocusWithin.value || mobileCompassState.value === 'visible')
const mobileCompassDataState = computed(() => mobileCompassVisible.value ? 'visible' : mobileCompassState.value)
let observer: IntersectionObserver | null = null
let mobileQuery: MediaQueryList | null = null
let mobileIdleTimer: number | null = null
let lastScrollY = 0

const activeIndex = computed(() => Math.max(0, props.sections.findIndex((section) => section.id === activeId.value)))
const activeSection = computed(() => props.sections[activeIndex.value] ?? props.sections[0])
const previousSection = computed(() => props.sections[activeIndex.value - 1])
const nextSection = computed(() => props.sections[activeIndex.value + 1])
const progressStyle = computed(() => ({ '--page-progress': `${percent.value * 3.6}deg` }))

function disconnectTargets() {
  observer?.disconnect()
  observer = null
}

function observeTargets() {
  observer?.disconnect()
  const targets = props.sections
    .map((section) => document.getElementById(section.id))
    .filter((target): target is HTMLElement => Boolean(target))

  if (!targets.length || !('IntersectionObserver' in window)) return
  observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((left, right) => Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top))[0]
    if (visible) activeId.value = visible.target.id
  }, { rootMargin: '-24% 0px -64% 0px', threshold: 0 })
  targets.forEach((target) => observer?.observe(target))
}

function setupTargets() {
  disconnectTargets()
  const hashTarget = decodeHashTarget(window.location.hash)
  if (hashTarget && props.sections.some((section) => section.id === hashTarget)) {
    activeId.value = hashTarget
  }
  void nextTick(observeTargets)
}

function clearMobileIdleTimer() {
  if (mobileIdleTimer === null) return
  window.clearTimeout(mobileIdleTimer)
  mobileIdleTimer = null
}

function currentScrollY() {
  return Math.max(0, window.scrollY || document.documentElement.scrollTop)
}

function scheduleMobileIdleReveal() {
  clearMobileIdleTimer()
  mobileIdleTimer = window.setTimeout(() => {
    mobileIdleTimer = null
    mobileCompassState.value = currentScrollY() <= MOBILE_TOP_THRESHOLD ? 'quiet' : 'visible'
  }, MOBILE_IDLE_DELAY)
}

function handleMobileScroll() {
  const scrollY = currentScrollY()
  const delta = scrollY - lastScrollY
  lastScrollY = scrollY
  if (!mobileViewport.value) return

  if (scrollY <= MOBILE_TOP_THRESHOLD) {
    clearMobileIdleTimer()
    mobileCompassState.value = 'quiet'
    return
  }

  if (mobileCompassState.value === 'quiet' || delta > MOBILE_SCROLL_DELTA) {
    mobileCompassState.value = 'reading'
  } else if (delta < -MOBILE_SCROLL_DELTA) {
    mobileCompassState.value = 'visible'
  }
  scheduleMobileIdleReveal()
}

function handleCompassFocusOut(event: FocusEvent) {
  const currentTarget = event.currentTarget
  const relatedTarget = event.relatedTarget
  if (currentTarget instanceof HTMLElement && relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return
  mobileFocusWithin.value = false
}

function selectSection(id: string) {
  activeId.value = id
}

function goTop() {
  activeId.value = props.sections[0]?.id ?? ''
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  window.scrollTo({ top: 0, behavior })
}

function syncMobileViewport(event?: MediaQueryListEvent) {
  mobileViewport.value = event?.matches ?? mobileQuery?.matches ?? window.innerWidth <= 760
  lastScrollY = currentScrollY()
  clearMobileIdleTimer()
  mobileCompassState.value = !mobileViewport.value || lastScrollY > MOBILE_TOP_THRESHOLD ? 'visible' : 'quiet'
}

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 760px)')
  syncMobileViewport()
  mobileQuery.addEventListener('change', syncMobileViewport)
  window.addEventListener('scroll', handleMobileScroll, { passive: true })
  setupTargets()
})
watch(() => props.sections, () => {
  activeId.value = props.sections[0]?.id ?? ''
  setupTargets()
}, { deep: true })
onUnmounted(() => {
  disconnectTargets()
  mobileQuery?.removeEventListener('change', syncMobileViewport)
  window.removeEventListener('scroll', handleMobileScroll)
  clearMobileIdleTimer()
})
</script>

<template>
  <div
    class="scroll-progress"
    role="progressbar"
    aria-label="页面阅读进度"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="scroll-bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>

  <nav
    class="page-compass"
    :class="{
      'page-compass-quiet': !mobileCompassVisible && mobileCompassState === 'quiet',
      'page-compass-reading': !mobileCompassVisible && mobileCompassState === 'reading'
    }"
    :data-mobile-state="mobileCompassDataState"
    :aria-hidden="mobileCompassVisible ? undefined : 'true'"
    :inert="!mobileCompassVisible"
    aria-label="页面章节罗盘"
    @focusin="mobileFocusWithin = true"
    @focusout="handleCompassFocusOut"
  >
    <button
      class="page-compass-top page-compass-progress"
      type="button"
      :style="progressStyle"
      :aria-label="`回到顶部，当前阅读进度 ${percent}%`"
      :title="`回到顶部 · ${percent}%`"
      @click="goTop"
    >
      <span aria-hidden="true">↑</span>
      <small>{{ percent }}%</small>
    </button>

    <div class="page-compass-current" aria-live="polite">
      <span>{{ String(activeIndex + 1).padStart(2, '0') }} / {{ String(sections.length).padStart(2, '0') }}</span>
      <strong>{{ activeSection?.shortLabel ?? activeSection?.label }}</strong>
    </div>

    <div class="page-compass-links">
      <a
        v-for="(section, index) in sections"
        :key="section.id"
        class="page-compass-link"
        :class="{ active: activeId === section.id }"
        :href="`#${section.id}`"
        :aria-label="`前往章节：${section.label}`"
        :aria-current="activeId === section.id ? 'location' : undefined"
        @click="selectSection(section.id)"
      >
        <i aria-hidden="true"></i>
        <span>{{ String(index + 1).padStart(2, '0') }}</span>
        <strong>{{ section.label }}</strong>
      </a>
    </div>

    <div class="page-compass-step">
      <template v-if="previousSection">
        <a
          :href="`#${previousSection.id}`"
          aria-label="上一章节"
          @click="selectSection(previousSection.id)"
        >←</a>
      </template>
      <span v-else class="page-compass-step-disabled" aria-hidden="true">←</span>
      <template v-if="nextSection">
        <a
          :href="`#${nextSection.id}`"
          aria-label="下一章节"
          @click="selectSection(nextSection.id)"
        >→</a>
      </template>
      <span v-else class="page-compass-step-disabled" aria-hidden="true">→</span>
    </div>
  </nav>
</template>
