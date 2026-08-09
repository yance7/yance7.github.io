<script setup>
import { stats, education, apScores } from '../data'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'
</script>

<template>
  <div class="page-academics">
    <!-- 00 · 教育履历 -->
    <section class="content">
      <SectionHeading
        no="00"
        label="EDUCATION"
        title="学习轨迹"
        accent="两段经历。"
        copy="记录当前阶段与近年的学习轨迹，保留必要的公开信息。"
      />
      <div class="education-track">
        <article
          v-for="(edu, i) in education"
          :key="edu.name"
          class="education-row"
          v-reveal="{ delay: i * 80 }"
        >
          <span class="education-period">{{ edu.period }}</span>
          <span class="education-name">{{ edu.name }}</span>
          <small class="education-en">{{ edu.en }}</small>
        </article>
      </div>
    </section>

    <!-- 01 · SCOREBOARD -->
    <section class="content">
      <SectionHeading
        no="01"
        label="SCOREBOARD"
        title="数字不会说谎，"
        accent="但努力会。"
        copy="绩点、标化与英语能力测试，是努力留下的可读痕迹。"
      />

      <MetricStrip :metrics="stats" large />
    </section>

    <!-- 02 · AP 档案表 -->
    <section class="content">
      <SectionHeading
        no="02"
        label="AP ARCHIVE"
        title="AP 成绩"
        accent="档案。"
        copy="9 门 AP 全部 5 分，覆盖理科、社科与计算机；Grade 12 三门待出分。"
      />

      <div class="ap-panel" v-reveal>
        <div class="panel-label">AP SCORE / 2024—2026 · 9 门全部 5 分 · 3 门待出分</div>
        <div
          v-for="(row, i) in apScores"
          :key="row.name"
          class="ap-row"
          :class="row.status"
          v-reveal="{ delay: i * 40 }"
        >
          <span class="ap-no">{{ String(i + 1).padStart(2, '0') }}</span>
          <div class="ap-main">
            <strong>{{ row.name }}</strong>
            <small>{{ row.en }} · {{ row.year }}</small>
          </div>
          <span v-if="row.status === 'done'" class="ap-badge">{{ row.score }}</span>
          <span v-else class="ap-badge"></span>
        </div>
      </div>
    </section>
  </div>
</template>
