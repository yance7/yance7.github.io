<script setup>
import { projects, pageMetadata } from '../data'
import SectionHeading from '../components/SectionHeading.vue'
import ProjectShowcase from '../components/ProjectShowcase.vue'
import SecondaryProject from '../components/SecondaryProject.vue'

const featuredProject = projects.find((project) => project.id === 'fresheye')
const secondaryProjects = projects.filter((project) => project.id !== 'fresheye')
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
        <ProjectShowcase v-if="featuredProject" :project="featuredProject" :index="0" />
        <SecondaryProject v-for="project in secondaryProjects" :key="project.id" :project="project" />
      </div>
    </section>
  </div>
</template>
