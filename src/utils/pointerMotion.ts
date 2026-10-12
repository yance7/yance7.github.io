export function observePointerMotion(onChange: () => void) {
  const queries = [
    window.matchMedia('(pointer: fine)'),
    window.matchMedia('(hover: hover)'),
    window.matchMedia('(prefers-reduced-motion: reduce)'),
    window.matchMedia('(forced-colors: active)')
  ]
  for (const query of queries) query.addEventListener('change', onChange)
  return {
    allowed: () => queries[0]!.matches && queries[1]!.matches && !queries[2]!.matches && !queries[3]!.matches,
    stop: () => {
      for (const query of queries) query.removeEventListener('change', onChange)
    }
  }
}
