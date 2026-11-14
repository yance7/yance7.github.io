<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useLocale } from '../i18n'
const { theme, toggleTheme } = useTheme()
const { messages } = useLocale()
const buttonRef = ref<HTMLButtonElement | null>(null)

const stateCopy = computed(() => ({
  light: {
    label: messages.value.theme.light,
    aria: `${messages.value.theme.switchToDark}: ${messages.value.theme.light}`,
    title: messages.value.theme.switchToDark
  },
  dark: {
    label: messages.value.theme.dark,
    aria: `${messages.value.theme.switchToLight}: ${messages.value.theme.dark}`,
    title: messages.value.theme.switchToLight
  }
}))
const current = computed(() => stateCopy.value[theme.value])
const themeCopy = computed(() => JSON.stringify(stateCopy.value))

onMounted(() => {
  if (buttonRef.value) buttonRef.value.dataset.vueBound = 'true'
})

function onToggle() {
  toggleTheme()
}
</script>

<template>
  <button
    ref="buttonRef"
    class="theme-orbit"
    :class="theme"
    type="button"
    :aria-label="current.aria"
    :aria-pressed="theme === 'dark'"
    :title="current.title"
    :data-theme-copy="themeCopy"
    @click="onToggle"
  >
    <span class="orbit-track" aria-hidden="true">
      <span class="orbit-knob" :class="{ dark: theme === 'dark' }"></span>
      <span class="orbit-opt sun">☼</span>
      <span class="orbit-opt moon">☾</span>
    </span>
    <span class="orbit-label">{{ current.label }}</span>
  </button>
</template>
