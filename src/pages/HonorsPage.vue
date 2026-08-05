<script setup>
import { ref, computed } from 'vue'
import { honors, honorCategories, honorStats } from '../data/content'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
import ArchiveFilter from '../components/ArchiveFilter.vue'

const activeCategory = ref('all')
const expanded = ref(null)

const levelLabel = {
  platinum: '国际金牌',
  gold: '国际奖牌',
  silver: '国家级',
  bronze: '区域级'
}

const filteredHonors = computed(() => {
  if (activeCategory.value === 'all') return honors
  return honors.filter((h) => h.level === activeCategory.value)
})

function toggleExpand(i) {
  expanded.value = expanded.value === i ? null : i
}
</script>

<template>
  <div class="page-honors">
    <!-- 01 · 统计条 -->
    <section class="content">
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
    <section class="content">
      <SectionHeading
        no="02"
        label="ARCHIVE"
        title="十三枚"
        accent="坐标。"
        copy="2025 — 2026 赛季的十三项记录，按时间倒序排列，覆盖国际、国家与区域三级。"
      />

      <ArchiveFilter
        :categories="honorCategories"
        :active="activeCategory"
        @filter="activeCategory = $event"
      />

      <div class="honor-timeline">
        <article
          v-for="(h, i) in filteredHonors"
          :key="h.title"
          class="honor-card"
          :class="[h.level, { expanded: expanded === i }]"
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
            <p class="honor-detail">{{ h.detail }}</p>
            <button
              class="honor-expand"
              type="button"
              :aria-expanded="expanded === i"
              @click="toggleExpand(i)"
            >
              {{ expanded === i ? '收起' : '详情' }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
