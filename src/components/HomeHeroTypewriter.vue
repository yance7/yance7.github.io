<script setup lang="ts">
import { computed } from 'vue'
import { HOME_HERO_INTRO_TIMINGS, splitGraphemes } from '../utils/homeHeroIntro'

const props = defineProps<{
  greeting: string
  statement: string
  finalState: boolean
}>()

const typewriterStyle = computed(() => ({
  '--home-hero-greeting-duration': `${HOME_HERO_INTRO_TIMINGS.firstLineMs}ms`,
  '--home-hero-greeting-steps': Math.max(1, splitGraphemes(props.greeting).length),
  '--home-hero-statement-duration': `${HOME_HERO_INTRO_TIMINGS.secondLineMs}ms`,
  '--home-hero-statement-delay': `${HOME_HERO_INTRO_TIMINGS.firstLineMs + HOME_HERO_INTRO_TIMINGS.linePauseMs}ms`,
  '--home-hero-statement-steps': Math.max(1, splitGraphemes(props.statement).length)
}))
</script>

<template>
  <div class="home-hero-typewriter" aria-hidden="true" :data-final-state="props.finalState" :style="typewriterStyle">
    <span class="home-hero-typewriter-line home-hero-typewriter-line-greeting">{{ props.greeting }}</span>
    <span class="home-hero-typewriter-line home-hero-typewriter-line-statement home-hero-typewriter-line-accent">
      {{ props.statement }}<span class="home-hero-cursor" aria-hidden="true">_</span>
    </span>
  </div>
</template>
