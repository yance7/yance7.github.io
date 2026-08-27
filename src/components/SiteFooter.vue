<script setup lang="ts">
import { buildLocalizedPageHref, useLocale } from '../i18n'
import BrandMark from './BrandMark.vue'

const { locale, messages } = useLocale()
</script>

<template>
  <footer class="site-footer">
    <div class="foot-brand">
      <a class="foot-mark" :href="buildLocalizedPageHref('home', locale)" :aria-label="`${messages.accessibility.footerHome}: Yance. ${messages.footer.archive}`">
        <BrandMark variant="footer" />
        <span class="foot-mark-copy">
          <strong>Yance.</strong>
          <small>{{ messages.footer.archive }}</small>
        </span>
      </a>
      <span class="foot-tag">{{ messages.footer.identity }}</span>
    </div>
    <div class="foot-links">
      <a href="https://github.com/yance7" target="_blank" rel="noopener noreferrer">{{ messages.footer.profile }} ↗</a>
      <a href="https://github.com/yance7" target="_blank" rel="noopener noreferrer">{{ messages.footer.researchRepos }} ↗</a>
      <a href="mailto:yance777@outlook.com">{{ messages.footer.contact }} ↗</a>
    </div>
  </footer>
</template>
