<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { buildLocalizedPageHref, useLocale } from '../i18n'

const { locale } = useLocale()
const projects = [
  { name: 'Maize', file: 'maize', page: 'research', hash: 'corn-growth' },
  { name: 'FishFreshNet', file: 'fishfreshnet', page: 'research', hash: 'fishfreshnet-v1' },
  { name: 'FreshEye', file: 'fresheye', page: 'works', hash: 'project-fresheye' }
] as const
const labels = computed(() => locale.value === 'en'
  ? { pause: 'Pause videos', play: 'Play videos', view: (name: string) => `View ${name} project` }
  : locale.value === 'zh-HK'
    ? { pause: '暫停影片', play: '播放影片', view: (name: string) => `查看 ${name} 項目` }
    : { pause: '暂停视频', play: '播放视频', view: (name: string) => `查看 ${name} 项目` })
const root = ref<HTMLElement | null>(null)
const paused = ref(false)
const mounted = ref(false)
let observer: IntersectionObserver | undefined
let media: MediaQueryList | undefined
const visible = new Set<HTMLVideoElement>()
function sync() {
  root.value?.querySelectorAll<HTMLVideoElement>('video').forEach(video => {
    if (paused.value || document.hidden || !visible.has(video)) { video.pause(); return }
    if (!video.src) { video.src = video.dataset.src || ''; video.load() }
    void video.play().catch(() => { video.pause(); video.removeAttribute('src'); video.load() })
  })
}
function preferenceChanged() { if (media?.matches) paused.value = true; sync() }
function toggle() { paused.value = !paused.value; sync() }
onMounted(() => {
  mounted.value = true
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  paused.value = media.matches
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
  media.addEventListener('change', preferenceChanged)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('visibilitychange', sync)
  media?.removeEventListener('change', preferenceChanged)
})
</script>

<template>
  <section ref="root" class="home-projects" data-home-hero-control>
    <div class="home-projects__rail">
      <div v-for="project in projects" :key="project.file" class="home-project-video" :class="`home-project-video--${project.file}`">
        <video :poster="`/assets/images/home-projects/${project.file}.jpg`" :data-src="`/assets/videos/home-projects/${project.file}.mp4`" width="1200" height="840" muted loop playsinline preload="none" aria-hidden="true"></video>
        <div class="home-project-video__caption">
          <span>{{ project.name }}</span>
          <a :href="buildLocalizedPageHref(project.page, locale, { hash: project.hash })" :aria-label="labels.view(project.name)">↗</a>
        </div>
      </div>
    </div>
    <button v-if="mounted" type="button" class="home-projects__toggle" @click="toggle">{{ paused ? labels.play : labels.pause }}</button>
  </section>
</template>
