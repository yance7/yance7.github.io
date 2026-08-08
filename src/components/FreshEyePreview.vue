<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Project } from '../data/types'

type ProductShotId = 'input' | 'result' | 'explain'

const props = defineProps<{ project: Project }>()
const activeShot = ref<ProductShotId>('input')
const shotOptions: Array<{ id: ProductShotId; label: string; description: string; caption: string; navIndex: number }> = [
  { id: 'input', label: 'INPUT', description: '上传', caption: 'Upload an image to start a new analysis.', navIndex: 0 },
  { id: 'result', label: 'RESULT', description: '结果', caption: 'Three freshness classes with confidence.', navIndex: 1 },
  { id: 'explain', label: 'EXPLAIN', description: '解释', caption: 'Grad-CAM highlights the visual evidence.', navIndex: 2 }
]
const preview = computed(() => {
  const value = props.project.caseStudy?.preview
  if (!value) throw new Error('FreshEye preview data is missing')
  return value
})
const sampleImage = computed(() => {
  const value = props.project.caseStudy?.visuals?.[0]
  if (!value) throw new Error('FreshEye preview sample image is missing')
  return value
})
const activeShotMeta = computed(() => shotOptions.find((shot) => shot.id === activeShot.value) || shotOptions[0])

function selectShot(id: ProductShotId) {
  activeShot.value = id
}

function onShotKeydown(event: KeyboardEvent, index: number) {
  const last = shotOptions.length - 1
  let next: number

  if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
  else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = last
  else return

  event.preventDefault()
  activeShot.value = shotOptions[next].id
  requestAnimationFrame(() => document.getElementById(`shot-tab-${activeShot.value}`)?.focus())
}
</script>

<template>
  <div class="sc-product-ui" aria-label="FreshEye 产品界面预览">
    <div class="sc-product-ui-head">
      <span class="sc-product-mark">{{ project.en }} / ANALYSIS</span>
      <span class="sc-product-state"><i></i> {{ preview.status }}</span>
    </div>
    <div class="sc-shot-tabs" role="tablist" aria-label="FreshEye 产品界面" aria-orientation="horizontal">
      <button
        v-for="(shot, shotIndex) in shotOptions"
        :id="`shot-tab-${shot.id}`"
        :key="shot.id"
        type="button"
        role="tab"
        :aria-selected="activeShot === shot.id"
        :aria-controls="`shot-panel-${shot.id}`"
        :tabindex="activeShot === shot.id ? 0 : -1"
        @click="selectShot(shot.id)"
        @keydown="onShotKeydown($event, shotIndex)"
      >
        <strong>{{ shot.label }}</strong>
        <small>{{ shot.description }}</small>
      </button>
    </div>
    <Transition name="shot">
      <div
        :id="`shot-panel-${activeShot}`"
        :key="activeShot"
        class="sc-shot-stage"
        role="tabpanel"
        :aria-labelledby="`shot-tab-${activeShot}`"
        tabindex="0"
      >
        <template v-if="activeShot === 'input'">
          <aside class="sc-shot-sidebar">
            <strong>{{ project.en }}</strong>
            <span v-for="(item, index) in preview.input.navigation" :key="item" :class="{ active: index === activeShotMeta.navIndex }">{{ item }}</span>
          </aside>
          <div class="sc-shot-workspace">
            <div class="sc-shot-toolbar"><span>{{ preview.input.toolbar }}</span><span>{{ preview.input.format }}</span></div>
            <div class="sc-input-canvas">
              <img :src="sampleImage.src" :alt="sampleImage.alt" width="600" height="600">
              <div class="sc-input-overlay"><strong>{{ preview.input.title }}</strong><span>{{ preview.input.hint }}</span></div>
            </div>
            <div class="sc-shot-footer"><span>{{ preview.input.resolution }}</span><b>{{ preview.input.action }}</b></div>
          </div>
        </template>
        <template v-else-if="activeShot === 'result'">
          <aside class="sc-shot-sidebar">
            <strong>{{ project.en }}</strong>
            <span v-for="(item, index) in preview.result.navigation" :key="item" :class="{ active: index === activeShotMeta.navIndex }">{{ item }}</span>
          </aside>
          <div class="sc-shot-workspace">
            <div class="sc-shot-toolbar"><span>{{ preview.result.toolbar }}</span><span class="sc-shot-ok">{{ preview.result.status }}</span></div>
            <div class="sc-result-grid">
              <div class="sc-result-image">
                <img :src="sampleImage.src" :alt="sampleImage.alt" width="600" height="600">
                <span class="sc-confidence-ring">{{ preview.result.confidence }}</span>
              </div>
              <div class="sc-result-panel">
                <span>{{ preview.result.label }}</span>
                <strong>{{ preview.result.className }}</strong>
                <small>{{ preview.result.confidenceLabel }}</small>
                <b>{{ preview.result.confidence }}</b>
                <div class="sc-confidence-bar"><i></i></div>
                <span class="sc-result-class">{{ preview.result.dataset }}</span>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <aside class="sc-shot-sidebar">
            <strong>{{ project.en }}</strong>
            <span v-for="(item, index) in preview.explain.navigation" :key="item" :class="{ active: index === activeShotMeta.navIndex }">{{ item }}</span>
          </aside>
          <div class="sc-shot-workspace">
            <div class="sc-shot-toolbar"><span>{{ preview.explain.toolbar }}</span><span>{{ preview.explain.model }}</span></div>
            <div class="sc-explain-grid">
              <div class="sc-explain-image">
                <img :src="sampleImage.src" :alt="sampleImage.alt" width="600" height="600">
                <span class="sc-heatmap" aria-hidden="true"></span>
                <span class="sc-explain-label">{{ preview.explain.label }}</span>
              </div>
              <div class="sc-explain-panel">
                <span>{{ preview.explain.evidenceLabel }}</span>
                <strong>{{ preview.explain.method }}</strong>
                <p>{{ preview.explain.description }}</p>
                <div v-for="signal in preview.explain.signals" :key="signal.label"><b>{{ signal.label }}</b><span>{{ signal.value }}</span></div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </Transition>
    <p class="sc-shot-caption" aria-live="polite">{{ activeShotMeta.caption }}</p>
    <p class="sc-preview-disclaimer">{{ preview.eyebrow }}</p>
  </div>
</template>

<style scoped>
.sc-product-ui {
  width: 100%; max-width: 620px; overflow: hidden;
  border: 1px solid rgba(109, 222, 208, .28); border-radius: 12px;
  background: #101923; color: #EAF5F2; box-shadow: 0 20px 50px rgba(0, 0, 0, .32);
}
.sc-product-ui-head, .sc-shot-toolbar, .sc-shot-footer {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.sc-product-ui-head { padding: 12px 14px; border-bottom: 1px solid rgba(235, 238, 245, .1); }
.sc-product-mark, .sc-product-state, .sc-shot-tabs button, .sc-shot-toolbar, .sc-shot-footer,
.sc-shot-sidebar, .sc-shot-caption, .sc-preview-disclaimer {
  font-family: var(--mono); font-size: var(--text-micro); letter-spacing: .08em;
}
.sc-product-mark { color: #8BE5D5; }
.sc-product-state { color: #8D9AA8; }
.sc-product-state i { display: inline-block; width: 5px; height: 5px; margin-right: 5px; border-radius: 50%; background: #8BE5D5; }
.sc-shot-tabs { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid rgba(235, 238, 245, .1); }
.sc-shot-tabs button {
  display: flex; align-items: baseline; justify-content: center; gap: 6px;
  padding: 10px 6px; border: 0; border-bottom: 2px solid transparent;
  background: transparent; color: #A8B9C4; text-align: left;
}
.sc-shot-tabs button[aria-selected='true'] { border-bottom-color: #8BE5D5; color: #F2FBF8; background: rgba(109, 222, 208, .08); }
.sc-shot-tabs button small { font: inherit; letter-spacing: .04em; opacity: .9; }
.sc-shot-stage { display: grid; grid-template-columns: 94px 1fr; min-height: 248px; }
.sc-shot-sidebar {
  display: flex; flex-direction: column; gap: 10px; padding: 16px 10px;
  border-right: 1px solid rgba(235, 238, 245, .1); color: #A5B2BB;
}
.sc-shot-sidebar strong { margin-bottom: 8px; color: #F2FBF8; font-family: var(--serif); font-size: 15px; font-weight: 500; letter-spacing: 0; }
.sc-shot-sidebar .active { color: #8BE5D5; }
.sc-shot-workspace { min-width: 0; padding: 14px; }
.sc-shot-toolbar { padding-bottom: 10px; color: #82919D; }
.sc-shot-ok { color: #8BE5D5; }
.sc-input-canvas { position: relative; min-height: 168px; overflow: hidden; border: 1px dashed rgba(139, 229, 213, .55); border-radius: 7px; background: #172530; }
.sc-input-canvas img, .sc-result-image img, .sc-explain-image img { width: 100%; height: 100%; object-fit: cover; }
.sc-input-canvas img { position: absolute; inset: 0; opacity: .48; filter: saturate(.82); }
.sc-input-overlay { position: absolute; inset: 0; display: grid; place-content: center; gap: 4px; text-align: center; background: rgba(10, 20, 30, .28); }
.sc-input-overlay strong { font-family: var(--serif); font-size: 18px; font-weight: 500; }
.sc-input-overlay span { color: #A5B5BF; font-family: var(--mono); font-size: var(--text-micro); letter-spacing: .04em; }
.sc-shot-footer { padding-top: 10px; color: #7C8B97; }
.sc-shot-footer b { color: #8BE5D5; font-weight: 500; }
.sc-result-grid, .sc-explain-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(120px, .85fr); gap: 12px; min-height: 188px; }
.sc-result-image, .sc-explain-image { position: relative; overflow: hidden; min-height: 188px; border-radius: 7px; background: #172530; }
.sc-confidence-ring { position: absolute; right: 10px; bottom: 10px; padding: 8px 7px; border: 1px solid #8BE5D5; border-radius: 50%; background: rgba(16, 25, 35, .82); color: #8BE5D5; font-family: var(--mono); font-size: var(--text-micro); }
.sc-result-panel, .sc-explain-panel { display: flex; flex-direction: column; justify-content: center; gap: 7px; padding: 8px; }
.sc-result-panel > span, .sc-explain-panel > span { color: #8C9BA6; font-family: var(--mono); font-size: var(--text-micro); letter-spacing: .08em; }
.sc-result-panel strong, .sc-explain-panel strong { color: #F2FBF8; font-family: var(--serif); font-size: 28px; font-weight: 500; line-height: 1; }
.sc-result-panel small { color: #8896A2; font-family: var(--mono); font-size: var(--text-micro); }
.sc-result-panel > b { color: #8BE5D5; font-family: var(--display); font-size: 22px; font-weight: 500; }
.sc-confidence-bar { height: 4px; overflow: hidden; border-radius: 4px; background: rgba(139, 229, 213, .16); }
.sc-confidence-bar i { display: block; width: 92%; height: 100%; background: #8BE5D5; }
.sc-result-class { margin-top: 5px; color: #788793; font-family: var(--mono); font-size: var(--text-micro); letter-spacing: .02em; }
.sc-heatmap { position: absolute; inset: 0; background: radial-gradient(circle at 56% 48%, rgba(255, 112, 47, .82), transparent 18%), radial-gradient(circle at 45% 52%, rgba(255, 214, 55, .6), transparent 38%); mix-blend-mode: screen; opacity: .8; }
.sc-explain-label { position: absolute; left: 10px; bottom: 10px; padding: 5px 7px; background: rgba(16, 25, 35, .78); color: #FFE296; font-family: var(--mono); font-size: var(--text-micro); letter-spacing: .04em; }
.sc-explain-panel p { margin: 0; color: #A6B3BC; font-size: var(--text-xs); line-height: 1.55; }
.sc-explain-panel div { display: flex; justify-content: space-between; padding-top: 7px; border-top: 1px solid rgba(235, 238, 245, .1); color: #8C9BA6; font-family: var(--mono); font-size: var(--text-micro); letter-spacing: .02em; }
.sc-explain-panel div span { color: #8BE5D5; }
.sc-shot-caption, .sc-preview-disclaimer { margin: 0; border-top: 1px solid rgba(235, 238, 245, .1); color: #A5B2BB; line-height: 1.4; }
.sc-shot-caption { padding: 8px 14px 4px; }
.sc-preview-disclaimer { padding: 0 14px 11px; color: #A5B2BB; letter-spacing: .04em; }
.shot-enter-active, .shot-leave-active { transition: opacity .2s ease, transform .2s ease; }
.shot-enter-from { opacity: 0; transform: translateY(5px); }
.shot-leave-to { opacity: 0; transform: translateY(-5px); }

@media (max-width: 640px) {
  .sc-product-ui-head { padding: 10px; }
  .sc-shot-stage { grid-template-columns: 1fr; min-height: 220px; }
  .sc-shot-sidebar { display: none; }
  .sc-shot-workspace { padding: 12px; }
  .sc-input-canvas, .sc-result-image, .sc-explain-image { min-height: 150px; }
  .sc-result-grid, .sc-explain-grid { min-height: 150px; gap: 8px; }
  .sc-result-panel strong, .sc-explain-panel strong { font-size: 23px; }
  .sc-explain-panel p { font-size: var(--text-micro); }
}
</style>
