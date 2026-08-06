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
        copy="五个研究项目，按时间倒序堆叠。每一个都包含提问、假设、方法、原型、结果与下一步——点击展开方法论即可看见完整的思考路径。"
      />
    </section>

    <!-- 方法与技术栈 -->
    <section class="content">
      <SectionHeading
        no="02"
        label="TOOLCHAIN"
        title="方法与"
        accent="技术栈。"
        copy="横跨深度学习、可解释 AI、微生物组分析与后端工程的方法栈。"
      />
      <div class="toolchain-panel" v-reveal>
        <div class="toolchain-head">
          <span class="tc-head-label">TOOLCHAIN // {{ researchMethods.length }} MODULES</span>
          <span class="tc-head-status"><i></i> ONLINE</span>
        </div>
        <div class="toolchain-grid">
          <article
            v-for="(m, i) in researchMethods"
            :key="m.label"
            class="toolchain-cell"
            :style="{ '--i': i }"
            v-spotlight
          >
            <span class="tc-no">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="tc-main">
              <strong>{{ m.label }}</strong>
              <small>{{ m.en }}</small>
            </div>
            <span class="tc-cat">{{ m.cat }}</span>
          </article>
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
