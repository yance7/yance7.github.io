const observers = new Set<() => void>()
let sentinel: HTMLSpanElement | undefined
let preferenceObserver: ResizeObserver | undefined
const activeObservers = new Map<() => void, () => void>()
const supportObservers = new Map<() => void, () => void>()
let activeTimer: ReturnType<typeof setTimeout> | undefined
const queryNames = ['(pointer: fine)', '(hover: hover)', '(prefers-reduced-motion: reduce)', '(forced-colors: active)']

function pointerMotionAllowed() {
  return window.matchMedia(queryNames[0]!).matches && window.matchMedia(queryNames[1]!).matches
    && !window.matchMedia(queryNames[2]!).matches && !window.matchMedia(queryNames[3]!).matches
}

function checkActiveEffects() {
  activeTimer = undefined
  if (!pointerMotionAllowed()) {
    const disabled = new Set([...activeObservers.values(), ...supportObservers.values()])
    for (const notify of disabled) notify()
  }
  if (activeObservers.size && activeTimer === undefined) activeTimer = setTimeout(checkActiveEffects, 100)
}

function updateActiveTimer() {
  if (activeObservers.size) {
    if (activeTimer === undefined) activeTimer = setTimeout(checkActiveEffects, 100)
  } else if (activeTimer !== undefined) {
    clearTimeout(activeTimer)
    activeTimer = undefined
  }
}

function notifyPreference() {
  for (const notify of [...observers]) notify()
}

export function observePointerMotion(onChange: () => void, options: { notifyWhenAllowed?: boolean } = {}) {
  const queries = queryNames.map(query => window.matchMedia(query))
  // Held MQL objects supply notifications; fresh queries supply current state.
  const allowed = pointerMotionAllowed
  // Initial or delayed notifications must not erase input after re-enabling.
  const notifyDisabled = () => { if (options.notifyWhenAllowed || !allowed()) onChange() }
  for (const query of queries) query.addEventListener('change', notifyDisabled)
  observers.add(notifyDisabled)
  if (options.notifyWhenAllowed) supportObservers.set(notifyDisabled, onChange)
  if (!sentinel) {
    // Observe CSS preference changes independently of MQL event delivery.
    // The shared observer needs neither transitions nor idle polling.
    sentinel = document.createElement('span')
    sentinel.className = 'pointer-motion-preference-sentinel'
    sentinel.setAttribute('aria-hidden', 'true')
    document.body.append(sentinel)
    if (typeof ResizeObserver === 'function') {
      preferenceObserver = new ResizeObserver(notifyPreference)
      preferenceObserver.observe(sentinel)
    }
  }
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
      for (const query of queries) query.removeEventListener('change', notifyDisabled)
      observers.delete(notifyDisabled)
      activeObservers.delete(notifyDisabled)
      supportObservers.delete(notifyDisabled)
      updateActiveTimer()
      if (!observers.size && sentinel) {
        preferenceObserver?.disconnect()
        preferenceObserver = undefined
        sentinel.remove()
        sentinel = undefined
      }
    }
  }
}
