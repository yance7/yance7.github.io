<script setup>
import { computed } from 'vue'
import { worlds, featuredResearch, featuredProjects, leadership, activities } from '../data'
import SectionHeading from '../components/SectionHeading.vue'

const selectedActivities = computed(() => [activities[2], activities[0], activities[4]])
</script>

<template>
  <div class="page-home">
    <!-- 第一段：精选研究与产品 -->
    <section class="content home-focus">
      <SectionHeading
        no="01"
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
          :href="`research.html#${item.id}`"
          v-reveal="{ delay: i * 70 }"
        >
          <span class="focus-label">RESEARCH / 0{{ i + 1 }}</span>
          <strong>{{ item.title }}</strong>
          <p class="focus-proof">{{ item.metrics[0].value }} {{ item.metrics[0].label }} · {{ item.metrics[1].value }} {{ item.metrics[1].label }}</p>
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
          <p class="focus-proof">{{ item.caseStudy ? 'RESEARCH → PRODUCT' : item.domain }}</p>
          <p>{{ item.value }}</p>
          <span class="focus-link">打开产品 <span aria-hidden="true">↗</span></span>
        </a>
      </div>
    </section>

    <!-- 第二段：五个小世界 -->
    <section class="content home-worlds">
      <SectionHeading
        no="02"
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

    <!-- 第三段：在实验室之外的组织与行动 -->
    <section class="content home-beyond">
      <SectionHeading
        no="03"
        label="BEYOND THE LAB"
        title="在集体中"
        accent="继续生长。"
        copy="精选领导力与活动经历，保留那些最能说明组织、协作与行动力的片段。"
      />
      <div class="home-beyond-grid">
        <div class="beyond-column" v-reveal>
          <span class="beyond-label">LEADERSHIP</span>
          <div class="beyond-leadership-list">
            <article v-for="item in leadership" :key="item.role + item.org" class="beyond-leadership">
              <strong>{{ item.role }}</strong>
              <span>{{ item.org }}</span>
              <small>{{ item.period }}</small>
            </article>
          </div>
        </div>
        <div class="beyond-column" v-reveal="{ delay: 80 }">
          <span class="beyond-label">SELECTED ACTIVITIES</span>
          <div class="beyond-activity-list">
            <article v-for="item in selectedActivities" :key="item.title" class="beyond-activity">
              <time>{{ item.period }}</time>
              <div>
                <strong>{{ item.title }}</strong>
                <small>{{ item.org }}</small>
              </div>
            </article>
          </div>
        </div>
      </div>
      <div class="beyond-links">
        <a href="academics.html">EXPLORE ACADEMICS <span aria-hidden="true">↗</span></a>
        <a href="honors.html">VIEW HONORS <span aria-hidden="true">↗</span></a>
      </div>
    </section>
  </div>
</template>
