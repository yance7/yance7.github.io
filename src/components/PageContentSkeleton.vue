<script setup lang="ts">
import { useLocale } from '../i18n'
const { messages } = useLocale()
</script>

<template>
  <section class="content page-content-skeleton" role="status" aria-live="polite" aria-busy="true">
    <span class="sr-only">{{ messages.loadError.loading }}</span>
    <div class="skeleton-surface" aria-hidden="true"><i></i><i></i><i></i></div>
  </section>
</template>

<style scoped>
.page-content-skeleton { padding-block: 32px; }
.skeleton-surface { display: grid; gap: 16px; max-width: 720px; padding: 28px; border: 1px solid var(--line); border-radius: var(--radius-large); background: var(--surface); }
.skeleton-surface i { display: block; height: 12px; border-radius: var(--radius-small); background: linear-gradient(100deg, var(--line-strong), var(--line)); }
.skeleton-surface i:nth-child(1) { width: 46%; height: 20px; }
.skeleton-surface i:nth-child(2) { width: 90%; }
.skeleton-surface i:nth-child(3) { width: 72%; }
</style>
