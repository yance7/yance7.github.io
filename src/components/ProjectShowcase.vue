<script setup lang="ts">
import StatusBadge from './StatusBadge.vue'
import ProjectMark from './ProjectMark.vue'
import type { Project } from '../data/types'

withDefaults(defineProps<{ project: Project; index?: number }>(), { index: 0 })
</script>

<template>
  <article
    :id="`project-${project.id}`"
    class="showcase"
    :class="project.tone"
    v-reveal
  >
    <div class="sc-visual-panel">
      <div class="sc-visual-bar">
        <span>PROJECT 0{{ index + 1 }}</span>
        <span>{{ project.domain }}</span>
      </div>
      <ProjectMark :icon="project.icon" />
      <div class="sc-visual-caption">
        <span>{{ project.icon === 'eye' ? 'AI / FRESHNESS' : 'MUSIC / MEMORY' }}</span>
        <small>MOVE TO EXPLORE</small>
      </div>
    </div>

    <div class="sc-content">
      <div class="sc-top">
        <span class="sc-overline">PROJECT 0{{ index + 1 }}</span>
        <span class="sc-domain">{{ project.domain }}</span>
      </div>

      <h3>{{ project.title }} <small>{{ project.en }}</small></h3>

      <StatusBadge v-if="project.status" :status="project.status" :label="project.statusLabel" />

      <p class="sc-value">{{ project.value }}</p>
      <p class="sc-desc">{{ project.description }}</p>

      <div v-if="project.caseStudy" class="sc-case-study">
        <div class="sc-case-block">
          <span class="sc-meta-label">PROBLEM</span>
          <p>{{ project.caseStudy.problem }}</p>
        </div>
        <div class="sc-case-block">
          <span class="sc-meta-label">RESEARCH FOUNDATION</span>
          <a class="sc-research-link" :href="project.caseStudy.research.href">
            <strong>{{ project.caseStudy.research.title }}</strong>
            <span>{{ project.caseStudy.research.detail }} →</span>
          </a>
        </div>
        <div class="sc-case-block">
          <span class="sc-meta-label">PRODUCT FLOW</span>
          <div class="sc-flow">
            <span v-for="(step, stepIndex) in project.caseStudy.product" :key="step">
              {{ step }}<b v-if="stepIndex < project.caseStudy.product.length - 1" aria-hidden="true">→</b>
            </span>
          </div>
        </div>
        <div class="sc-case-block">
          <span class="sc-meta-label">ENGINEERING</span>
          <div class="sc-tags">
            <span v-for="tech in project.caseStudy.engineering" :key="tech" class="sc-tag">{{ tech }}</span>
          </div>
        </div>
        <div class="sc-case-proof">
          <span class="sc-meta-label">PROOF</span>
          <div class="sc-proof-links">
            <a
              v-for="proof in project.caseStudy.proof"
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
      </div>

      <div class="sc-meta">
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

      <div class="sc-actions">
        <a class="btn-primary" :href="project.href" target="_blank" rel="noopener" v-magnetic>
          ENTER PROJECT <span aria-hidden="true">↗</span>
        </a>
        <a v-if="project.github" class="btn-ghost" :href="project.github" target="_blank" rel="noopener" v-magnetic>
          RESEARCH REPO <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  </article>
</template>
