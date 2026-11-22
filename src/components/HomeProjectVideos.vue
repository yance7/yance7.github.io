<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { buildLocalizedPageHref, useLocale } from '../i18n'

const { locale } = useLocale()
const projectItems = [
  { names: { 'zh-CN': '玉米', 'zh-HK': '玉米', en: 'Maize' }, file: 'maize', page: 'research', hash: 'corn-growth' },
  { names: { 'zh-CN': 'FishFreshNet', 'zh-HK': 'FishFreshNet', en: 'FishFreshNet' }, file: 'fishfreshnet', page: 'research', hash: 'fishfreshnet-v1' },
  { names: { 'zh-CN': '鲜眸', 'zh-HK': '鮮眸', en: 'FreshEye' }, file: 'fresheye', page: 'works', hash: 'project-fresheye' }
] as const
const projects = computed(() => projectItems.map(project => {
  const name = project.names[locale.value]
  const label = locale.value === 'en'
    ? `View ${name} project`
    : locale.value === 'zh-HK'
      ? `查看 ${name} 項目`
      : `查看 ${name} 项目`
  return {
    ...project,
    name,
    href: buildLocalizedPageHref(project.page, locale.value, { hash: project.hash }),
    label
  }
}))
const root = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined
let media: MediaQueryList | undefined
const visible = new Set<HTMLVideoElement>()
const generations = new WeakMap<HTMLVideoElement, number>()
const failed = new WeakSet<HTMLVideoElement>()
function fail(video: HTMLVideoElement) {
  if (failed.has(video)) return
  failed.add(video)
  video.pause()
  video.removeAttribute('src')
  video.load()
}
function sync() {
  const shouldPause = Boolean(media?.matches) || document.hidden
  root.value?.querySelectorAll<HTMLVideoElement>('video').forEach(video => {
    if (shouldPause || !visible.has(video)) {
      generations.set(video, (generations.get(video) || 0) + 1)
      video.pause()
      return
    }
    if (failed.has(video) || !video.paused) return
    if (!video.src) { video.src = video.dataset.src || ''; video.load() }
    const generation = (generations.get(video) || 0) + 1
    generations.set(video, generation)
    void video.play().catch((error: unknown) => {
      if (generations.get(video) !== generation || (error instanceof DOMException && error.name === 'AbortError')) return
      fail(video)
    })
  })
}
function mediaError(event: Event) {
  const video = event.currentTarget as HTMLVideoElement
  if (video.error) fail(video)
}
onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target as HTMLVideoElement
      if (entry.isIntersecting && entry.intersectionRatio >= .5) visible.add(video)
      else visible.delete(video)
    })
    sync()
  }, { threshold: [.5] })
  root.value?.querySelectorAll('video').forEach(video => observer?.observe(video))
  document.addEventListener('visibilitychange', sync)
  media.addEventListener('change', sync)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('visibilitychange', sync)
  media?.removeEventListener('change', sync)
})
</script>

<template>
  <section ref="root" class="home-projects" data-home-hero-control>
    <div class="home-projects__rail">
      <div v-for="project in projects" :key="project.file" class="home-project-video" :class="`home-project-video--${project.file}`">
        <video :poster="`/assets/images/home-projects/${project.file}.jpg`" :data-src="`/assets/videos/home-projects/${project.file}.mp4`" width="1200" height="840" muted loop playsinline preload="none" aria-hidden="true" @error="mediaError"></video>
        <div class="home-project-video__caption">
          <span>{{ project.name }}</span>
          <a :href="project.href" :aria-label="project.label">→</a>
        </div>
      </div>
    </div>
  </section>
</template>
