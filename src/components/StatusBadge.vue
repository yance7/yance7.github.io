<script setup lang="ts">
import type { Status } from '../data/types'

defineProps<{ status: Status; label: string }>()
</script>

<template>
  <span class="status-badge" :class="status">
    <i class="status-dot" aria-hidden="true"></i>
    <span>{{ label }}</span>
  </span>
</template>
