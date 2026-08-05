<script setup>
import { worlds, stats, research, nowActive } from '../data/content'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
import StatusBadge from '../components/StatusBadge.vue'

const currentResearch = research[0]
</script>

<template>
  <div class="page-home">
    <!-- 第一段：五个小世界 -->
    <section class="content home-worlds">
      <SectionHeading
        no="01"
        label="EXPLORE"
        title="五个"
        accent="小世界"
        copy="缘分让我们相遇乱世以外。把探索、荣誉、研究、作品与音乐分别收进五间屋子。"
      />

      <div class="worlds-list">
        <a
          v-for="(w, i) in worlds"
          :key="w.key"
          class="world-card"
          :class="`accent-${w.accent}`"
          :href="w.href"
          :style="{ '--wi': i }"
          v-reveal="{ delay: i * 80 }"
        >
          <div class="world-left">
            <span class="world-no">{{ w.no }}</span>
            <span class="world-icon" aria-hidden="true">{{ w.icon }}</span>
          </div>
          <div class="world-center">
            <strong>{{ w.label }}</strong>
            <em>{{ w.en }}</em>
            <p>{{ w.desc }}</p>
          </div>
          <span class="world-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>

    <!-- 第二段：当前研究 -->
    <section class="content home-now">
      <SectionHeading
        no="02"
        label="NOW ACTIVE"
        title="正在"
        accent="发生。"
        copy="此刻最重要的工作，是把论文里的模型变成浏览器里能点开的产品。"
      />

      <a
        v-if="currentResearch"
        class="now-active"
        :href="currentResearch.link || '#'"
        :target="currentResearch.link ? '_blank' : undefined"
        :rel="currentResearch.link ? 'noopener' : undefined"
        v-reveal
      >
        <div class="now-status">
          <StatusBadge status="active" label="NOW" />
          <span class="now-time">{{ nowActive.lastUpdate }}</span>
        </div>
        <div class="now-body">
          <strong>{{ currentResearch.title }}</strong>
          <small>{{ currentResearch.date }} · {{ currentResearch.tag }}</small>
        </div>
        <span class="now-tag">{{ currentResearch.tag }}</span>
        <span class="now-arrow" aria-hidden="true">↗</span>
      </a>
    </section>

    <!-- 第三段：数据 -->
    <section class="content home-data">
      <SectionHeading
        no="03"
        label="METRICS"
        title="数字不会说谎，"
        accent="但努力会。"
      />
      <MetricStrip :metrics="stats" />
    </section>
  </div>
</template>
