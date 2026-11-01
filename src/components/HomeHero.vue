<script setup lang="ts">
import '../styles/home-hero.css'
import { computed, ref } from 'vue'
import { getLocalizedHomeCopy } from '../data/locales'
import { useHomeHeroIntro } from '../composables/useHomeHeroIntro'
import { useLocale } from '../i18n'
import HomeHeroParticles from './HomeHeroParticles.vue'
import HomeHeroSlideshow from './HomeHeroSlideshow.vue'
import HomeHeroTouchFeedback from './HomeHeroTouchFeedback.vue'
import HomeHeroTypewriter from './HomeHeroTypewriter.vue'

const props = defineProps<{ runtimeEnabled: boolean }>()
const { locale, messages } = useLocale()
const home = computed(() => getLocalizedHomeCopy(locale.value))
const greeting = computed(() => home.value.heroGreeting)
const statement = computed(() => home.value.heroStatement)
const { state, animateParticles, isIntroActive, introStartedAt } = useHomeHeroIntro(greeting, statement)
const visual = ref<HTMLElement | null>(null)
</script>

<template>
  <section class="home-hero" :data-intro-state="state" aria-labelledby="home-hero-title">
    <div class="home-hero-grid" aria-hidden="true"></div>

    <div class="home-hero-inner">
      <div class="home-hero-copy">
        <p class="home-hero-kicker">{{ messages.page.home.kicker }}</p>

        <h1 id="home-hero-title" class="home-hero-title sr-only">{{ home.heroGreeting }} {{ home.heroStatement }}</h1>

        <HomeHeroTypewriter
          :greeting="greeting"
          :statement="statement"
          :final-state="!isIntroActive"
          :started-at="introStartedAt"
        />

        <div class="home-hero-actions">
          <a class="hero-action primary" href="#selected-work" v-magnetic="{ strength: 1.5 }">
            <span class="hero-action__visual" data-magnetic-visual>
              <span class="hero-action__label">{{ messages.actions.selectedWork }}</span>
              <span class="hero-action__arrow" aria-hidden="true">↗</span>
            </span>
          </a>
          <a class="hero-action secondary" href="#home-worlds" v-magnetic="{ strength: 1.5 }">
            <span class="hero-action__visual" data-magnetic-visual>
              <span class="hero-action__label">{{ messages.actions.exploreWorlds }}</span>
              <span class="hero-action__arrow" aria-hidden="true">↓</span>
            </span>
          </a>
        </div>
      </div>

      <div ref="visual" class="home-hero-visual">
        <HomeHeroSlideshow
          :container="visual"
          :intro-ready="!isIntroActive"
          :controls-enabled="props.runtimeEnabled"
          :messages="messages.page.home.slideshow"
        />
        <HomeHeroParticles
          :animate-intro="animateParticles"
          :intro-started-at="introStartedAt"
          :runtime-enabled="props.runtimeEnabled"
        />
      </div>
    </div>

    <HomeHeroTouchFeedback />
  </section>
</template>
