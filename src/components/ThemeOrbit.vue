<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
const { theme, toggleTheme } = useTheme()

function onToggle() {
  toggleTheme()
}
</script>

<template>
  <button
    class="theme-orbit"
    :class="theme"
    type="button"
    :aria-label="theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'"
    :aria-pressed="theme === 'dark'"
    :title="theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'"
    @click="onToggle"
  >
    <span class="orbit-track" aria-hidden="true">
      <span class="orbit-knob" :class="{ dark: theme === 'dark' }"></span>
      <span class="orbit-opt sun">☼</span>
      <span class="orbit-opt moon">☾</span>
    </span>
    <span class="orbit-label">{{ theme === 'light' ? '亮色' : '暗色' }}</span>
  </button>
</template>
