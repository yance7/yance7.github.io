<script setup>
import { reactive } from 'vue'
import StatusBadge from './StatusBadge.vue'

defineProps({
  items: { type: Array, required: true }
})

const openMethod = reactive({})

function tagClass(tag) {
  if (tag.includes('WEB TOOL')) return 'aqua'
  if (tag.includes('PUBLISHED')) return 'gold'
  if (tag.includes('DEEP')) return 'violet'
  if (tag.includes('MULTIMODAL')) return 'violet'
  return 'dim'
}

function statusLabel(status) {
  return { active: '进行中', published: '已发表', completed: '已完成' }[status] || ''
}

function toggleMethod(title) {
  openMethod[title] = !openMethod[title]
}
</script>

<template>
  <div class="timeline-track">
    <div class="tl-rail" aria-hidden="true"></div>
    <article
      v-for="item in items"
      :key="item.title"
      class="tl-item"
      :class="{ active: item.status === 'active' }"
      v-reveal
    >
      <div class="tl-side">
        <span class="tl-date">{{ item.date }}</span>
        <span class="tl-node" aria-hidden="true"><i></i></span>
        <StatusBadge v-if="item.status" :status="item.status" :label="statusLabel(item.status)" />
      </div>
      <div class="tl-body">
        <span class="tl-tag" :class="tagClass(item.tag)">{{ item.tag }}</span>
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>

        <!-- 关键指标条 -->
        <div class="tl-metrics" v-if="item.metrics">
          <div class="metric-item" v-for="m in item.metrics" :key="m.label">
            <strong>{{ m.value }}</strong>
            <span>{{ m.label }}</span>
          </div>
        </div>

        <!-- 可展开方法论 -->
        <div v-if="item.methodology" class="tl-method">
          <button
            class="method-toggle"
            :class="{ open: openMethod[item.title] }"
            type="button"
            :aria-expanded="!!openMethod[item.title]"
            @click="toggleMethod(item.title)"
          >
            {{ openMethod[item.title] ? '收起方法论' : '展开方法论' }}
          </button>
          <div class="method-grid" :class="{ open: openMethod[item.title] }">
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

        <div class="tl-foot">
          <span class="tl-org">{{ item.org }}</span>
          <a v-if="item.link" :href="item.link" target="_blank" rel="noopener" class="tl-link">
            OPEN PROJECT <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  </div>
</template>
