<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../i18n'

const props = withDefaults(defineProps<{
  no: string
  label: string
  title: string
  accent?: string
  copy?: string
  minor?: boolean
}>(), {
  accent: '',
  copy: '',
  minor: false
})

const { locale } = useLocale()
const titleAccentSeparator = computed(() => (
  locale.value === 'en' && props.accent ? ' ' : ''
))
</script>

<template>
  <div class="section-head" :class="{ minor }" v-reveal>
    <span class="section-no">{{ no }}</span>
    <p class="section-label">{{ label }}</p>
    <h2>
      {{ title }}{{ titleAccentSeparator }}
      <span v-if="accent" class="accent">{{ accent }}</span>
    </h2>
    <p class="section-copy" v-if="copy">{{ copy }}</p>
  </div>
</template>
