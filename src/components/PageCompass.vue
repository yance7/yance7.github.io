<script setup lang="ts">
import { usePageCompass } from '../composables/usePageCompass'
import type { PageCompassSection } from '../data/types'
import { formatCompassIndex } from '../utils/pageCompass'

const props = defineProps<{ sections: readonly PageCompassSection[] }>()
const {
  progress,
  percent,
  activeId,
  activeIndex,
  activeSection,
  previousSection,
  nextSection,
  mobileState,
  mobileVisible,
  mobileDataState,
  progressStyle,
  handleCompassFocusIn,
  handleCompassFocusOut,
  selectSection,
  goTop
} = usePageCompass(() => props.sections)
</script>

<template>
  <div
    class="scroll-progress"
    role="progressbar"
    aria-label="页面阅读进度"
    :aria-valuetext="`页面阅读进度 ${percent}%`"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="scroll-bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>

  <nav
    class="page-compass"
    :class="{
      'page-compass-quiet': !mobileVisible && mobileState === 'quiet',
      'page-compass-reading': !mobileVisible && mobileState === 'reading'
    }"
    :data-mobile-state="mobileDataState"
    :aria-hidden="mobileVisible ? undefined : 'true'"
    :inert="!mobileVisible"
    aria-label="页面章节罗盘"
    @focusin="handleCompassFocusIn"
    @focusout="handleCompassFocusOut"
  >
    <button
      class="page-compass-top page-compass-progress"
      type="button"
      :style="progressStyle"
      :aria-label="`回到顶部，当前阅读进度 ${percent}%`"
      aria-describedby="page-compass-top-tip"
      @click="goTop"
    >
      <span aria-hidden="true">↑</span>
      <small>{{ percent }}%</small>
      <span id="page-compass-top-tip" class="page-compass-top-tooltip" role="tooltip">
        <strong>RETURN TO TOP</strong>
        <small>{{ percent }}% READ</small>
      </span>
    </button>

    <div class="page-compass-current">
      <span>{{ formatCompassIndex(activeIndex, props.sections.length) }}</span>
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
        :aria-describedby="`compass-tip-${section.id}`"
        @click="selectSection(section.id)"
      >
        <i aria-hidden="true"></i>
        <span>{{ String(index + 1).padStart(2, '0') }}</span>
        <span :id="`compass-tip-${section.id}`" class="page-compass-tooltip" role="tooltip">
          <small>{{ String(index + 1).padStart(2, '0') }}</small>
          <strong>{{ section.label }}</strong>
          <em v-if="activeId === section.id">CURRENT</em>
        </span>
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
