<script setup>
defineProps({
  status: { type: String, default: 'active' },
  label: { type: String, default: '' }
})
</script>

<template>
  <span class="status-badge" :class="status">
    <i class="status-dot" aria-hidden="true"></i>
    <span v-if="label">{{ label }}</span>
    <slot v-else />
  </span>
</template>
