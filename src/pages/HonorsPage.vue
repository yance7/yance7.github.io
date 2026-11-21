<script setup lang="ts">
import '../styles/honors.css'
import { ref, computed } from 'vue'
import { getLocalizedHonorCategories, getLocalizedHonorScopeLabels, getLocalizedHonorSections, getLocalizedHonorStats, getLocalizedHonors } from '../data/locales'
import { useLocale } from '../i18n'
import type { HonorFilter } from '../data/types'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
import ArchiveFilter from '../components/ArchiveFilter.vue'
import YanceButton from '../components/YanceButton.vue'

const activeCategory = ref<HonorFilter>('all')
const { locale, messages } = useLocale()
const honors = computed(() => getLocalizedHonors(locale.value))
const categories = computed(() => getLocalizedHonorCategories(locale.value))
const scopeLabel = computed(() => getLocalizedHonorScopeLabels(locale.value))
const honorStats = computed(() => getLocalizedHonorStats(locale.value))
const sections = computed(() => getLocalizedHonorSections(locale.value))

const categoryCounts = computed(() => {
  const counts: Record<HonorFilter, number> = { all: honors.value.length, international: 0, national: 0, regional: 0 }
  for (const honor of honors.value) {
    if (honor.scope !== 'pending') counts[honor.scope] += 1
  }
  return counts
})

const honorsWithCoordinate = computed(() => honors.value.map((honor, index) => ({
  ...honor,
  coordinate: index + 1
})))

const pendingHonors = computed(() => honorsWithCoordinate.value.filter((honor) => honor.scope === 'pending'))

const filteredHonors = computed(() => {
  if (activeCategory.value === 'all') return honorsWithCoordinate.value
  return honorsWithCoordinate.value.filter((h) => h.scope === activeCategory.value)
})

function setCategory(category: HonorFilter) {
  activeCategory.value = category
}

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
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
      <MetricStrip :metrics="honorStats" animate-on-enter />
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
          :class="h.scope"
          :id="`honor-${h.id}`"
          v-pointer-sheen
          v-reveal="{ delay: Math.min(i, 3) * 60 }"
        >
          <span class="honor-coordinate" aria-hidden="true">{{ String(h.coordinate).padStart(2, '0') }}</span>
          <time class="honor-date" :datetime="h.date.replace('.', '-')">{{ h.date }}</time>
          <div class="honor-content">
            <h3>{{ h.title }}</h3>
            <span class="honor-org">{{ h.org }}</span>
            <span v-if="h.evidence" class="honor-evidence">
              {{ h.evidence }}
              <span v-if="h.source" class="honor-source">{{ messages.honors.sourceLabel }}: {{ sourceHost(h.source) }}</span>
            </span>
          </div>
          <span class="honor-level-tag">{{ scopeLabel[h.scope] }}</span>
        </article>
      </TransitionGroup>
      <div v-if="!filteredHonors.length" class="archive-empty" role="status">
        <p>{{ messages.empty.honors }}</p>
        <YanceButton v-if="activeCategory !== 'all'" variant="quiet" @click="setCategory('all')">{{ messages.empty.viewAll }}</YanceButton>
      </div>

      <details v-if="pendingHonors.length" class="honor-pending">
        <summary>{{ sections.pending.label }} · {{ pendingHonors.length }}</summary>
        <p>{{ sections.pending.note }}</p>
        <ul>
          <li v-for="h in pendingHonors" :key="h.id">
            <time :datetime="h.date.replace('.', '-')">{{ h.date }}</time>
            <span>{{ h.title }} · {{ h.org }}</span>
          </li>
        </ul>
      </details>
    </section>
  </div>
</template>
