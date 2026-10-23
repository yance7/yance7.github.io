<script setup lang="ts">
import { computed, ref } from 'vue'
import ConcertArchiveRail from '../../../src/components/ConcertArchiveRail.vue'
import { getLocalizedConcertSection, getLocalizedConcerts } from '../../../src/data/locales'
import { useLocale } from '../../../src/i18n'
import '../../../src/styles/concerts.css'

const { locale } = useLocale()
const count = ref(Number(new URLSearchParams(location.search).get('count') ?? 16))
const concerts = computed(() => getLocalizedConcerts(locale.value).slice(0, count.value))
const section = computed(() => getLocalizedConcertSection(locale.value))
const now = new Date('2026-10-22T12:00:00+08:00')
</script>

<template>
  <main class="site-shell">
    <h1>Concert rail behavior fixture</h1>
    <button type="button" @click="count = 3">Keep three shows</button>
    <ConcertArchiveRail :concerts="concerts" :now="now" :section="section" />
  </main>
</template>
