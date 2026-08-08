<script setup lang="ts">
import type { Status } from '../data/types'

withDefaults(defineProps<{ status?: Status; label?: string }>(), {
  status: 'active',
  label: ''
})
</script>

<template>
  <span class="status-badge" :class="status">
    <i class="status-dot" aria-hidden="true"></i>
    <span v-if="label">{{ label }}</span>
    <slot v-else />
  </span>
</template>
