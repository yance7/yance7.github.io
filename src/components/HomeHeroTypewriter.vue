<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { HOME_HERO_INTRO_TIMINGS, splitGraphemes } from '../utils/homeHeroIntro'
import { loadHomeGreetingFont } from '../utils/homeGreetingFont'

const props = defineProps<{
  greeting: string
  statement: string
  finalState: boolean
  startedAt: number | null
}>()

const fontState = ref<'loading' | 'ready' | 'fallback'>('loading')
const elapsedAtReady = ref(0)
let disposed = false
onMounted(() => {
  void loadHomeGreetingFont(`${props.greeting} ${props.statement}`).then(state => {
    if (disposed) return
    elapsedAtReady.value = props.startedAt === null ? 0 : Math.max(0, performance.now() - props.startedAt)
    fontState.value = state
  })
})
onBeforeUnmount(() => { disposed = true })

const typewriterStyle = computed(() => ({
  '--home-hero-greeting-duration': `${HOME_HERO_INTRO_TIMINGS.firstLineMs}ms`,
  '--home-hero-greeting-delay': `${-elapsedAtReady.value}ms`,
  '--home-hero-greeting-steps': Math.max(1, splitGraphemes(props.greeting).length),
  '--home-hero-statement-duration': `${HOME_HERO_INTRO_TIMINGS.secondLineMs}ms`,
  '--home-hero-statement-delay': `${HOME_HERO_INTRO_TIMINGS.firstLineMs + HOME_HERO_INTRO_TIMINGS.linePauseMs - elapsedAtReady.value}ms`,
  '--home-hero-statement-steps': Math.max(1, splitGraphemes(props.statement).length)
}))
</script>

<template>
  <div class="home-hero-typewriter" aria-hidden="true" :data-font-state="fontState" :data-final-state="props.finalState || fontState === 'fallback'" :style="typewriterStyle">
    <span class="home-hero-typewriter-line home-hero-typewriter-line-greeting">{{ props.greeting }}</span>
    <span class="home-hero-typewriter-line home-hero-typewriter-line-statement home-hero-typewriter-line-accent">
      <span class="home-hero-typewriter-copy">{{ props.statement }}</span><span class="home-hero-cursor" aria-hidden="true">_</span>
    </span>
  </div>
</template>
