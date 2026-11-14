<script setup lang="ts">
import SiteHeader from '../components/SiteHeader.vue'
import { useLocale } from '../i18n'
import type { PageKey } from '../data/pageRegistry'

defineProps<{ page?: PageKey }>()
const { messages } = useLocale()
</script>

<template>
  <div class="site-shell startup-shell" data-page-load-state="loading">
    <a class="skip-link" href="#main">{{ messages.accessibility.skipToMain }}</a>
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="grain"></div>

    <SiteHeader :page="page" />
  </div>
</template>