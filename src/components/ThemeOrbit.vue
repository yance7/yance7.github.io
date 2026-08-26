<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
import { useLocale } from '../i18n'
const { theme, toggleTheme } = useTheme()
const { messages } = useLocale()

function onToggle() {
  toggleTheme()
}
</script>

<template>
  <button
    class="theme-orbit"
    :class="theme"
    type="button"
    :aria-label="`${theme === 'light' ? messages.theme.switchToDark : messages.theme.switchToLight}: ${theme === 'light' ? messages.theme.light : messages.theme.dark}`"
    :aria-pressed="theme === 'dark'"
    :title="theme === 'light' ? messages.theme.switchToDark : messages.theme.switchToLight"
    @click="onToggle"
  >
    <span class="orbit-track" aria-hidden="true">
      <span class="orbit-knob" :class="{ dark: theme === 'dark' }"></span>
      <span class="orbit-opt sun">☼</span>
      <span class="orbit-opt moon">☾</span>
    </span>
    <span class="orbit-label">{{ theme === 'light' ? messages.theme.light : messages.theme.dark }}</span>
  </button>
</template>
