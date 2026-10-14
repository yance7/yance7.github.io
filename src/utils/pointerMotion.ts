const observers = new Set<() => void>()
let sentinel: HTMLSpanElement | undefined
let preferenceObserver: ResizeObserver | undefined
const activeObservers = new Map<() => void, () => void>()
const supportObservers = new Map<() => void, () => void>()
let activeTimer: ReturnType<typeof setTimeout> | undefined
let timerDelay = 0
let lastSupportAllowed: boolean | undefined
let pageHidden = false
const queryNames = ['(pointer: fine)', '(hover: hover)', '(prefers-reduced-motion: reduce)', '(forced-colors: active)']

function pointerMotionAllowed() {
  return window.matchMedia(queryNames[0]!).matches && window.matchMedia(queryNames[1]!).matches
    && !window.matchMedia(queryNames[2]!).matches && !window.matchMedia(queryNames[3]!).matches
}

function checkActiveEffects() {
  if (activeTimer !== undefined) clearTimeout(activeTimer)
  activeTimer = undefined
  timerDelay = 0
  const allowed = pointerMotionAllowed()
  const changed = allowed !== lastSupportAllowed
  lastSupportAllowed = allowed
  const notifications = new Set<() => void>()
  if (!allowed) for (const notify of activeObservers.values()) notifications.add(notify)
  if (changed) for (const notify of supportObservers.values()) notifications.add(notify)
  for (const notify of notifications) notify()
  updateActiveTimer()
}

function updateActiveTimer() {
  // Visible inline effects need prompt cleanup. Idle support subscribers need
  // both capability transitions even when native events and rendering stall.
  const delay = pageHidden || document.hidden ? 0 : activeObservers.size ? 100 : supportObservers.size ? 500 : 0
  if (activeTimer !== undefined && delay !== timerDelay) {
    clearTimeout(activeTimer)
    activeTimer = undefined
    timerDelay = 0
  }
  if (delay && activeTimer === undefined) {
    timerDelay = delay
    activeTimer = setTimeout(checkActiveEffects, delay)
  }
}

function notifyPreference() {
  lastSupportAllowed = pointerMotionAllowed()
  for (const notify of [...observers]) notify()
  updateActiveTimer()
}

function handleVisibilityChange() {
  checkActiveEffects()
}

function handlePageHide() {
  pageHidden = true
  updateActiveTimer()
}

function handlePageShow() {
  pageHidden = false
  checkActiveEffects()
}

export function observePointerMotion(onChange: () => void, options: { notifyWhenAllowed?: boolean } = {}) {
  const queries = queryNames.map(query => window.matchMedia(query))
  // Held MQL objects supply notifications; fresh queries supply current state.
  const allowed = pointerMotionAllowed
  // Initial or delayed notifications must not erase input after re-enabling.
  const notifyDisabled = () => {
    if (options.notifyWhenAllowed || !allowed()) onChange()
  }
  for (const query of queries) query.addEventListener('change', notifyPreference)
  observers.add(notifyDisabled)
  if (options.notifyWhenAllowed) supportObservers.set(notifyDisabled, onChange)
  if (!sentinel) {
    // Observe CSS preference changes independently of MQL event delivery.
    // Native notifications remain the primary path; the shared fallback below
    // also observes support restoration independently of rendering callbacks.
    sentinel = document.createElement('span')
    sentinel.className = 'pointer-motion-preference-sentinel'
    sentinel.setAttribute('aria-hidden', 'true')
    document.body.append(sentinel)
    pageHidden = false
    lastSupportAllowed = allowed()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)
    if (typeof ResizeObserver === 'function') {
      preferenceObserver = new ResizeObserver(notifyPreference)
      preferenceObserver.observe(sentinel)
    }
  }
  updateActiveTimer()
  let stopped = false
  return {
    allowed,
    // Only effects that currently own visible inline state need checks. A frame
    // can stop arriving together with native preference notifications in WebKit.
    setActive: (active: boolean) => {
      if (stopped) return
      if (active) activeObservers.set(notifyDisabled, onChange)
      else activeObservers.delete(notifyDisabled)
      updateActiveTimer()
    },
    stop: () => {
      if (stopped) return
      stopped = true
      for (const query of queries) query.removeEventListener('change', notifyPreference)
      observers.delete(notifyDisabled)
      activeObservers.delete(notifyDisabled)
      supportObservers.delete(notifyDisabled)
      updateActiveTimer()
      if (!observers.size && sentinel) {
        preferenceObserver?.disconnect()
        preferenceObserver = undefined
        sentinel.remove()
        sentinel = undefined
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('pagehide', handlePageHide)
        window.removeEventListener('pageshow', handlePageShow)
        lastSupportAllowed = undefined
        pageHidden = false
      }
    }
  }
}
