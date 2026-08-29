<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { usePageCompass } from '../composables/usePageCompass'
import { usePageCompassDisclosure } from '../composables/usePageCompassDisclosure'
import type { PageCompassSection } from '../data/types'
import { useLocale } from '../i18n'
import { formatCompassIndex } from '../utils/pageCompass'

const props = defineProps<{ sections: readonly PageCompassSection[] }>()
const {
  progress,
  percent,
  activeId,
  activeIndex,
  activeSection,
  selectSection,
  goTop
} = usePageCompass(() => props.sections)
const { messages } = useLocale()
const {
  mode,
  isExpanded,
  handlePointerEnter,
  handlePointerLeave,
  handleFocusIn: updateFocusIn,
  handleFocusOut: updateFocusOut,
  handleTriggerPointerDown,
  handleTriggerClick,
  closeCompass,
  suppressCompass: setSuppressed
} = usePageCompassDisclosure()

const compassRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null
  updateFocusOut(
    Boolean(nextTarget && compassRef.value?.contains(nextTarget)),
    Boolean(nextTarget)
  )
}

function suppressCompass() {
  setSuppressed()
  triggerRef.value?.focus({ preventScroll: true })
}

function handleSectionSelect(event: MouseEvent, id: string) {
  event.preventDefault()
  selectSection(id)
  setSuppressed()
  window.location.hash = id
  triggerRef.value?.focus({ preventScroll: true })
}

function handleReturnTop() {
  goTop()
  suppressCompass()
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target
  if (target instanceof Node && !compassRef.value?.contains(target)) closeCompass()
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isExpanded.value) return
  event.preventDefault()
  suppressCompass()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <div
    class="scroll-progress"
    role="progressbar"
    :aria-label="messages.compass.progress"
    :aria-valuetext="`${messages.compass.progress} ${percent}%`"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="scroll-bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>

  <nav
    ref="compassRef"
    class="page-compass"
    :class="{ 'page-compass-expanded': isExpanded }"
    :data-mode="mode"
    :aria-label="messages.compass.label"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @focusin="updateFocusIn"
    @focusout="handleFocusOut"
  >
    <button
      ref="triggerRef"
      class="page-compass-trigger"
      type="button"
      aria-controls="page-compass-panel"
      :aria-expanded="isExpanded"
      :aria-label="`${isExpanded ? messages.compass.close : messages.compass.open}: ${formatCompassIndex(activeIndex, props.sections.length)} ${activeSection?.shortLabel ?? activeSection?.label ?? ''}`"
      @pointerdown="handleTriggerPointerDown"
      @click="handleTriggerClick"
    >
      <span class="page-compass-trigger-index">{{ formatCompassIndex(activeIndex, props.sections.length) }}</span>
      <strong class="page-compass-trigger-section">{{ activeSection?.shortLabel ?? activeSection?.label }}</strong>
      <span class="page-compass-trigger-icon" aria-hidden="true">⌄</span>
    </button>

    <div
      id="page-compass-panel"
      class="page-compass-panel"
      :aria-hidden="isExpanded ? undefined : 'true'"
      :inert="!isExpanded"
    >
      <div class="page-compass-current">
        <span>{{ messages.compass.current }}</span>
        <strong>{{ activeSection?.label }}</strong>
      </div>

      <div class="page-compass-links">
        <a
          v-for="(section, index) in sections"
          :key="section.id"
          class="page-compass-link"
          :class="{ active: activeId === section.id }"
          :href="`#${section.id}`"
          :aria-label="`${messages.compass.goToSection}: ${section.label}`"
          :aria-current="activeId === section.id ? 'location' : undefined"
          @click="handleSectionSelect($event, section.id)"
        >
          <span class="page-compass-link-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="page-compass-link-label">{{ section.label }}</span>
          <span v-if="activeId === section.id" class="page-compass-link-current">{{ messages.compass.current }}</span>
        </a>
      </div>

      <div class="page-compass-read" aria-live="polite">
        <span>{{ messages.compass.progress }}</span>
        <strong>{{ percent }}% {{ messages.compass.read }}</strong>
      </div>

      <button
        class="page-compass-top"
        type="button"
        :aria-label="`${messages.compass.returnTop} · ${messages.compass.progress} ${percent}%`"
        @click="handleReturnTop"
      >
        <span aria-hidden="true">↑</span>
        <span>{{ messages.compass.returnTop }}</span>
      </button>
    </div>
  </nav>
</template>
