<script setup lang="ts">
import BrandMark from './BrandMark.vue'
</script>

<template>
  <div class="home-hero-particles" aria-hidden="true" data-static-visual="brand-mark">
    <span class="home-hero-particles-orbit home-hero-particles-orbit-one"></span>
    <span class="home-hero-particles-orbit home-hero-particles-orbit-two"></span>
    <span class="home-hero-particles-dot home-hero-particles-dot-one"></span>
    <span class="home-hero-particles-dot home-hero-particles-dot-two"></span>
    <div class="home-hero-particles-mark">
      <BrandMark variant="full" />
    </div>
    <div class="home-hero-particles-labels">
      <span>RESEARCH</span>
      <span>BUILD</span>
      <span>LIVE</span>
    </div>
  </div>
</template>
