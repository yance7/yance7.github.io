<script setup>
import { ref, computed } from 'vue'
import { honors, honorCategories } from '../data/content'
import SectionHeading from '../components/SectionHeading.vue'
import ArchiveFilter from '../components/ArchiveFilter.vue'

const activeCategory = ref('all')
const expandedItem = ref(null)

const filteredHonors = computed(() => {
  if (activeCategory.value === 'all') return honors
  return honors.filter((h) => h.category === activeCategory.value)
})

function toggleExpand(key) {
  expandedItem.value = expandedItem.value === key ? null : key
}
</script>

<template>
  <div class="page-honors">
    <section class="content">
      <SectionHeading
        no="01"
        label="MILESTONES"
        title="每一枚奖章，都是"
        accent="向上的证据。"
        copy="奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。"
      />

      <ArchiveFilter
        :categories="honorCategories"
        :active="activeCategory"
        @filter="activeCategory = $event"
      />

      <div class="honor-ledger">
        <article
          v-for="tier in filteredHonors"
          :key="tier.level"
          class="honor-tier"
          :class="tier.color"
          v-reveal
        >
          <div class="tier-rail" aria-hidden="true"></div>
          <div class="tier-head">
            <span class="tier-numeral">{{ tier.level }}</span>
            <div class="tier-id">
              <span class="eyebrow">{{ tier.en }}</span>
              <h3>{{ tier.title }}</h3>
            </div>
          </div>
          <ul class="tier-list">
            <li
              v-for="(item, idx) in tier.items"
              :key="idx"
              :class="{ expanded: expandedItem === `${tier.level}-${idx}` }"
            >
              <button
                class="tier-item-btn"
                type="button"
                :aria-expanded="expandedItem === `${tier.level}-${idx}`"
                @click="toggleExpand(`${tier.level}-${idx}`)"
              >
                <span>{{ item.text }}</span>
                <i aria-hidden="true">↗</i>
              </button>
              <div class="tier-detail" v-if="expandedItem === `${tier.level}-${idx}`">
                <p>{{ item.detail }}</p>
              </div>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>
