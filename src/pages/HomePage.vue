<script setup>
import { ref } from 'vue'
import { worlds, featuredResearch, featuredProjects, leadership, activities } from '../data/content'
import SectionHeading from '../components/SectionHeading.vue'

const expandedActivity = ref(null)
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

    <section class="content home-focus">
      <SectionHeading
        no="02"
        label="SELECTED WORK"
        title="研究如何"
        accent="离开纸面。"
        copy="先看正在被继续推进的研究，再看已经可以打开使用的产品。"
      />
      <div class="home-focus-grid">
        <a
          v-for="(item, i) in featuredResearch"
          :key="item.title"
          class="focus-card focus-research"
          href="research.html"
          v-reveal="{ delay: i * 70 }"
        >
          <span class="focus-label">RESEARCH / 0{{ i + 1 }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.text }}</p>
          <span class="focus-link">阅读研究 <span aria-hidden="true">↗</span></span>
        </a>
        <a
          v-for="(item, i) in featuredProjects"
          :key="item.title"
          class="focus-card focus-product"
          :class="item.tone"
          :href="item.href"
          target="_blank"
          rel="noopener"
          v-reveal="{ delay: (i + featuredResearch.length) * 70 }"
        >
          <span class="focus-label">PRODUCT / 0{{ i + 1 }}</span>
          <strong>{{ item.title }} <small>{{ item.en }}</small></strong>
          <p>{{ item.value }}</p>
          <span class="focus-link">打开产品 <span aria-hidden="true">↗</span></span>
        </a>
      </div>
    </section>

    <!-- 第二段：领导力 -->
    <section class="content home-leadership">
      <SectionHeading
        no="03"
        label="LEADERSHIP"
        title="在集体中"
        accent="生长。"
        copy="四个领导力职位，从副主席到主席、副社长到社长，从执行到组织。"
      />
      <div class="leadership-grid">
        <article
          v-for="(item, i) in leadership"
          :key="item.role + item.org"
          class="leadership-card"
          v-reveal="{ delay: i * 60 }"
        >
          <span class="leadership-role">{{ item.role }}</span>
          <span class="leadership-org">{{ item.org }}</span>
          <span class="leadership-period">{{ item.period }}</span>
          <p class="leadership-note" v-if="item.note">{{ item.note }}</p>
        </article>
      </div>
    </section>

    <!-- 第三段：活动经历 -->
    <section class="content home-activities">
      <SectionHeading
        no="04"
        label="ACTIVITIES"
        title="在行动中"
        accent="学习。"
        copy="五段活动经历，从志愿服务到学术会议，从 AI 伦理到微积分教学。"
      />
      <div class="activity-list">
        <div
          v-for="(item, i) in activities"
          :key="item.title"
          class="activity-row"
          :class="{ expanded: expandedActivity === i }"
          v-reveal="{ delay: i * 60 }"
        >
          <button
            :id="`activity-trigger-${i}`"
            class="activity-btn"
            type="button"
            :aria-expanded="expandedActivity === i"
            :aria-controls="`activity-${i}`"
            @click="expandedActivity = expandedActivity === i ? null : i"
          >
            <span class="activity-period">{{ item.period }}</span>
            <div class="activity-info">
              <strong>{{ item.title }}</strong>
              <small>{{ item.org }}</small>
            </div>
            <span class="activity-arrow" aria-hidden="true">↘</span>
          </button>
          <div
            v-if="expandedActivity === i"
            :id="`activity-${i}`"
            class="activity-detail"
            role="region"
            :aria-labelledby="`activity-trigger-${i}`"
          >
            <p>{{ item.detail }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
