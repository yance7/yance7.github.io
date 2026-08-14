<script setup lang="ts">
import { computed } from 'vue'
import { statusLabels } from '../data'
import type { Status } from '../data/types'

const props = defineProps<{ status: Status; labelOverride?: string }>()
const label = computed(() => props.labelOverride ?? statusLabels[props.status])
</script>

<template>
  <span class="status-badge" :class="status">
    <i class="status-dot" aria-hidden="true"></i>
    <span>{{ label }}</span>
  </span>
</template>
