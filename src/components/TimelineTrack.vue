<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useLocale } from '../i18n'
import StatusBadge from './StatusBadge.vue'
import CopyCitation from './CopyCitation.vue'
import type { ResearchItem } from '../data/types'

const props = defineProps<{ items: ResearchItem[] }>()
const { messages } = useLocale()

const openMethod = reactive<Record<string, boolean>>({})
const timelineRoot = ref<HTMLElement | null>(null)
const currentId = ref(props.items[0]?.id ?? '')
let currentObserver: IntersectionObserver | null = null
const readingTargets = new Set<Element>()

function tagClass(tag: string) {
  if (tag.includes('WEB TOOL')) return 'aqua'
  if (tag.includes('PUBLISHED')) return 'gold'
  if (tag.includes('DEEP')) return 'violet'
  if (tag.includes('MULTIMODAL')) return 'violet'
  return 'dim'
}

function toggleMethod(id: string) {
  openMethod[id] = !openMethod[id]
}

function updateCurrentItem() {
  if (!readingTargets.size) {
    currentId.value = ''
    return
  }
  const readingLine = window.innerHeight * .38
  const closest = [...readingTargets]
    .map((target) => ({
      target,
      distance: Math.abs(target.getBoundingClientRect().top - readingLine)
    }))
    .sort((left, right) => left.distance - right.distance)[0]
  const id = closest?.target instanceof HTMLElement ? closest.target.id : ''
  if (id) currentId.value = id
}

function observeReadingTargets() {
  currentObserver?.disconnect()
  currentObserver = null
  readingTargets.clear()
  const targets = [...(timelineRoot.value?.querySelectorAll<HTMLElement>('.tl-item') ?? [])]
  if (!targets.length || !('IntersectionObserver' in window)) return

  currentObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) readingTargets.add(entry.target)
      else readingTargets.delete(entry.target)
    })
    updateCurrentItem()
  }, {
    rootMargin: '-20% 0px -55% 0px',
    threshold: [0, .2, .5, .8, 1]
  })
  targets.forEach((target) => currentObserver?.observe(target))
}

onMounted(() => {
  void nextTick(observeReadingTargets)
})

onUnmounted(() => {
  currentObserver?.disconnect()
  currentObserver = null
  readingTargets.clear()
})
</script>

<template>
  <div ref="timelineRoot" class="timeline-track">
    <div class="tl-rail" aria-hidden="true"></div>
    <article
      v-for="(item, i) in items"
      :key="item.id"
      :id="item.id"
      class="tl-item"
      :class="{ active: item.status === 'active', 'is-current': currentId === item.id }"
      :data-reading-state="currentId === item.id ? 'current' : 'idle'"
      v-reveal="{ delay: Math.min(i, 4) * 60 }"
    >
      <div class="tl-side">
        <span class="tl-date">{{ item.date }}</span>
        <StatusBadge v-if="item.status" :status="item.status" />
      </div>
      <span class="tl-node" aria-hidden="true"><i></i></span>
      <div class="tl-body">
        <span class="tl-tag" :class="tagClass(item.tag)">{{ item.tag }}</span>
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>

        <div class="tl-metrics" v-if="item.metrics">
          <div class="metric-item" v-for="m in item.metrics" :key="m.label">
            <strong>{{ m.value }}</strong>
            <span>{{ m.label }}</span>
            <small v-if="m.note">{{ m.note }}</small>
          </div>
        </div>

        <div v-if="item.methodology" class="tl-method">
          <button
            class="method-toggle"
            :class="{ open: openMethod[item.id] }"
            type="button"
            :aria-expanded="!!openMethod[item.id]"
            :aria-controls="`method-${item.id}`"
            @click="toggleMethod(item.id)"
          >
            <span class="disclosure-mark" aria-hidden="true">{{ openMethod[item.id] ? '−' : '+' }}</span>
            {{ openMethod[item.id] ? messages.research.collapseMethodology : messages.research.expandMethodology }}
          </button>
          <div
            :id="`method-${item.id}`"
            class="method-disclosure"
            :class="{ open: openMethod[item.id] }"
            :aria-hidden="!openMethod[item.id]"
          >
            <div class="method-disclosure-inner">
              <div class="method-grid">
                <div class="method-cell">
                  <span class="method-label">{{ messages.research.question }}</span>
                  <p>{{ item.methodology.question }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">{{ messages.research.hypothesis }}</span>
                  <p>{{ item.methodology.hypothesis }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">{{ messages.research.method }}</span>
                  <p>{{ item.methodology.method }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">{{ messages.research.prototype }}</span>
                  <p>{{ item.methodology.prototype }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">{{ messages.research.result }}</span>
                  <p>{{ item.methodology.result }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">{{ messages.research.next }}</span>
                  <p>{{ item.methodology.next }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tl-foot">
          <div class="tl-foot-meta">
            <span class="tl-org">{{ item.org }}</span>
            <span v-if="item.paper" class="tl-doi">DOI · {{ item.paper.doi }}</span>
          </div>
          <div class="tl-actions">
            <CopyCitation v-if="item.citation" :citation="item.citation" />
            <a
              v-if="item.paper"
              :href="item.paper.href"
              target="_blank"
              rel="noopener noreferrer"
              class="tl-link"
            >
              {{ messages.common.readPaper }} <span class="tl-paper-tag">{{ item.paper.tag }}</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a v-if="item.link" :href="item.link" target="_blank" rel="noopener noreferrer" class="tl-link">
              {{ messages.common.openProject }} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <div v-if="item.proof?.length" class="tl-proof">
          <span class="tl-proof-label">{{ messages.common.proof }}</span>
          <div class="tl-proof-list">
            <a
              v-for="proof in item.proof"
              :key="proof.label"
              :href="proof.href"
              :target="proof.external ? '_blank' : undefined"
              :rel="proof.external ? 'noopener noreferrer' : undefined"
              class="y-archive-link"
            >
              <span>{{ proof.label }}</span>
              <strong>{{ proof.value }}</strong>
              <span aria-hidden="true">{{ proof.external ? '↗' : '→' }}</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>
