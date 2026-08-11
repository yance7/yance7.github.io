<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { homeArchiveRoutes } from '../data'

const activeIndex = ref(0)
const routeButtons = ref<Array<HTMLButtonElement | null>>([])

const activeRoute = computed(() => homeArchiveRoutes[activeIndex.value]!)
const previewId = 'home-archive-preview'

function setRouteButton(element: HTMLButtonElement | null, index: number) {
  routeButtons.value[index] = element
}

function selectRoute(index: number, moveFocus = false) {
  const total = homeArchiveRoutes.length
  activeIndex.value = (index + total) % total
  if (moveFocus) {
    void nextTick(() => routeButtons.value[activeIndex.value]?.focus())
  }
}

function onRouteKeydown(event: KeyboardEvent, index: number) {
  let nextIndex: number | null = null

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = index + 1
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = index - 1
  if (event.key === 'Home') nextIndex = 0
  if (event.key === 'End') nextIndex = homeArchiveRoutes.length - 1

  if (nextIndex !== null) {
    event.preventDefault()
    selectRoute(nextIndex, true)
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectRoute(index)
  }
}
</script>

<template>
  <section
    class="home-archive-index"
    aria-labelledby="home-archive-index-title"
    v-reveal="{ delay: 220 }"
  >
    <div class="home-archive-index-head">
      <span id="home-archive-index-title" class="home-archive-label">OPEN ARCHIVE</span>
      <span class="home-archive-count">03 WORLDS / ONE THREAD</span>
    </div>

    <div class="home-archive-rail" role="tablist" aria-label="首页档案路径">
      <button
        v-for="(route, index) in homeArchiveRoutes"
        :key="route.id"
        :ref="(element) => setRouteButton(element as HTMLButtonElement | null, index)"
        class="home-archive-route"
        :class="[`accent-${route.accent}`, { active: activeIndex === index }]"
        :id="`home-archive-route-${route.id}`"
        :data-route="route.id"
        type="button"
        role="tab"
        :aria-selected="activeIndex === index"
        :aria-controls="previewId"
        :tabindex="activeIndex === index ? 0 : -1"
        @click="selectRoute(index)"
        @keydown="onRouteKeydown($event, index)"
      >
        <span class="home-archive-route-index">0{{ index + 1 }}</span>
        <span class="home-archive-route-copy">
          <small>{{ route.section }}</small>
          <strong>{{ route.label }}</strong>
          <span>{{ route.value }}</span>
        </span>
        <span class="home-archive-route-arrow" aria-hidden="true">↗</span>
      </button>
    </div>

    <Transition name="archive-preview" mode="out-in">
      <div
        :key="activeRoute.id"
        :id="previewId"
        class="home-archive-preview"
        :class="`accent-${activeRoute.accent}`"
        role="tabpanel"
        tabindex="0"
        :aria-labelledby="`home-archive-route-${activeRoute.id}`"
        aria-live="polite"
      >
        <div class="home-archive-preview-copy">
          <span class="home-archive-preview-label">{{ activeRoute.section }}</span>
          <strong>{{ activeRoute.value }}</strong>
          <small>{{ activeRoute.meta }}</small>
        </div>
        <a class="home-archive-action" :href="activeRoute.href">
          OPEN {{ activeRoute.label }}
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </Transition>
  </section>
</template>
