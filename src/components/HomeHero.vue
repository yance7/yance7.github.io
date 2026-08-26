<script setup lang="ts">
import { computed } from 'vue'
import { getLocalizedHomeCopy } from '../data/locales'
import { useLocale } from '../i18n'

const props = defineProps<{
  kicker: string
  copy: string
}>()

const { locale, messages } = useLocale()
const home = computed(() => getLocalizedHomeCopy(locale.value))

</script>

<template>
  <section class="home-hero">
    <div class="home-hero-grid" aria-hidden="true"></div>

    <div class="home-stage">
      <div class="home-stage-meta" v-reveal>
        <div class="home-stage-kicker">
          <span class="home-stage-mark">01 / 06</span>
          <span>{{ props.kicker }}</span>
        </div>
        <span class="home-stage-identity">{{ messages.home.identity }}</span>
      </div>

      <div class="home-stage-body">
        <div class="home-stage-main">
          <div class="home-stage-heading" v-reveal="{ delay: 100 }">
            <span class="home-stage-heading-line"></span>
            <span>{{ messages.page.home.kicker }}</span>
          </div>

          <h1 class="home-stage-title" v-reveal="{ delay: 140 }">
            {{ home.heroTitle }}<br><em>{{ home.heroAccent }}</em>
          </h1>

          <div class="home-stage-copy-block" v-reveal="{ delay: 180 }">
            <p class="home-stage-copy">{{ props.copy }}</p>
            <div class="home-stage-actions">
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
        </div>
      </div>

      <a class="home-stage-scroll" href="#home-worlds" v-reveal="{ delay: 420 }">
        <span class="home-stage-scroll-line" aria-hidden="true"></span>
        <span>{{ messages.actions.scrollToExplore }}</span>
        <span class="home-stage-scroll-arrow" aria-hidden="true">↓</span>
      </a>
    </div>
  </section>
</template>
