<script setup lang="ts">
import { useLocale } from '../i18n'

const { messages } = useLocale()

function reloadPage() {
  window.location.reload()
}
</script>

<template>
  <section class="page-load-error" role="alert" aria-live="assertive">
    <span class="page-load-error-kicker">PAGE LOAD ERROR</span>
    <h2>{{ messages.loadError.title }}</h2>
    <p>{{ messages.loadError.copy }}</p>
    <button type="button" @click="reloadPage">{{ messages.loadError.retry }}</button>
  </section>
</template>

<style scoped>
.page-load-error {
  display: grid;
  justify-items: start;
  gap: 14px;
  max-width: 640px;
  margin: clamp(64px, 12vw, 140px) auto;
  padding: clamp(24px, 5vw, 56px);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-2);
}

.page-load-error-kicker {
  color: var(--gold);
  font-family: var(--mono);
  font-size: var(--text-micro);
  letter-spacing: .14em;
}

.page-load-error h2,
.page-load-error p { margin: 0; }

.page-load-error h2 {
  color: var(--ink);
  font-family: var(--serif);
  font-size: clamp(1.7rem, 4vw, 2.8rem);
}

.page-load-error p { color: var(--muted); }

.page-load-error button {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--action-fill);
  border-radius: var(--radius-full);
  color: var(--accent-contrast);
  background: var(--action-fill);
  cursor: pointer;
}
</style>
