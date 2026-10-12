const observers = new Set<() => void>()
let sentinel: HTMLSpanElement | undefined

function notifyPreference(event: TransitionEvent) {
  if (event.propertyName === 'width' || event.propertyName === 'height') {
    for (const notify of [...observers]) notify()
  }
}

export function observePointerMotion(onChange: () => void) {
  const notify = () => onChange()
  const queries = [
    window.matchMedia('(pointer: fine)'),
    window.matchMedia('(hover: hover)'),
    window.matchMedia('(prefers-reduced-motion: reduce)'),
    window.matchMedia('(forced-colors: active)')
  ]
  const allowed = () => queries[0]!.matches && queries[1]!.matches && !queries[2]!.matches && !queries[3]!.matches
  // A delayed transition from re-enabling motion must not erase fresh input.
  const notifyDisabled = () => { if (!allowed()) onChange() }
  for (const query of queries) query.addEventListener('change', notify)
  observers.add(notifyDisabled)
  if (!sentinel) {
    // CSS supplies a second path when media change notifications are missed.
    // One hidden CSS transition supplies a notification without idle polling.
    sentinel = document.createElement('span')
    sentinel.className = 'pointer-motion-preference-sentinel'
    sentinel.setAttribute('aria-hidden', 'true')
    sentinel.addEventListener('transitionend', notifyPreference)
    document.body.append(sentinel)
    sentinel.getBoundingClientRect()
  }
  let stopped = false
  return {
    allowed,
    stop: () => {
      if (stopped) return
      stopped = true
      for (const query of queries) query.removeEventListener('change', notify)
      observers.delete(notifyDisabled)
      if (!observers.size && sentinel) {
        sentinel.removeEventListener('transitionend', notifyPreference)
        sentinel.remove()
        sentinel = undefined
      }
    }
  }
}
