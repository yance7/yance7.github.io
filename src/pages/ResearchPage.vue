<script setup>
import { research, researchMethods } from '../data/content'
import SectionHeading from '../components/SectionHeading.vue'
import TimelineTrack from '../components/TimelineTrack.vue'
</script>

<template>
  <div class="page-research">
    <section class="content">
      <SectionHeading
        no="01"
        label="LAB NOTES"
        title="把论文"
        accent="写成产品。"
        copy="从智慧农业到可解释 AI，每一个研究项目都包含完整的提问、假设、方法、原型、结果与下一步。"
      />
    </section>

    <!-- 方法与技术栈 -->
    <section class="content">
      <SectionHeading
        no="02"
        label="TOOLCHAIN"
        title="方法与"
        accent="技术栈。"
      />
      <div class="methods-grid">
        <div
          v-for="(m, i) in researchMethods"
          :key="m.label"
          class="method-chip"
          v-reveal="{ delay: i * 50 }"
        >
          <strong>{{ m.label }}</strong>
          <small>{{ m.en }}</small>
        </div>
      </div>
    </section>

    <!-- 研究时间轴 -->
    <section class="content">
      <SectionHeading
        no="03"
        label="TIMELINE"
        title="研究"
        accent="时间轴。"
      />
      <TimelineTrack :items="research" />
    </section>
  </div>
</template>
