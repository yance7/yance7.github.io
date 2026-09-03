<script setup lang="ts">
import { useLocale } from '../i18n'

interface ArchiveCategory {
  key: 'all' | import('../data/types').HonorLevel
  label: string
}

const props = withDefaults(defineProps<{
  categories: ArchiveCategory[]
  counts?: Partial<Record<ArchiveCategory['key'], number>>
  active?: ArchiveCategory['key']
}>(), {
  counts: () => ({}),
  active: 'all'
})

const emit = defineEmits<{
  filter: [category: ArchiveCategory['key']]
}>()
const { messages } = useLocale()
</script>

<template>
  <div class="honor-filter" role="group" :aria-label="messages.honors.filterLabel">
    <button
      v-for="cat in props.categories"
      :key="cat.key"
      class="filter-btn"
      type="button"
      :class="{ active: props.active === cat.key, [cat.key]: true }"
      :data-honor-filter="cat.key"
      :aria-pressed="props.active === cat.key"
      @click="emit('filter', cat.key)"
    >
      <span class="filter-label">{{ cat.label }}</span>
      <span v-if="props.counts[cat.key]" class="filter-count">{{ props.counts[cat.key] }}</span>
    </button>
  </div>
</template>
