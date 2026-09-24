<script setup lang="ts">
const props = defineProps<{
  greeting: string
  statement: string
}>()
</script>

<template>
  <div class="home-hero-typewriter" aria-hidden="true" data-final-state="true">
    <span class="home-hero-typewriter-line">{{ props.greeting }}</span>
    <span class="home-hero-typewriter-line home-hero-typewriter-line-accent">
      {{ props.statement }}<span class="home-hero-cursor" aria-hidden="true">_</span>
    </span>
  </div>
</template>
