<script setup>
import { research, researchMethods, pageMetadata } from '../data'
import SectionHeading from '../components/SectionHeading.vue'
import TimelineTrack from '../components/TimelineTrack.vue'
import SectionDots from '../components/SectionDots.vue'
</script>

<template>
  <div class="page-research">
    <SectionDots
      :sections="[
        { id: 'sec-research-timeline', label: 'RESEARCH' },
        { id: 'sec-toolchain', label: 'METHODS' }
      ]"
    />

    <!-- 研究结果优先于工具清单，让第一次进入页面的人先看到成果。 -->
    <section id="sec-research-timeline" class="content">
      <SectionHeading
        no="01"
        label="RESEARCH"
        title="研究"
        accent="时间轴。"
        :copy="`${research.length} 个研究项目，按时间倒序呈现结果、论文、代码与产品证据。点击展开方法论，可继续阅读完整的思考路径。`"
      />
      <p class="content-updated">LAST UPDATED · {{ pageMetadata.research.updatedLabel }}</p>
      <TimelineTrack :items="research" />
    </section>

    <!-- 方法与技术栈 -->
    <section id="sec-toolchain" class="content">
      <SectionHeading
        no="02"
        label="METHODS"
        title="方法与"
        accent="技术栈。"
        minor
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
  </div>
</template>
