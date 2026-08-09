<script setup>
import { projects, pageMetadata } from '../data'
import SectionHeading from '../components/SectionHeading.vue'
import ProjectShowcase from '../components/ProjectShowcase.vue'
</script>

<template>
  <div class="page-works">
    <section class="content">
      <SectionHeading
        no="01"
        label="RELEASED WORLDS"
        title="让想法"
        accent="可以被打开。"
        :copy="`${projects.length} 个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。`"
      />
      <p class="content-updated">LAST UPDATED · {{ pageMetadata.works.updatedLabel }}</p>

      <div class="showcase-list">
        <ProjectShowcase v-for="(project, i) in projects" :key="project.id" :project="project" :index="i" />
      </div>
    </section>
  </div>
</template>
