<script setup lang="ts">
import { buildLocalizedPageHref, useLocale } from '../i18n'

const { locale, messages } = useLocale()
</script>

<template>
  <footer class="site-footer">
    <div class="foot-brand">
      <a class="foot-mark" :href="buildLocalizedPageHref('home', locale)" :aria-label="messages.accessibility.footerHome">
        <strong>Yance<span>.</span></strong>
        <small>{{ messages.footer.archive }}</small>
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
