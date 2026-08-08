<script setup lang="ts">
import { computed, ref } from 'vue'
import StatusBadge from './StatusBadge.vue'
import type { Project } from '../data/types'

type ProductShotId = 'input' | 'result' | 'explain'

const props = withDefaults(defineProps<{ project: Project; index?: number }>(), { index: 0 })
const activeShot = ref<ProductShotId>('input')
const shotOptions: Array<{ id: ProductShotId; label: string; description: string; caption: string }> = [
  { id: 'input', label: 'INPUT', description: '上传', caption: 'Upload an image to start a new analysis.' },
  { id: 'result', label: 'RESULT', description: '结果', caption: 'Three freshness classes with confidence.' },
  { id: 'explain', label: 'EXPLAIN', description: '解释', caption: 'Grad-CAM highlights the visual evidence.' }
]
const activeShotMeta = computed(() => shotOptions.find((shot) => shot.id === activeShot.value) || shotOptions[0])
const sampleImage = computed(() => props.project.caseStudy?.visuals?.[0])
</script>

<template>
  <article
    :id="`project-${project.id}`"
    class="showcase"
    :class="project.tone"
    v-reveal
  >
    <!-- 设备模拟窗口 -->
    <div class="sc-frame">
      <div class="sc-frame-bar" aria-hidden="true">
        <i></i><i></i><i></i>
        <span>{{ project.domain }}</span>
      </div>
      <div class="sc-frame-body">
        <div v-if="project.id === 'fresheye' && sampleImage" class="sc-product-ui" aria-label="FreshEye 产品界面预览">
          <div class="sc-product-ui-head">
            <span class="sc-product-mark">FRESHEYE / ANALYSIS</span>
            <span class="sc-product-state"><i></i> MODEL READY</span>
          </div>
          <div class="sc-shot-tabs" role="tablist" aria-label="FreshEye 产品界面">
            <button
              v-for="shot in shotOptions"
              :id="`shot-tab-${shot.id}`"
              :key="shot.id"
              type="button"
              role="tab"
              :aria-selected="activeShot === shot.id"
              :tabindex="activeShot === shot.id ? 0 : -1"
              @click="activeShot = shot.id"
            >
              <strong>{{ shot.label }}</strong>
              <small>{{ shot.description }}</small>
            </button>
          </div>
          <Transition name="shot" mode="out-in">
            <div
              :id="`shot-panel-${activeShot}`"
              :key="activeShot"
              class="sc-shot-stage"
              role="tabpanel"
              :aria-labelledby="`shot-tab-${activeShot}`"
            >
              <template v-if="activeShot === 'input'">
                <aside class="sc-shot-sidebar">
                  <strong>FreshEye</strong>
                  <span class="active">NEW ANALYSIS</span>
                  <span>HISTORY</span>
                  <span>EXPORT PDF</span>
                </aside>
                <div class="sc-shot-workspace">
                  <div class="sc-shot-toolbar"><span>UPLOAD IMAGE</span><span>JPEG · PNG</span></div>
                  <div class="sc-input-canvas">
                    <img :src="sampleImage.src" :alt="sampleImage.alt" width="600" height="600">
                    <div class="sc-input-overlay"><strong>Drop image here</strong><span>or choose a fish-eye photo</span></div>
                  </div>
                  <div class="sc-shot-footer"><span>224 × 224</span><b>START ANALYSIS →</b></div>
                </div>
              </template>
              <template v-else-if="activeShot === 'result'">
                <aside class="sc-shot-sidebar">
                  <strong>FreshEye</strong>
                  <span>NEW ANALYSIS</span>
                  <span class="active">RESULT</span>
                  <span>EXPORT PDF</span>
                </aside>
                <div class="sc-shot-workspace">
                  <div class="sc-shot-toolbar"><span>ANALYSIS / 0024</span><span class="sc-shot-ok">COMPLETE</span></div>
                  <div class="sc-result-grid">
                    <div class="sc-result-image">
                      <img :src="sampleImage.src" :alt="sampleImage.alt" width="600" height="600">
                      <span class="sc-confidence-ring">99.23%</span>
                    </div>
                    <div class="sc-result-panel">
                      <span>FRESHNESS</span>
                      <strong>Fresh</strong>
                      <small>Confidence score</small>
                      <b>99.23%</b>
                      <div class="sc-confidence-bar"><i></i></div>
                      <span class="sc-result-class">MFED · 3 classes</span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <aside class="sc-shot-sidebar">
                  <strong>FreshEye</strong>
                  <span>NEW ANALYSIS</span>
                  <span>RESULT</span>
                  <span class="active">GRAD-CAM</span>
                </aside>
                <div class="sc-shot-workspace">
                  <div class="sc-shot-toolbar"><span>EXPLAIN / GRAD-CAM</span><span>LIGHTCRA</span></div>
                  <div class="sc-explain-grid">
                    <div class="sc-explain-image">
                      <img :src="sampleImage.src" :alt="sampleImage.alt" width="600" height="600">
                      <span class="sc-heatmap" aria-hidden="true"></span>
                      <span class="sc-explain-label">ATTENTION REGION</span>
                    </div>
                    <div class="sc-explain-panel">
                      <span>MODEL EVIDENCE</span>
                      <strong>Grad-CAM</strong>
                      <p>重点关注鱼眼虹膜纹理区域，为分类结果提供可读证据。</p>
                      <div><b>IRIS TEXTURE</b><span>0.94</span></div>
                      <div><b>COLOR SIGNAL</b><span>0.71</span></div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </Transition>
          <p class="sc-shot-caption" aria-live="polite">{{ activeShotMeta.caption }}</p>
        </div>
        <img
          v-else-if="project.caseStudy?.visual"
          class="sc-visual"
          :src="project.caseStudy.visual.src"
          :alt="project.caseStudy.visual.alt"
          width="1200"
          height="630"
          loading="lazy"
          decoding="async"
        >
        <span v-else class="sc-icon" aria-hidden="true">{{ project.icon === 'eye' ? '◉' : '♫' }}</span>
      </div>
    </div>

    <div v-if="project.caseStudy?.visuals" class="sc-evidence" aria-label="FreshEye 真实输入样本">
      <div class="sc-evidence-head">
        <span>REAL INPUTS</span>
        <span>MODEL CONTEXT</span>
      </div>
      <figure v-for="visual in project.caseStudy.visuals" :key="visual.src" class="sc-evidence-item">
        <img :src="visual.src" :alt="visual.alt" width="600" height="600" loading="lazy" decoding="async">
        <figcaption>{{ visual.label }}</figcaption>
      </figure>
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
            <span>{{ project.caseStudy.research.detail }} ↗</span>
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
              <span aria-hidden="true">↗</span>
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
          ENTER PROJECT <span aria-hidden="true">→</span>
        </a>
        <a v-if="project.github" class="btn-ghost" :href="project.github" target="_blank" rel="noopener" v-magnetic>
          RESEARCH REPO <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  </article>
</template>
