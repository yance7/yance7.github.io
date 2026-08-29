import { computed, getCurrentInstance, onUnmounted, ref } from 'vue'

export type PageCompassMode = 'closed' | 'transient' | 'pinned' | 'suppressed'

const PAGE_COMPASS_OPEN_INTENT_MS = 110
const PAGE_COMPASS_CLOSE_GRACE_MS = 170

type DisclosureOptions = {
  openIntentMs?: number
  closeGraceMs?: number
}

function isHoverCapablePointer(event: Pick<PointerEvent, 'pointerType'>) {
  if (event.pointerType === 'touch') return false
  if (event.pointerType === 'mouse') return true
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover)').matches
}

export function usePageCompassDisclosure(options: DisclosureOptions = {}) {
  const openIntentMs = options.openIntentMs ?? PAGE_COMPASS_OPEN_INTENT_MS
  const closeGraceMs = options.closeGraceMs ?? PAGE_COMPASS_CLOSE_GRACE_MS
  const mode = ref<PageCompassMode>('closed')
  const pointerInside = ref(false)
  const focusInside = ref(false)
  const isExpanded = computed(() => mode.value === 'transient' || mode.value === 'pinned')

  let openTimer: ReturnType<typeof setTimeout> | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null
  let pointerActivationPending = false

  function clearOpenTimer() {
    if (openTimer === null) return
    clearTimeout(openTimer)
    openTimer = null
  }

  function clearCloseTimer() {
    if (closeTimer === null) return
    clearTimeout(closeTimer)
    closeTimer = null
  }

  function clearTimers() {
    clearOpenTimer()
    clearCloseTimer()
  }

  function scheduleOpen() {
    clearOpenTimer()
    openTimer = setTimeout(() => {
      openTimer = null
      if (mode.value === 'closed' && pointerInside.value && !focusInside.value) {
        mode.value = 'transient'
      }
    }, openIntentMs)
  }

  function scheduleClose() {
    clearCloseTimer()
    closeTimer = setTimeout(() => {
      closeTimer = null
      if (mode.value === 'transient' && !pointerInside.value && !focusInside.value) {
        mode.value = 'closed'
      }
    }, closeGraceMs)
  }

  function handlePointerEnter(event: PointerEvent) {
    pointerInside.value = true
    clearCloseTimer()
    if (mode.value !== 'closed' || !isHoverCapablePointer(event)) return
    scheduleOpen()
  }

  function handlePointerLeave() {
    pointerInside.value = false
    clearOpenTimer()
    if (!focusInside.value) pointerActivationPending = false
    if (mode.value === 'transient' && !focusInside.value) scheduleClose()
    if (mode.value === 'suppressed' && !focusInside.value) closeCompass()
  }

  function handleFocusIn() {
    const wasPointerActivation = pointerActivationPending
    pointerActivationPending = false
    focusInside.value = true
    clearTimers()
    if (mode.value === 'closed' && !wasPointerActivation) mode.value = 'transient'
  }

  function handleFocusOut(nextFocusInside: boolean, hasRelatedTarget: boolean) {
    focusInside.value = nextFocusInside
    if (nextFocusInside) return
    clearOpenTimer()
    if (mode.value === 'suppressed') {
      if (hasRelatedTarget) closeCompass()
      return
    }
    if (mode.value === 'transient' && !pointerInside.value) closeCompass()
  }

  function handleTriggerClick() {
    pointerActivationPending = false
    clearTimers()
    mode.value = mode.value === 'pinned' ? 'closed' : 'pinned'
  }

  function handleTriggerPointerDown() {
    pointerActivationPending = true
    clearTimers()
  }

  function closeCompass() {
    clearTimers()
    mode.value = 'closed'
  }

  function suppressCompass() {
    clearTimers()
    mode.value = 'suppressed'
  }

  function dispose() {
    pointerActivationPending = false
    clearTimers()
  }

  if (getCurrentInstance()) onUnmounted(dispose)

  return {
    mode,
    pointerInside,
    focusInside,
    isExpanded,
    openIntentMs,
    closeGraceMs,
    handlePointerEnter,
    handlePointerLeave,
    handleFocusIn,
    handleFocusOut,
    handleTriggerPointerDown,
    handleTriggerClick,
    closeCompass,
    suppressCompass,
    dispose
  }
}
