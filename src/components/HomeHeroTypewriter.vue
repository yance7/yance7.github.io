<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { buildTypewriterLine } from '../utils/homeHeroIntro'
import { loadHomeGreetingFont } from '../utils/homeGreetingFont'

const props = defineProps<{
  greeting: string
  statement: string
}>()

const fontState = ref<'loading' | 'ready' | 'fallback'>('loading')
const finalState = ref(false)
const greetingTimeline = computed(() => buildTypewriterLine(props.greeting))
const statementTimeline = computed(() => buildTypewriterLine(props.statement))
// Both lines are readable from the first frame; the hero only rises into place.
const greetingRevealed = ref(greetingTimeline.value.graphemes.length)
const statementRevealed = ref(statementTimeline.value.graphemes.length)
let disposed = false

onMounted(() => {
  finalState.value = true
  void loadHomeGreetingFont(`${props.greeting} ${props.statement}`).then(state => {
    if (!disposed) fontState.value = state
  })
})

onBeforeUnmount(() => { disposed = true })
</script>

<template>
  <div
    class="home-hero-typewriter"
    aria-hidden="true"
    :data-font-state="fontState"
    :data-final-state="finalState"
    :data-greeting-revealed="greetingRevealed"
    :data-statement-revealed="statementRevealed"
  >
    <span class="home-hero-typewriter-line home-hero-typewriter-line-greeting"><span
      v-for="(glyph, index) in greetingTimeline.graphemes"
      :key="`g-${index}`"
      class="home-hero-typewriter-glyph"
      :class="{ 'is-revealed': index < greetingRevealed }"
    >{{ glyph }}</span></span>
    <span class="home-hero-typewriter-line home-hero-typewriter-line-statement home-hero-typewriter-line-accent">
      <span class="home-hero-typewriter-copy"><span
        v-for="(glyph, index) in statementTimeline.graphemes"
        :key="`s-${index}`"
        class="home-hero-typewriter-glyph"
        :class="{ 'is-revealed': index < statementRevealed }"
      >{{ glyph }}</span></span><span class="home-hero-cursor" aria-hidden="true">_</span>
    </span>
  </div>
</template>
