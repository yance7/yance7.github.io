<script setup lang="ts">
import '../styles/research.css'
import { computed } from 'vue'
import { getLocalizedResearch, getLocalizedResearchMethodGroups, getLocalizedResearchMethods, getLocalizedResearchSections } from '../data/locales'
import { useLocale } from '../i18n'
import SectionHeading from '../components/SectionHeading.vue'
import TimelineTrack from '../components/TimelineTrack.vue'

const { locale, messages } = useLocale()
const research = computed(() => getLocalizedResearch(locale.value))
const researchMethods = computed(() => getLocalizedResearchMethods(locale.value))
const researchMethodGroups = computed(() => getLocalizedResearchMethodGroups(locale.value))
const sections = computed(() => getLocalizedResearchSections(locale.value))
</script>

<template>
  <div class="page-research">
    <section id="sec-research-timeline" class="content">
      <SectionHeading
        no="01"
        :label="sections.timeline.label"
        :title="sections.timeline.title"
        :accent="sections.timeline.accent"
        :copy="sections.timeline.copy"
      />
      <TimelineTrack :items="research" />
    </section>

    <section id="sec-toolchain" class="content">
      <SectionHeading
        no="02"
        :label="sections.toolchain.label"
        :title="sections.toolchain.title"
        :accent="sections.toolchain.accent"
        :copy="sections.toolchain.copy"
      />
      <div class="toolchain-panel" v-reveal>
        <div class="toolchain-intro">
          <div>
            <span class="tc-kicker">{{ sections.toolchain.workbench }}</span>
            <h3>{{ sections.toolchain.workbenchTitle }}</h3>
            <p>{{ sections.toolchain.workbenchCopy }}</p>
          </div>
          <div class="tc-count" :aria-label="messages.research.methodsLabel">
            <strong>{{ researchMethods.length }}</strong>
            <span>{{ messages.research.toolsInRotation }}</span>
          </div>
        </div>

        <div class="toolchain-flow" :aria-label="sections.toolchain.flowLabel">
          <span><b>01</b> {{ sections.toolchain.flow[0] }}</span>
          <i aria-hidden="true"></i>
          <span><b>02</b> {{ sections.toolchain.flow[1] }}</span>
          <i aria-hidden="true"></i>
          <span><b>03</b> {{ sections.toolchain.flow[2] }}</span>
        </div>

        <div class="toolchain-groups">
          <section
            v-for="(group, i) in researchMethodGroups"
            :key="group.id"
            class="toolchain-group"
            v-reveal="{ delay: i * 60 }"
          >
            <div class="tc-group-head">
              <span class="tc-group-no">0{{ i + 1 }}</span>
              <div>
                <strong>{{ group.label }}</strong>
                <small>{{ locale === 'en' ? group.en : group.label }}</small>
              </div>
              <span class="tc-group-count">{{ group.items.length }} {{ messages.research.toolsCount }}</span>
            </div>
            <p>{{ group.description }}</p>
            <div class="tc-tools">
              <span v-for="tool in group.items" :key="tool.label" class="tc-tool">
                <strong>{{ tool.label }}</strong>
              </span>
            </div>
          </section>
        </div>

        <div class="toolchain-foot">
          <span><i></i> {{ sections.toolchain.footer[0] }}</span>
          <span>{{ sections.toolchain.footer[1] }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
