<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'header' | 'footer' | 'full'
  tone?: 'brand' | 'mono'
}>(), {
  variant: 'header',
  tone: 'brand'
})

const isHeader = computed(() => props.variant === 'header')
const isFull = computed(() => props.variant === 'full')
</script>

<template>
  <span
    class="brand-mark"
    :class="[
      `brand-mark-${props.variant}`,
      { 'brand-mark-mono': props.tone === 'mono' }
    ]"
    :data-brand-tone="props.tone"
    aria-hidden="true"
  >
    <svg
      v-if="!isFull"
      class="brand-mark-svg"
      viewBox="0 0 128 128"
      width="128"
      height="128"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <g data-brand-part="orbit" fill="none" stroke-linecap="round">
        <ellipse class="brand-mark-orbit-ring" cx="64" cy="66" rx="56" ry="34" transform="rotate(-22 64 66)" />
        <path class="brand-mark-orbit-accent" d="M17 85c8 11 19 17 32 20" />
      </g>

      <g data-brand-part="y" stroke-linejoin="round">
        <path class="brand-mark-y-body" d="M16 17h29l19 27 19-27h29L78 66v45H50V66L16 17Z" />
        <path class="brand-mark-y-left" d="M20 20h20l24 34-10 9L20 20Z" />
        <path class="brand-mark-y-right" d="M108 20H88L64 54l10 9 34-43Z" />
      </g>

      <g data-brand-part="audio" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path class="brand-mark-audio-ribbon" d="M21 83c14-18 28-18 41-4 8 9 15 9 25-2 12-13 24-10 32-1" />
        <path class="brand-mark-audio-wave" d="M48 81v8M55 75v20M62 69v32M69 65v40M76 70v30M83 76v18" />
      </g>

      <g data-brand-part="neural" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path class="brand-mark-neural-line" d="M27 39l16 8M103 42L88 59M99 94l-12-9M23 82l15-11" />
        <circle class="brand-mark-node brand-mark-node-gold" cx="27" cy="39" r="4" />
        <circle class="brand-mark-node brand-mark-node-teal" cx="103" cy="42" r="4" />
        <circle class="brand-mark-node brand-mark-node-gold" cx="99" cy="94" r="4" />
        <circle class="brand-mark-node brand-mark-node-teal" cx="23" cy="82" r="4" />
      </g>
    </svg>

    <picture v-else>
      <source
        type="image/webp"
        srcset="
          /assets/brand/yance-mark-96.webp 1x,
          /assets/brand/yance-mark-128.webp 2x
        "
      >
      <img
        class="brand-mark-image"
        src="/assets/brand/yance-mark-fallback.png"
        width="128"
        height="128"
        alt=""
        :loading="isHeader ? 'eager' : 'lazy'"
        :fetchpriority="isHeader ? 'high' : 'low'"
        decoding="async"
        draggable="false"
      >
    </picture>
  </span>
</template>
