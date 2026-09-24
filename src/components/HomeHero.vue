<script setup lang="ts">
import '../styles/home-hero.css'
import { computed } from 'vue'
import { getLocalizedHomeCopy } from '../data/locales'
import { useLocale } from '../i18n'
import HomeHeroParticles from './HomeHeroParticles.vue'
import HomeHeroTypewriter from './HomeHeroTypewriter.vue'

const { locale, messages } = useLocale()
const home = computed(() => getLocalizedHomeCopy(locale.value))
</script>

<template>
  <section class="home-hero" aria-labelledby="home-hero-title">
    <div class="home-hero-grid" aria-hidden="true"></div>

    <div class="home-hero-inner">
      <div class="home-hero-copy">
        <p class="home-hero-kicker">{{ messages.page.home.kicker }}</p>

        <h1 id="home-hero-title" class="home-hero-title sr-only">{{ home.heroGreeting }} {{ home.heroStatement }}</h1>

        <HomeHeroTypewriter
          :greeting="home.heroGreeting"
          :statement="home.heroStatement"
        />

        <div class="home-hero-actions">
          <a class="hero-action primary" href="#selected-work">
            <span>{{ messages.actions.selectedWork }}</span>
            <span aria-hidden="true">↗</span>
          </a>
          <a class="hero-action secondary" href="#home-worlds">
            <span>{{ messages.actions.exploreWorlds }}</span>
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>

      <HomeHeroParticles />
    </div>
  </section>
</template>
