<script setup lang="ts">
import '../styles/academics.css'
import { computed } from 'vue'
import { getLocalizedAcademics } from '../data/locales'
import { useLocale } from '../i18n'
import SectionHeading from '../components/SectionHeading.vue'
import MetricStrip from '../components/MetricStrip.vue'

const { locale } = useLocale()
const academics = computed(() => getLocalizedAcademics(locale.value))
</script>

<template>
  <div class="page-academics">
    <section id="sec-education" class="content">
      <SectionHeading
        no="00"
        :label="academics.sections.education.label"
        :title="academics.sections.education.title"
        :accent="academics.sections.education.accent"
        :copy="academics.sections.education.copy"
      />
      <div class="education-track">
        <article
          v-for="(edu, i) in academics.education"
          :key="edu.name"
          class="education-row"
          v-reveal="{ delay: i * 80 }"
        >
          <span class="education-period">{{ edu.period }}</span>
          <span class="education-name">{{ edu.name }}</span>
        </article>
      </div>
    </section>

    <section id="sec-scoreboard" class="content">
      <SectionHeading
        no="01"
        :label="academics.sections.scoreboard.label"
        :title="academics.sections.scoreboard.title"
        :accent="academics.sections.scoreboard.accent"
        :copy="academics.sections.scoreboard.copy"
      />

      <MetricStrip :metrics="academics.stats" large />
    </section>

    <section id="sec-ap-archive" class="content">
      <SectionHeading
        no="02"
        :label="academics.sections.apArchive.label"
        :title="academics.sections.apArchive.title"
        :accent="academics.sections.apArchive.accent"
        :copy="academics.sections.apArchive.copy"
      />

      <div class="ap-panel" v-reveal>
        <div class="panel-label">{{ academics.sections.apArchive.panelLabel }}</div>
        <div
          v-for="(row, i) in academics.apScores"
          :key="row.name"
          class="ap-row"
          :class="row.status"
          v-reveal="{ delay: i * 40 }"
        >
          <span class="ap-no">{{ String(i + 1).padStart(2, '0') }}</span>
          <div class="ap-main">
            <strong>{{ row.name }}</strong>
            <small>{{ row.year }}</small>
          </div>
          <span v-if="row.status === 'done'" class="ap-badge">{{ row.score }}</span>
          <span v-else class="ap-badge"></span>
        </div>
      </div>
    </section>
  </div>
</template>
