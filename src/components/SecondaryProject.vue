<script setup lang="ts">
import StatusBadge from './StatusBadge.vue'
import type { Project } from '../data/types'

defineProps<{ project: Project }>()
</script>

<template>
  <article class="secondary-project" :class="project.tone" v-reveal>
    <div class="secondary-project-media" aria-hidden="true">
      <img
        v-for="src in project.previewImages || []"
        :key="src"
        :src="src"
        alt=""
        loading="lazy"
        decoding="async"
      >
    </div>
    <div class="secondary-project-body">
      <div class="sc-top">
        <span class="sc-overline">SECONDARY PROJECT</span>
        <span class="sc-domain">{{ project.domain }}</span>
      </div>
      <h3>{{ project.title }} <small>{{ project.en }}</small></h3>
      <StatusBadge v-if="project.status" :status="project.status" :label="project.statusLabel" />
      <p class="secondary-project-value">{{ project.value }}</p>
      <p class="secondary-project-desc">{{ project.description }}</p>
      <div class="secondary-project-actions">
        <a class="btn-primary" :href="project.href" target="_blank" rel="noopener" v-magnetic>
          ENTER PROJECT <span aria-hidden="true">→</span>
        </a>
        <a v-if="project.github" class="btn-ghost" :href="project.github" target="_blank" rel="noopener" v-magnetic>
          RESEARCH REPO <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  </article>
</template>
