<script setup>
defineProps({
  metrics: { type: Array, required: true },
  large: { type: Boolean, default: false }
})
</script>

<template>
  <div class="metric-strip" :class="{ large }">
    <div
      v-for="m in metrics"
      :key="m.label"
      class="metric-card"
      v-reveal
    >
      <b>{{ m.value }}</b>
      <span>{{ m.label }}</span>
      <small v-if="m.note">{{ m.note }}</small>
    </div>
  </div>
</template>
