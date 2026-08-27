<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'header' | 'footer'
}>(), {
  variant: 'header'
})

const isHeader = computed(() => props.variant === 'header')
</script>

<template>
  <span
    class="brand-mark"
    :class="`brand-mark-${variant}`"
    aria-hidden="true"
  >
    <picture>
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
