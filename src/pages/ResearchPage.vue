<script setup>
import { research, researchMethodGroups, researchMethods } from '../data'
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

    <section id="sec-research-timeline" class="content">
      <SectionHeading
        no="01"
        label="RESEARCH"
        title="研究"
        accent="时间轴。"
        :copy="`${research.length} 个研究项目，按时间倒序呈现结果、论文、代码与产品证据。点击展开方法论，可以继续阅读完整的思考路径。`"
      />
      <TimelineTrack :items="research" />
    </section>

    <section id="sec-toolchain" class="content">
      <SectionHeading
        no="02"
        label="METHODS / WORKBENCH"
        title="方法与"
        accent="技术栈。"
        copy="我把研究拆成一条可复用的工作链：先定义问题，再用模型验证，最后把结果交付为可以打开的工具。"
      />
      <div class="toolchain-panel" v-reveal>
        <div class="toolchain-intro">
          <div>
            <span class="tc-kicker">THE WORKBENCH</span>
            <h3>从问题到可用结果</h3>
            <p>模型、工程和实验不是三张清单，而是一条会反复回到问题本身的工作链。</p>
          </div>
          <div class="tc-count" aria-label="技术栈数量">
            <strong>{{ researchMethods.length }}</strong>
            <span>TOOLS IN ROTATION</span>
          </div>
        </div>

        <div class="toolchain-flow" aria-label="研究工作链">
          <span><b>01</b> QUESTION</span>
          <i aria-hidden="true"></i>
          <span><b>02</b> MODEL</span>
          <i aria-hidden="true"></i>
          <span><b>03</b> SHIP</span>
        </div>

        <div class="toolchain-groups">
          <section v-for="(group, i) in researchMethodGroups" :key="group.id" class="toolchain-group">
            <div class="tc-group-head">
              <span class="tc-group-no">0{{ i + 1 }}</span>
              <div>
                <strong>{{ group.label }}</strong>
                <small>{{ group.en }}</small>
              </div>
              <span class="tc-group-count">{{ group.items.length }} TOOLS</span>
            </div>
            <p>{{ group.description }}</p>
            <div class="tc-tools">
              <span v-for="tool in group.items" :key="tool.label" class="tc-tool">
                <strong>{{ tool.label }}</strong>
                <small>{{ tool.en }}</small>
              </span>
            </div>
          </section>
        </div>

        <div class="toolchain-foot">
          <span><i></i> RESEARCH LOOP ACTIVE</span>
          <span>QUESTION → EVIDENCE → PRODUCT</span>
        </div>
      </div>
    </section>
  </div>
</template>
