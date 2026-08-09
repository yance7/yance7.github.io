<script setup lang="ts">
import { ref, computed } from 'vue'
import { honors, honorCategories, honorStats } from '../data'
import type { HonorLevel } from '../data/types'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
import ArchiveFilter from '../components/ArchiveFilter.vue'
import SectionDots from '../components/SectionDots.vue'

const activeCategory = ref<'all' | HonorLevel>('all')
const expandedId = ref<string | null>(null)

const levelLabel: Record<string, string> = {
  peak: '领航级',
  excellent: '卓越级',
  emerging: '新锐级'
}

const categoryCounts = computed(() => {
  const counts: Record<'all' | HonorLevel, number> = { all: honors.length, peak: 0, excellent: 0, emerging: 0 }
  for (const h of honors) {
    counts[h.level] = (counts[h.level] || 0) + 1
  }
  return counts
})

const filteredHonors = computed(() => {
  if (activeCategory.value === 'all') return honors
  return honors.filter((h) => h.level === activeCategory.value)
})

function setCategory(category: string) {
  activeCategory.value = category as 'all' | HonorLevel
  expandedId.value = null
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<template>
  <div class="page-honors">
    <SectionDots
      :sections="[
        { id: 'sec-milestones', label: 'MILESTONES' },
        { id: 'sec-honors-archive', label: 'ARCHIVE' }
      ]"
    />

    <!-- 01 · 统计条 -->
    <section id="sec-milestones" class="content">
      <SectionHeading
        no="01"
        label="MILESTONES"
        title="每一枚奖章，都是"
        accent="向上的证据。"
        copy="奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。"
      />
      <MetricStrip :metrics="honorStats" />
    </section>

    <!-- 02 · 时间轴奖项卡片 -->
    <section id="sec-honors-archive" class="content">
      <SectionHeading
        no="02"
        label="ARCHIVE"
        :title="`${honors.length} 枚`"
        accent="坐标。"
        copy="按时间倒序排列，分为领航、卓越与新锐三档。"
      />

      <ArchiveFilter
        :categories="honorCategories"
        :counts="categoryCounts"
        :active="activeCategory"
        @filter="setCategory"
      />

      <div class="honor-timeline">
        <article
          v-for="(h, i) in filteredHonors"
          :key="h.id"
          class="honor-card"
          :class="[h.level, { expanded: expandedId === h.id }]"
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
            <p v-if="expandedId === h.id" :id="`honor-detail-${h.id}`" class="honor-detail">{{ h.detail }}</p>
            <button
              class="honor-expand"
              type="button"
              :aria-expanded="expandedId === h.id"
              :aria-controls="`honor-detail-${h.id}`"
              @click="toggleExpand(h.id)"
            >
              <span class="disclosure-mark" aria-hidden="true">{{ expandedId === h.id ? '−' : '+' }}</span>
              {{ expandedId === h.id ? '收起' : '详情' }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
