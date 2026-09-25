import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef } from 'vue'
import {
  HOME_HERO_INTRO_TIMINGS,
  getHomeHeroIntroState,
  shouldAnimateHomeHeroIntro,
  type HomeHeroIntroState
} from '../utils/homeHeroIntro'

type IntroState = 'static' | HomeHeroIntroState

const typingDurationMs = HOME_HERO_INTRO_TIMINGS.firstLineMs
  + HOME_HERO_INTRO_TIMINGS.linePauseMs
  + HOME_HERO_INTRO_TIMINGS.secondLineMs
const completeDurationMs = typingDurationMs + HOME_HERO_INTRO_TIMINGS.actionsMs

interface NetworkInformation extends EventTarget {
  saveData?: boolean
}

function getInitialMode() {
  if (typeof window === 'undefined') return false

  try {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: NetworkInformation }).connection?.saveData === true
    return shouldAnimateHomeHeroIntro({ reducedMotion, saveData })
  } catch {
    return false
  }
}

export function useHomeHeroIntro(greeting: ComputedRef<string>, statement: ComputedRef<string>) {
  const shouldAnimate = getInitialMode()
  const state = ref<IntroState>(shouldAnimate ? 'typing' : 'static')
  const animateParticles = ref(shouldAnimate)
  const isIntroActive = computed(() => state.value === 'typing' || state.value === 'revealing-actions')
  const introStartedAt = ref<number | null>(shouldAnimate ? window.performance.now() : null)
  const timers = new Set<number>()
  let motionPreference: MediaQueryList | null = null
  let connection: NetworkInformation | undefined

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer))
    timers.clear()
  }

  function schedule(callback: () => void, delay: number) {
    const timer = window.setTimeout(() => {
      timers.delete(timer)
      callback()
    }, delay)
    timers.add(timer)
  }

  function showFinalState() {
    clearTimers()
    introStartedAt.value = null
    animateParticles.value = false
    state.value = 'static'
  }

  function updateIntroState() {
    const startedAt = introStartedAt.value
    if (startedAt === null) return

    const elapsedMs = window.performance.now() - startedAt
    const nextState = getHomeHeroIntroState(elapsedMs)
    state.value = nextState

    const nextDeadlineMs = nextState === 'typing'
      ? typingDurationMs
      : nextState === 'revealing-actions'
        ? completeDurationMs
        : null

    if (nextDeadlineMs !== null) {
      schedule(updateIntroState, Math.max(0, nextDeadlineMs - elapsedMs))
    }
  }

  function startIntro() {
    const startedAt = introStartedAt.value
    if (startedAt === null) return

    const elapsedMs = window.performance.now() - startedAt
    schedule(updateIntroState, Math.max(0, typingDurationMs - elapsedMs))
  }

  function stopForMotionPreference() {
    if (motionPreference?.matches) showFinalState()
  }

  function stopForDataPreference() {
    if (connection?.saveData) showFinalState()
  }

  watch([greeting, statement], () => {
    if (state.value !== 'static') showFinalState()
  })

  onMounted(() => {
    if (!shouldAnimate) return

    motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
    if (motionPreference.matches || connection?.saveData) {
      showFinalState()
      return
    }

    motionPreference.addEventListener('change', stopForMotionPreference)
    connection?.addEventListener('change', stopForDataPreference)
    startIntro()
  })

  onBeforeUnmount(() => {
    clearTimers()
    motionPreference?.removeEventListener('change', stopForMotionPreference)
    connection?.removeEventListener('change', stopForDataPreference)
  })

  return { state, animateParticles, isIntroActive, introStartedAt }
}
