<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '../composables/useTheme'
const { theme, toggleTheme } = useTheme()
const btn = ref<HTMLButtonElement | null>(null)

function onToggle() {
  toggleTheme(btn.value)
}
</script>

<template>
  <button
    ref="btn"
    class="theme-orbit"
    :class="theme"
    type="button"
    :aria-label="theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'"
    :aria-pressed="theme === 'dark'"
    title="切换主题"
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
