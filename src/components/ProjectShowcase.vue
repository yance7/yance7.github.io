<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import type { Project } from '../data/types'

const props = withDefaults(defineProps<{ project: Project; index?: number }>(), { index: 0 })
const projectNo = computed(() => String(props.index + 1).padStart(2, '0'))
const chapterCount = computed(() => String(props.project.story.chapters.length).padStart(2, '0'))
</script>

<template>
  <article
    :id="`project-${project.id}`"
    class="showcase"
    :class="project.tone"
    :data-project="project.id"
    v-reveal
    v-pointer-sheen
  >
    <header class="sc-dossier-head">
      <div class="sc-file-code">
        <span>PROJECT {{ projectNo }}</span>
        <span>{{ project.discipline }}</span>
      </div>
      <div class="sc-head-status">
        <StatusBadge v-if="project.status" :status="project.status" :label="project.statusLabel" />
        <a
          :href="project.href"
          target="_blank"
          rel="noopener"
          :aria-label="`打开 ${project.en} 网站`"
        >{{ project.domain }} <span aria-hidden="true">↗</span></a>
      </div>
    </header>

    <div class="sc-dossier-main">
      <div class="sc-identity">
        <span class="sc-index" aria-hidden="true">{{ projectNo }}</span>
        <div class="sc-identity-copy">
          <p class="sc-overline">{{ project.discipline }}</p>
          <h3>
            <span>{{ project.title }}</span>
            <small class="sc-wordmark">{{ project.en }}</small>
          </h3>
          <p class="sc-value">{{ project.value }}</p>
        </div>
      </div>

      <div class="sc-summary">
        <span class="sc-meta-label">PROJECT NOTE</span>
        <p class="sc-desc">{{ project.description }}</p>
        <div class="sc-actions">
          <a class="btn-primary" :href="project.href" target="_blank" rel="noopener" v-magnetic="{ strength: 3.5 }">
            ENTER PROJECT <span aria-hidden="true">→</span>
          </a>
          <a v-if="project.github" class="btn-ghost" :href="project.github" target="_blank" rel="noopener" v-magnetic="{ strength: 3.5 }">
            SOURCE CODE <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>

    <div class="sc-body">
      <section class="sc-story" :aria-label="`${project.en} project story`">
        <div class="sc-story-head">
          <div class="sc-story-ident">
            <span class="sc-meta-label">PROJECT STORY</span>
            <span class="sc-story-count">{{ chapterCount }} CHAPTERS</span>
          </div>
          <p>{{ project.story.note }}</p>
        </div>

        <div class="sc-chapters">
          <component
            :is="chapter.href ? 'a' : 'div'"
            v-for="chapter in project.story.chapters"
            :key="chapter.label"
            class="sc-chapter"
            :href="chapter.href"
          >
            <span>{{ chapter.label }}</span>
            <strong>{{ chapter.title }}</strong>
            <p>{{ chapter.detail }}</p>
            <small v-if="chapter.href">OPEN RESEARCH <span aria-hidden="true">→</span></small>
          </component>
        </div>

        <div class="sc-sequence">
          <span class="sc-meta-label">{{ project.story.sequenceLabel }}</span>
          <ol>
            <li v-for="(step, stepIndex) in project.story.sequence" :key="step">
              <b>{{ String(stepIndex + 1).padStart(2, '0') }}</b>
              <span>{{ step }}</span>
            </li>
          </ol>
        </div>

        <div class="sc-proof-row">
          <span class="sc-meta-label">PROOF / LINKS</span>
          <div class="sc-proof-links">
            <a
              v-for="proof in project.story.proof"
              :key="proof.label"
              :href="proof.href"
              :target="proof.external ? '_blank' : undefined"
              :rel="proof.external ? 'noopener' : undefined"
            >
              <span>{{ proof.label }}</span>
              <strong>{{ proof.value }}</strong>
              <span aria-hidden="true">{{ proof.external ? '↗' : '→' }}</span>
            </a>
          </div>
        </div>
      </section>

      <div class="sc-meta-row">
        <div class="sc-role">
          <span class="sc-meta-label">ROLE</span>
          <span>{{ project.role }}</span>
        </div>
        <div class="sc-stack">
          <span class="sc-meta-label">STACK</span>
          <div class="sc-tags">
            <span v-for="tech in project.stack" :key="tech" class="sc-tag">{{ tech }}</span>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
