<script setup lang="ts">
import { computed } from 'vue'
import { buildLocalizedPageHref, localeRegistry, resolvePageFromPath, type Locale, useLocale } from '../i18n'
import { rememberLocale } from '../i18n/useLocale'

const { locale, messages } = useLocale()
const options = Object.values(localeRegistry)
const currentPage = computed(() => resolvePageFromPath(window.location.pathname))

function hrefFor(target: Locale) {
  const page = currentPage.value ?? 'home'
  return buildLocalizedPageHref(page, target, {
    search: currentPage.value ? window.location.search : '',
    hash: currentPage.value ? window.location.hash : ''
  })
}

function labelFor(target: Locale) {
  if (target === 'zh-CN') return messages.value.locale.zhCN
  if (target === 'zh-HK') return messages.value.locale.zhHK
  return messages.value.locale.en
}

function ariaLabelFor(target: Locale, visibleLabel = labelFor(target)) {
  if (target === locale.value) return `${messages.value.common.current}: ${visibleLabel}`
  if (target === 'zh-CN') return `${messages.value.locale.switchToZhCN}: ${visibleLabel}`
  if (target === 'zh-HK') return `${messages.value.locale.switchToZhHK}: ${visibleLabel}`
  return `${messages.value.locale.switchToEnglish}: ${visibleLabel}`
}

function choose(target: Locale) {
  rememberLocale(target)
}
</script>

<template>
  <div class="locale-switcher">
    <nav class="locale-switcher-desktop" :aria-label="messages.locale.selector">
      <a
        v-for="option in options"
        :key="option.code"
        :href="hrefFor(option.code)"
        :hreflang="option.htmlLang"
        :aria-current="locale === option.code ? 'page' : undefined"
        :aria-label="ariaLabelFor(option.code)"
        @click="choose(option.code)"
      >{{ labelFor(option.code) }}</a>
    </nav>

    <details class="locale-switcher-mobile">
      <summary :aria-label="`${messages.locale.selector}: ${localeRegistry[locale].shortLabel} / ${locale === 'en' ? messages.locale.zhCN : messages.locale.en}`">
        <span>{{ localeRegistry[locale].shortLabel }}</span>
        <span aria-hidden="true">/</span>
        <span>{{ locale === 'en' ? messages.locale.zhCN : messages.locale.en }}</span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <nav :aria-label="messages.locale.selector">
        <a
          v-for="option in options"
          :key="option.code"
          :href="hrefFor(option.code)"
          :hreflang="option.htmlLang"
          :aria-current="locale === option.code ? 'page' : undefined"
          :aria-label="ariaLabelFor(option.code, option.nativeName)"
          @click="choose(option.code)"
        >{{ option.nativeName }}</a>
      </nav>
    </details>
  </div>
</template>
