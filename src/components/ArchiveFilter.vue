<script setup>
defineProps({
  categories: { type: Array, required: true },
  counts: { type: Object, default: () => ({}) },
  active: { type: String, default: 'all' }
})
const emit = defineEmits(['filter'])
</script>

<template>
  <div class="honor-filter" aria-label="荣誉分类筛选">
    <button
      v-for="cat in categories"
      :key="cat.key"
      class="filter-btn"
      type="button"
      :class="{ active: active === cat.key, [cat.key]: true }"
      :aria-pressed="active === cat.key"
      @click="emit('filter', cat.key)"
    >
      {{ cat.label }}<span v-if="counts[cat.key]" class="filter-count">{{ counts[cat.key] }}</span>
    </button>
  </div>
</template>
