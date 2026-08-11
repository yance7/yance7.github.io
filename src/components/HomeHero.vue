<script setup lang="ts">
import { computed } from 'vue'
import { heroGeo } from '../data'
import HomeArchiveIndex from './HomeArchiveIndex.vue'

const props = defineProps<{
  kicker: string
  copy: string
}>()

const geo = computed(() => heroGeo.home)
</script>

<template>
  <section class="home-hero">
    <div class="home-hero-grid" aria-hidden="true"></div>
    <div class="home-hero-glow home-hero-glow-one" aria-hidden="true"></div>
    <div class="home-hero-glow home-hero-glow-two" aria-hidden="true"></div>

    <div class="home-stage">
      <div class="home-stage-meta" v-reveal>
        <div class="home-stage-kicker">
          <span class="home-stage-mark">01 / 06</span>
          <span>{{ props.kicker }}</span>
        </div>
        <span class="home-stage-identity">RESEARCHER / BUILDER / MUSIC LISTENER</span>
      </div>

      <div class="home-stage-body">
        <div class="home-stage-main">
          <div class="home-stage-heading" v-reveal="{ delay: 100 }">
            <span class="home-stage-heading-line"></span>
            <span>OPEN ARCHIVE / {{ geo }}</span>
          </div>

          <h1 class="home-stage-title" v-reveal="{ delay: 140 }">
            研究、构建，<br><em>与现场相遇。</em>
          </h1>

          <div class="home-stage-copy-block" v-reveal="{ delay: 180 }">
            <p class="home-stage-copy">{{ props.copy }}</p>
          </div>

          <HomeArchiveIndex />
        </div>
      </div>

      <a class="home-stage-scroll" href="#selected-work" v-reveal="{ delay: 420 }">
        <span class="home-stage-scroll-line" aria-hidden="true"></span>
        <span>SCROLL TO EXPLORE</span>
        <span class="home-stage-scroll-arrow" aria-hidden="true">↓</span>
      </a>
    </div>
  </section>
</template>
