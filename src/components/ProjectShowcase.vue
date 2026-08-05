<script setup>
defineProps({
  project: { type: Object, required: true },
  index: { type: Number, default: 0 }
})
</script>

<template>
  <article
    class="showcase"
    :class="project.tone"
    v-reveal
  >
    <!-- 设备模拟窗口 -->
    <div class="sc-frame" aria-hidden="true">
      <div class="sc-frame-bar">
        <i></i><i></i><i></i>
        <span>{{ project.domain }}</span>
      </div>
      <div class="sc-frame-body">
        <span class="sc-icon">{{ project.icon === 'eye' ? '◉' : '♫' }}</span>
      </div>
    </div>

    <div class="sc-content">
      <div class="sc-top">
        <span class="sc-overline">PROJECT 0{{ index + 1 }}</span>
        <span class="sc-domain">{{ project.domain }}</span>
      </div>

      <h3>{{ project.title }} <small>{{ project.en }}</small></h3>

      <p class="sc-value">{{ project.value }}</p>
      <p class="sc-desc">{{ project.description }}</p>

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
        <a class="btn-primary" :href="project.href" target="_blank" rel="noopener">
          ENTER PROJECT <span aria-hidden="true">→</span>
        </a>
        <a v-if="project.github" class="btn-ghost" :href="project.github" target="_blank" rel="noopener">
          GITHUB <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  </article>
</template>
