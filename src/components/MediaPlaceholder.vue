<script setup>
import { ref } from 'vue'

defineProps({
  alt: { type: String, default: '' }
})
const loaded = ref(false)
</script>

<template>
  <div class="media-ph" :class="{ loaded }">
    <div v-if="!loaded" class="ph-shimmer" aria-hidden="true"></div>
    <img
      v-bind="$attrs"
      @load="loaded = true"
      :alt="alt"
    >
  </div>
</template>
