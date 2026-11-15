<script setup lang="ts">
import { computed } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import { buildLocalizedPageHref, useLocale } from '../i18n'
import { getLocalizedConcerts } from '../data/locales'
import type { PageKey } from '../data/pageRegistry'

const props = defineProps<{ page?: PageKey }>()
const { locale, messages } = useLocale()
const isConcerts = computed(() => props.page === 'concerts')
const concerts = computed(() => isConcerts.value
  ? [...getLocalizedConcerts(locale.value)].sort((left, right) => right.date.localeCompare(left.date))
  : [])
const homeHref = computed(() => buildLocalizedPageHref('home', locale.value))
const researchHref = computed(() => buildLocalizedPageHref('research', locale.value))
</script>

<template>
  <div class="site-shell startup-shell" data-page-load-state="loading">
    <a class="skip-link" href="#main">{{ messages.accessibility.skipToMain }}</a>
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="grain"></div>

    <SiteHeader :page="page" />

    <main id="main" tabindex="-1" class="shell-fallback">
      <template v-if="isConcerts">
        <p class="shell-fallback-kicker">{{ messages.page.concerts.kicker }}</p>
        <h1>{{ messages.page.concerts.title }}</h1>
        <p>{{ messages.page.concerts.copy }}</p>
        <ul class="shell-fallback-list">
          <li v-for="concert in concerts" :key="`${concert.date}-${concert.artist}`">
            <time :datetime="concert.date">{{ concert.date }}</time>
            <strong>{{ concert.artist }} — {{ concert.tour }}</strong>
            <span>{{ concert.venue }}</span>
            <a :href="`/assets/images/concerts/originals/${concert.poster.file}`" target="_blank" rel="noopener noreferrer">{{ messages.poster.original }}</a>
          </li>
        </ul>
      </template>
      <template v-else>
        <p class="shell-fallback-kicker">{{ messages.error404.kicker }}</p>
        <h1>{{ messages.error404.title }}</h1>
        <p>{{ messages.error404.copy }}</p>
        <nav :aria-label="messages.navigation.main">
          <a :href="homeHref">{{ messages.error404.home }}</a>
          <a :href="researchHref">{{ messages.error404.research }}</a>
        </nav>
      </template>
    </main>
  </div>
</template>