export type FontReadinessObservation = {
  state: 'ready' | 'fallback' | 'timeout'
  observedAt: number
  deadline: number
}

// Serialized into the browser by page.evaluate; keep browser dependencies local.
export function startFontReadinessObservation(deadline: number): { result: Promise<FontReadinessObservation> } {
  // A non-Promise holder acknowledges synchronous observer installation. It
  // also retains an in-window witness while the protocol reply is delayed.
  const result = new Promise<FontReadinessObservation>((resolve, reject) => {
    let observer: MutationObserver | undefined
    let timer: number | undefined
    let settled = false
    const cleanup = () => {
      settled = true
      observer?.disconnect()
      if (timer !== undefined) clearTimeout(timer)
    }
    const finish = (state: FontReadinessObservation['state'], observedAt: number) => {
      cleanup()
      resolve({ state, observedAt, deadline })
    }
    const check = () => {
      if (settled) return
      try {
        const state = document.documentElement.dataset.fontsReady
        const observedAt = Date.now()
        if (observedAt > deadline) finish('timeout', observedAt)
        else if (state === 'ready' || state === 'fallback') finish(state, observedAt)
        else if (observedAt === deadline) finish('timeout', observedAt)
        else {
          if (timer !== undefined) clearTimeout(timer)
          timer = window.setTimeout(check, deadline - observedAt)
        }
      } catch (error) {
        cleanup()
        reject(error)
      }
    }
    try {
      observer = new MutationObserver(check)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-fonts-ready'] })
      check()
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
  return { result }
}
