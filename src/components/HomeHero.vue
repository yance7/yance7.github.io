<script setup lang="ts">
import { computed } from 'vue'
import { heroGeo, homeSignals } from '../data'
import LyricCarousel from './LyricCarousel.vue'

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
            <span>AN OPEN ARCHIVE OF CURIOSITY</span>
          </div>

          <LyricCarousel />

          <div class="home-stage-copy-block" v-reveal="{ delay: 260 }">
            <p class="home-stage-copy">{{ props.copy }}</p>
            <nav class="home-stage-actions" aria-label="首页快速入口">
              <a class="hero-action primary" href="#selected-work">
                查看精选内容
                <span aria-hidden="true">↓</span>
              </a>
              <a class="hero-action secondary" href="research.html">
                从研究开始
                <span aria-hidden="true">↗</span>
              </a>
            </nav>
          </div>
        </div>

        <aside class="home-stage-rail home-signal-board" aria-label="档案快速索引" v-reveal="{ delay: 180, variant: 'fade-left' }">
          <div class="home-signal-head">
            <span>LIVE INDEX</span>
            <span class="home-signal-online"><i aria-hidden="true"></i> ONLINE</span>
          </div>
          <a v-for="signal in homeSignals" :key="signal.label" class="home-signal" :href="signal.href">
            <span>{{ signal.label }}</span>
            <strong>{{ signal.value }}</strong>
            <small>{{ signal.meta }}</small>
            <i aria-hidden="true">↗</i>
          </a>
          <div class="archive-coords">
            <span class="coords-label">ARCHIVE 01 / 06</span>
            <span class="coords-geo">{{ geo }}</span>
          </div>
        </aside>
      </div>

      <a class="home-stage-scroll" href="#selected-work" v-reveal="{ delay: 420 }">
        <span class="home-stage-scroll-line" aria-hidden="true"></span>
        <span>SCROLL TO EXPLORE</span>
        <span class="home-stage-scroll-arrow" aria-hidden="true">↓</span>
      </a>
    </div>
  </section>
</template>
