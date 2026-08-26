<script setup lang="ts">
import { computed } from 'vue'
import type { Status } from '../data/types'
import { useLocale } from '../i18n'

const props = defineProps<{ status: Status; labelOverride?: string }>()
const { messages } = useLocale()
const label = computed(() => props.labelOverride ?? messages.value.status[props.status])
</script>

<template>
  <span class="status-badge" :class="status" :data-status="status">
    <i class="status-dot" aria-hidden="true"></i>
    <span>{{ label }}</span>
  </span>
</template>
