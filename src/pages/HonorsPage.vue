<script setup lang="ts">
import '../styles/honors.css'
import { ref, computed } from 'vue'
import { getLocalizedHonorCategories, getLocalizedHonorLevelLabels, getLocalizedHonorSections, getLocalizedHonorStats, getLocalizedHonors } from '../data/locales'
import { useLocale } from '../i18n'
import type { HonorLevel } from '../data/types'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
import ArchiveFilter from '../components/ArchiveFilter.vue'

const activeCategory = ref<'all' | HonorLevel>('all')
const { locale } = useLocale()
const honors = computed(() => getLocalizedHonors(locale.value))
const categories = computed(() => getLocalizedHonorCategories(locale.value))
const levelLabel = computed(() => getLocalizedHonorLevelLabels(locale.value))
const honorStats = computed(() => getLocalizedHonorStats(locale.value))
const sections = computed(() => getLocalizedHonorSections(locale.value))

const categoryCounts = computed(() => {
  const counts: Record<'all' | HonorLevel, number> = { all: honors.value.length, peak: 0, excellent: 0, emerging: 0 }
  for (const honor of honors.value) counts[honor.level] += 1
  return counts
})

const filteredHonors = computed(() => {
  if (activeCategory.value === 'all') return honors.value
  return honors.value.filter((h) => h.level === activeCategory.value)
})

function setCategory(category: 'all' | HonorLevel) {
  activeCategory.value = category
}
</script>

<template>
  <div class="page-honors">
    <section id="sec-milestones" class="content">
      <SectionHeading
        no="01"
        :label="sections.milestones.label"
        :title="sections.milestones.title"
        :accent="sections.milestones.accent"
        :copy="sections.milestones.copy"
      />
      <MetricStrip :metrics="honorStats" />
    </section>

    <section id="sec-honors-archive" class="content">
      <SectionHeading
        no="02"
        :label="sections.archive.label"
        :title="`${honors.length} ${sections.archive.titleSuffix}`"
        :accent="sections.archive.accent"
        :copy="sections.archive.copy"
      />

      <ArchiveFilter
        :categories="categories"
        :counts="categoryCounts"
        :active="activeCategory"
        @filter="setCategory"
      />

      <TransitionGroup name="honor-list" tag="div" class="honor-timeline">
        <article
          v-for="(h, i) in filteredHonors"
          :key="h.id"
          class="honor-card"
          :class="h.level"
          :id="`honor-${h.id}`"
          v-reveal="{ delay: i * 60 }"
        >
          <div class="honor-date-col">
            <span class="honor-date">{{ h.date }}</span>
            <span class="honor-level-dot" aria-hidden="true"></span>
          </div>
          <div class="honor-content">
            <span class="honor-level-tag">{{ levelLabel[h.level] }}</span>
            <h3>{{ h.title }}</h3>
            <span class="honor-org">{{ h.org }}</span>
          </div>
        </article>
      </TransitionGroup>
    </section>
  </div>
</template>
