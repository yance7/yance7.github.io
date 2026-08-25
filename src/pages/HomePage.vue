<script setup lang="ts">
import '../styles/home.css'
import { computed } from 'vue'
import { getLocalizedCommunity, getLocalizedHomeCopy, getLocalizedProjects, getLocalizedResearch, getLocalizedWorlds } from '../data/locales'
import { buildLocalizedPageHref, useLocale } from '../i18n'
import SectionHeading from '../components/SectionHeading.vue'

const { locale, messages } = useLocale()
const homeCopy = computed(() => getLocalizedHomeCopy(locale.value))
const worlds = computed(() => getLocalizedWorlds(locale.value))
const localizedResearch = computed(() => getLocalizedResearch(locale.value))
const featuredResearch = computed(() => localizedResearch.value
  .filter((item) => item.id === 'fishfreshnet-v2' && item.metrics && item.metrics.length >= 2)
  .map((item) => {
    const metrics = item.metrics!
    return { ...item, summaryMetrics: [metrics[0]!, metrics[1]!] as const }
  }))
const featuredProjects = computed(() => getLocalizedProjects(locale.value).filter((item) => item.id === 'fresheye'))
const community = computed(() => getLocalizedCommunity(locale.value))
const leadership = computed(() => community.value.leadership)
const selectedActivities = computed(() => community.value.activities.filter((item) => item.featured))
</script>

<template>
  <div class="page-home">
    <!-- 第一段：精选研究与产品 -->
    <section id="selected-work" class="content home-focus">
      <SectionHeading
        no="01"
        :label="messages.home.selectedWorkLabel"
        :title="homeCopy.selectedTitle"
        :accent="homeCopy.selectedAccent"
        :copy="homeCopy.selectedCopy"
      />
      <div class="home-focus-grid">
        <a
          v-for="(item, i) in featuredResearch"
          :key="item.id"
          class="focus-card focus-research"
          :href="buildLocalizedPageHref('research', locale, { hash: `#${item.id}` })"
          v-reveal="{ delay: i * 70 }"
          v-pointer-sheen
        >
          <span class="focus-label">{{ messages.home.researchLabel }} / 0{{ i + 1 }}</span>
          <strong>{{ item.title }}</strong>
          <p class="focus-proof">{{ item.summaryMetrics[0].value }} {{ item.summaryMetrics[0].label }} · {{ item.summaryMetrics[1].value }} {{ item.summaryMetrics[1].label }}</p>
          <p>{{ item.text }}</p>
          <span class="focus-link">{{ messages.actions.readResearch }} <span aria-hidden="true">→</span></span>
        </a>

        <div v-if="featuredResearch.length && featuredProjects.length" class="home-focus-connector" aria-hidden="true">
          <span>{{ messages.home.researchToProduct }}</span>
          <i></i>
        </div>

        <article
          v-for="(item, i) in featuredProjects"
          :key="item.id"
          class="focus-card focus-product"
          :class="item.tone"
          v-reveal="{ delay: (i + featuredResearch.length) * 70 }"
          v-pointer-sheen
        >
          <a class="focus-card-main" :href="buildLocalizedPageHref('works', locale, { hash: `#project-${item.id}` })">
            <span class="focus-label">{{ messages.home.productLabel }} / 0{{ i + 1 }}</span>
            <strong>{{ item.title }} <small>{{ item.en }}</small></strong>
            <p class="focus-proof">{{ item.story.label }}</p>
            <p>{{ item.value }}</p>
            <span class="focus-link">{{ messages.actions.viewCaseStudy }} <span aria-hidden="true">→</span></span>
          </a>
            <a class="focus-live-link" :href="item.href" target="_blank" rel="noopener noreferrer">
            {{ messages.common.liveProduct }} <span aria-hidden="true">↗</span>
          </a>
        </article>
      </div>
    </section>

    <!-- 第二段：五个小世界 -->
    <section id="home-worlds" class="content home-worlds">
      <SectionHeading
        no="02"
        :label="messages.home.exploreLabel"
        :title="homeCopy.worldsTitle"
        :accent="homeCopy.worldsAccent"
        :copy="homeCopy.worldsCopy"
      />

      <div class="worlds-list">
        <a
          v-for="(w, i) in worlds"
          :key="w.key"
          class="world-card"
          :class="`accent-${w.accent}`"
          :href="w.href"
          :style="{ '--wi': i }"
          v-reveal="{ delay: i * 80 }"
        >
          <div class="world-left">
            <span class="world-no">{{ w.no }}</span>
            <span class="world-icon" aria-hidden="true">{{ w.icon }}</span>
          </div>
          <div class="world-center">
            <strong>{{ w.label }}</strong>
            <p>{{ w.desc }}</p>
          </div>
          <span class="world-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <!-- 第三段：在实验室之外的组织与行动 -->
    <section id="home-beyond" class="content home-beyond">
      <SectionHeading
        no="03"
        :label="messages.home.beyondLabel"
        :title="homeCopy.beyondTitle"
        :accent="homeCopy.beyondAccent"
        :copy="homeCopy.beyondCopy"
      />
      <div class="home-beyond-grid">
        <div class="beyond-column" v-reveal>
          <span class="beyond-label">{{ messages.home.leadership }}</span>
          <div class="beyond-leadership-list">
            <article v-for="item in leadership" :key="item.role + item.org" class="beyond-leadership">
              <strong>{{ item.role }}</strong>
              <span>{{ item.org }}</span>
              <small>{{ item.period }}</small>
            </article>
          </div>
        </div>
        <div class="beyond-column" v-reveal="{ delay: 80 }">
          <span class="beyond-label">{{ messages.home.selectedActivities }}</span>
          <div class="beyond-activity-list">
            <article v-for="item in selectedActivities" :key="item.id" class="beyond-activity">
              <time>{{ item.period }}</time>
              <div>
                <strong>{{ item.title }}</strong>
                <small>{{ item.org }}</small>
              </div>
            </article>
          </div>
        </div>
      </div>
      <div class="beyond-links">
        <a :href="buildLocalizedPageHref('academics', locale)">{{ messages.actions.exploreAcademics }} <span aria-hidden="true">→</span></a>
        <a :href="buildLocalizedPageHref('honors', locale)">{{ messages.actions.viewHonors }} <span aria-hidden="true">→</span></a>
      </div>
    </section>
  </div>
</template>
