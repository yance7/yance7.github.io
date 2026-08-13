<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{ alt?: string }>(), { alt: '' })
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
