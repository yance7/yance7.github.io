<script setup>
defineProps({
  categories: { type: Array, required: true },
  active: { type: String, default: 'all' }
})
const emit = defineEmits(['filter'])
</script>

<template>
  <div class="honor-filter" role="tablist" aria-label="荣誉分类筛选">
    <button
      v-for="cat in categories"
      :key="cat.key"
      class="filter-btn"
      :class="{ active: active === cat.key, [cat.key]: true }"
      role="tab"
      :aria-selected="active === cat.key"
      @click="emit('filter', cat.key)"
    >
      {{ cat.label }}
    </button>
  </div>
</template>
