<script setup lang="ts">
import { reactive } from 'vue'
import StatusBadge from './StatusBadge.vue'
import CopyCitation from './CopyCitation.vue'
import { statusLabels } from '../data'
import type { ResearchItem } from '../data/types'

defineProps<{ items: ResearchItem[] }>()
const statusLabelMap: Record<string, string> = statusLabels

const openMethod = reactive<Record<string, boolean>>({})

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
</script>

<template>
  <div class="timeline-track">
    <div class="tl-rail" aria-hidden="true"></div>
    <article
      v-for="item in items"
      :key="item.id"
      :id="item.id"
      class="tl-item"
      :class="{ active: item.status === 'active' }"
      v-reveal
    >
      <div class="tl-side">
        <span class="tl-date">{{ item.date }}</span>
        <StatusBadge v-if="item.status" :status="item.status" :label="statusLabelMap[item.status]" />
      </div>
      <span class="tl-node" aria-hidden="true"><i></i></span>
      <div class="tl-body">
        <span class="tl-tag" :class="tagClass(item.tag)">{{ item.tag }}</span>
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>

        <!-- 关键指标条 -->
        <div class="tl-metrics" v-if="item.metrics">
          <div class="metric-item" v-for="m in item.metrics" :key="m.label">
            <strong>{{ m.value }}</strong>
            <span>{{ m.label }}</span>
            <small v-if="m.note">{{ m.note }}</small>
          </div>
        </div>

        <!-- 可展开方法论 -->
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
            {{ openMethod[item.id] ? '收起方法论' : '展开方法论' }}
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
                  <span class="method-label">QUESTION</span>
                  <p>{{ item.methodology.question }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">HYPOTHESIS</span>
                  <p>{{ item.methodology.hypothesis }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">METHOD</span>
                  <p>{{ item.methodology.method }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">PROTOTYPE</span>
                  <p>{{ item.methodology.prototype }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">RESULT</span>
                  <p>{{ item.methodology.result }}</p>
                </div>
                <div class="method-cell">
                  <span class="method-label">NEXT</span>
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
              rel="noopener"
              class="tl-link"
            >
              READ PAPER <span class="tl-paper-tag">{{ item.paper.tag }}</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a v-if="item.link" :href="item.link" target="_blank" rel="noopener" class="tl-link">
              OPEN PROJECT <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <div v-if="item.proof?.length" class="tl-proof">
          <span class="tl-proof-label">PROOF</span>
          <div class="tl-proof-list">
            <a
              v-for="proof in item.proof"
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
    </article>
  </div>
</template>
