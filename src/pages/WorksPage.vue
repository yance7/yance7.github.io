<script setup lang="ts">
import '../styles/works.css'
import { computed } from 'vue'
import { getLocalizedProjectSection, getLocalizedProjects } from '../data/locales'
import { useLocale } from '../i18n'
import SectionHeading from '../components/SectionHeading.vue'
import ProjectShowcase from '../components/ProjectShowcase.vue'

const { locale, messages } = useLocale()
const projects = computed(() => getLocalizedProjects(locale.value))
const section = computed(() => getLocalizedProjectSection(locale.value))
const worksCopy = computed(() => !projects.value.length ? '' : projects.value.length === 1
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

      <div v-if="projects.length" class="showcase-list">
        <ProjectShowcase v-for="(project, i) in projects" :key="project.id" :project="project" :index="i" />
      </div>
      <p v-else class="archive-empty" role="status">{{ messages.empty.works }}</p>
    </section>
  </div>
</template>
