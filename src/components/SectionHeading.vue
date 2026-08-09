<script setup lang="ts">
withDefaults(defineProps<{
  no: string
  label: string
  title: string
  accent?: string
  copy?: string
  minor?: boolean
}>(), {
  accent: '',
  copy: '',
  minor: false
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
