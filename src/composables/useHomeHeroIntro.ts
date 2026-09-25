import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef } from 'vue'
import {
  HOME_HERO_INTRO_TIMINGS,
  shouldAnimateHomeHeroIntro
} from '../utils/homeHeroIntro'

type IntroState = 'static' | 'typing' | 'revealing-actions' | 'complete'

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
    animateParticles.value = false
    state.value = 'static'
  }

  function startIntro() {
    schedule(() => {
      state.value = 'revealing-actions'
      schedule(() => { state.value = 'complete' }, HOME_HERO_INTRO_TIMINGS.actionsMs)
    }, HOME_HERO_INTRO_TIMINGS.firstLineMs + HOME_HERO_INTRO_TIMINGS.linePauseMs + HOME_HERO_INTRO_TIMINGS.secondLineMs)
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

  return { state, animateParticles, isIntroActive }
}
