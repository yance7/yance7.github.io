<script setup lang="ts">
import '../styles/works.css'
import { computed } from 'vue'
import { getLocalizedProjectSection, getLocalizedProjects } from '../data/locales'
import { useLocale } from '../i18n'
import SectionHeading from '../components/SectionHeading.vue'
import ProjectShowcase from '../components/ProjectShowcase.vue'

const { locale } = useLocale()
const projects = computed(() => getLocalizedProjects(locale.value))
const section = computed(() => getLocalizedProjectSection(locale.value))
const worksCopy = computed(() => projects.value.length === 1
  ? section.value.copySingular
  : `${projects.value.length} ${section.value.copyPlural}`)
</script>

<template>
  <div class="page-works">
    <section id="works-overview" class="content">
      <SectionHeading
        no="01"
        :label="section.label"
        :title="section.title"
        :accent="section.accent"
        :copy="worksCopy"
      />

      <div class="showcase-list">
        <ProjectShowcase v-for="(project, i) in projects" :key="project.id" :project="project" :index="i" />
      </div>
    </section>
  </div>
</template>
