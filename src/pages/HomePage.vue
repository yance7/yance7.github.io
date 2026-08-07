<script setup>
import { ref } from 'vue'
import { worlds, leadership, activities } from '../data/content'
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

    <!-- 第二段：领导力 -->
    <section class="content home-leadership">
      <SectionHeading
        no="02"
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
        no="03"
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
            class="activity-btn"
            type="button"
            :aria-expanded="expandedActivity === i"
            @click="expandedActivity = expandedActivity === i ? null : i"
          >
            <span class="activity-period">{{ item.period }}</span>
            <div class="activity-info">
              <strong>{{ item.title }}</strong>
              <small>{{ item.org }}</small>
            </div>
            <span class="activity-arrow" aria-hidden="true">↘</span>
          </button>
          <div class="activity-detail" v-if="expandedActivity === i">
            <p>{{ item.detail }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
