<script setup>
import { stats, academicTimeline, apScores } from '../data/content'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
</script>

<template>
  <div class="page-academics">
    <section class="content">
      <SectionHeading
        no="01"
        label="SCOREBOARD"
        title="数字不会说谎，"
        accent="但努力会。"
        copy="绩点、标化与 AP 成绩，是努力留下的可读痕迹。"
      />

      <MetricStrip :metrics="stats" large />
    </section>

    <!-- 学习轨迹 -->
    <section class="content">
      <SectionHeading
        no="02"
        label="TIMELINE"
        title="学习"
        accent="轨迹。"
        copy="从基础课程到研究导向，三年三步。"
      />

      <div class="academic-track">
        <div class="track-rail" aria-hidden="true"></div>
        <article
          v-for="(phase, i) in academicTimeline"
          :key="phase.year"
          class="track-item"
          v-reveal="{ delay: i * 100 }"
        >
          <div class="track-year">
            <span class="track-yr">{{ phase.year }}</span>
            <span class="track-node" aria-hidden="true"><i></i></span>
          </div>
          <div class="track-body">
            <span class="track-phase">{{ phase.phase }}</span>
            <small class="track-en">{{ phase.en }}</small>
            <ul class="track-list">
              <li v-for="item in phase.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </article>
      </div>
    </section>

    <!-- AP 档案表 -->
    <section class="content">
      <SectionHeading
        no="03"
        label="AP ARCHIVE"
        title="AP 成绩"
        accent="档案。"
        copy="9 门 AP 全部 5 分，覆盖理科、社科与计算机。"
      />

      <div class="ap-panel" v-reveal>
        <div class="panel-label">AP SCORE / 2024—2026 · 9 门全部 5 分</div>
        <div
          v-for="(row, i) in apScores"
          :key="row.name"
          class="ap-row"
          v-reveal="{ delay: i * 40 }"
        >
          <span class="ap-no">0{{ i + 1 }}</span>
          <div class="ap-main">
            <strong>{{ row.name }}</strong>
            <small>{{ row.en }} · {{ row.year }}</small>
          </div>
          <span class="ap-badge">{{ row.score }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
