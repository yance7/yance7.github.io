<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useScrollProgress } from '../composables/useScrollProgress'
import type { PageCompassSection } from '../data/types'

const props = defineProps<{ sections: readonly PageCompassSection[] }>()
const { progress, percent } = useScrollProgress()
const activeId = ref(props.sections[0]?.id ?? '')
let observer: IntersectionObserver | null = null
let targetObserver: MutationObserver | null = null

const activeIndex = computed(() => Math.max(0, props.sections.findIndex((section) => section.id === activeId.value)))
const activeSection = computed(() => props.sections[activeIndex.value] ?? props.sections[0])
const previousSection = computed(() => props.sections[activeIndex.value - 1])
const nextSection = computed(() => props.sections[activeIndex.value + 1])
const progressStyle = computed(() => ({ '--page-progress': `${percent.value * 3.6}deg` }))

function disconnectTargets() {
  observer?.disconnect()
  observer = null
  targetObserver?.disconnect()
  targetObserver = null
}

function observeTargets() {
  observer?.disconnect()
  const targets = props.sections
    .map((section) => document.getElementById(section.id))
    .filter((target): target is HTMLElement => Boolean(target))

  if (!targets.length || !('IntersectionObserver' in window)) return false
  observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((left, right) => Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top))[0]
    if (visible) activeId.value = visible.target.id
  }, { rootMargin: '-24% 0px -64% 0px', threshold: 0 })
  targets.forEach((target) => observer?.observe(target))
  return targets.length === props.sections.length
}

function setupTargets() {
  disconnectTargets()
  void nextTick(() => {
    if (observeTargets()) return
    targetObserver = new MutationObserver(() => {
      if (observeTargets()) targetObserver?.disconnect()
    })
    targetObserver.observe(document.querySelector('#main') ?? document.body, { childList: true, subtree: true })
  })
}

function selectSection(id: string) {
  activeId.value = id
}

function goTop() {
  activeId.value = props.sections[0]?.id ?? ''
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  window.scrollTo({ top: 0, behavior })
}

onMounted(setupTargets)
watch(() => props.sections, () => {
  activeId.value = props.sections[0]?.id ?? ''
  setupTargets()
}, { deep: true })
onUnmounted(disconnectTargets)
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

  <nav class="page-compass" aria-label="页面章节罗盘">
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
      <a
        :class="{ disabled: !previousSection }"
        :href="previousSection ? `#${previousSection.id}` : undefined"
        :aria-disabled="!previousSection"
        :tabindex="previousSection ? 0 : -1"
        aria-label="上一章节"
        @click="previousSection && selectSection(previousSection.id)"
      >←</a>
      <a
        :class="{ disabled: !nextSection }"
        :href="nextSection ? `#${nextSection.id}` : undefined"
        :aria-disabled="!nextSection"
        :tabindex="nextSection ? 0 : -1"
        aria-label="下一章节"
        @click="nextSection && selectSection(nextSection.id)"
      >→</a>
    </div>
  </nav>
</template>
