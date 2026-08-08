<script setup>
defineProps({
  no: { type: String, required: true },
  label: { type: String, required: true },
  title: { type: String, required: true },
  accent: { type: String, default: '' },
  copy: { type: String, default: '' },
  minor: { type: Boolean, default: false }
})
</script>

<template>
  <div class="section-head" :class="{ minor }" v-reveal>
    <span class="section-no">{{ no }}</span>
    <p class="section-label">{{ label }}</p>
    <h2>{{ title }}<span class="accent" v-if="accent">{{ accent }}</span></h2>
    <p class="section-copy" v-if="copy">{{ copy }}</p>
  </div>
</template>
