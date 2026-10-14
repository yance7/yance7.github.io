const observers = new Set<() => void>()
let sentinel: HTMLSpanElement | undefined
let preferenceObserver: ResizeObserver | undefined
const activeObservers = new Map<() => void, () => void>()
let activeFrame = 0
const queryNames = ['(pointer: fine)', '(hover: hover)', '(prefers-reduced-motion: reduce)', '(forced-colors: active)']

function pointerMotionAllowed() {
  return window.matchMedia(queryNames[0]!).matches && window.matchMedia(queryNames[1]!).matches
    && !window.matchMedia(queryNames[2]!).matches && !window.matchMedia(queryNames[3]!).matches
}

function checkActiveEffects() {
  activeFrame = 0
  if (!pointerMotionAllowed()) for (const notify of [...activeObservers.values()]) notify()
  if (activeObservers.size && !activeFrame) activeFrame = requestAnimationFrame(checkActiveEffects)
}

function updateActiveFrame() {
  if (activeObservers.size) {
    if (!activeFrame) activeFrame = requestAnimationFrame(checkActiveEffects)
  } else if (activeFrame) {
    cancelAnimationFrame(activeFrame)
    activeFrame = 0
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
    // Only effects that currently own visible inline state need frame checks.
    // Native MQL and ResizeObserver notifications can both arrive late in WebKit.
    setActive: (active: boolean) => {
      if (stopped) return
      if (active) activeObservers.set(notifyDisabled, onChange)
      else activeObservers.delete(notifyDisabled)
      updateActiveFrame()
    },
    stop: () => {
      if (stopped) return
      stopped = true
      for (const query of queries) query.removeEventListener('change', notifyDisabled)
      observers.delete(notifyDisabled)
      activeObservers.delete(notifyDisabled)
      updateActiveFrame()
      if (!observers.size && sentinel) {
        preferenceObserver?.disconnect()
        preferenceObserver = undefined
        sentinel.remove()
        sentinel = undefined
      }
    }
  }
}
