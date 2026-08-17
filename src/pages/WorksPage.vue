<script setup lang="ts">
import { computed } from 'vue'
import { projects } from '../data'
import SectionHeading from '../components/SectionHeading.vue'
import ProjectShowcase from '../components/ProjectShowcase.vue'

const worksCopy = computed(() => projects.length === 1
  ? '一个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。'
  : `${projects.length} 个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。`)
</script>

<template>
  <div class="page-works">
    <section id="works-overview" class="content">
      <SectionHeading
        no="01"
        label="RELEASED WORLDS"
        title="让想法"
        accent="可以被打开"
        :copy="worksCopy"
      />

      <div class="showcase-list">
        <ProjectShowcase v-for="(project, i) in projects" :key="project.id" :project="project" :index="i" />
      </div>
    </section>
  </div>
</template>
