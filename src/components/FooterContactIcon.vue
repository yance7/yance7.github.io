<script setup lang="ts">
import type { FooterContactKey } from '../data/footerContacts'

defineProps<{ name: FooterContactKey }>()
</script>

<template>
  <svg
    class="footer-contact-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'email'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </template>
    <template v-else-if="name === 'github'">
      <path fill="currentColor" stroke="none" d="M12 2.6a9.4 9.4 0 0 0-2.97 18.32c.47.09.64-.2.64-.45v-1.7c-2.61.57-3.16-1.1-3.16-1.1-.43-1.08-1.05-1.37-1.05-1.37-.85-.58.06-.57.06-.57.94.07 1.43.97 1.43.97.84 1.43 2.2 1.02 2.73.78.08-.61.33-1.02.6-1.25-2.09-.24-4.29-1.05-4.29-4.66 0-1.03.37-1.87.97-2.53-.1-.24-.42-1.2.09-2.5 0 0 .79-.25 2.59.97A8.98 8.98 0 0 1 12 7.2c.8 0 1.6.11 2.35.32 1.8-1.22 2.59-.97 2.59-.97.51 1.3.19 2.26.09 2.5.6.66.97 1.5.97 2.53 0 3.62-2.2 4.42-4.3 4.65.34.3.64.88.64 1.77v2.62c0 .25.17.54.65.45A9.4 9.4 0 0 0 12 2.6Z" />
    </template>
    <template v-else-if="name === 'instagram'">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none" />
    </template>
    <template v-else>
      <path d="M5 4.5 19 19.5" />
      <path d="M19 4.5 5 19.5" />
      <path d="M4 4h4.3l11.7 16h-4.3L4 4Z" />
    </template>
  </svg>
</template>
