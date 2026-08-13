import type { Directive } from 'vue'

const cleanups = new WeakMap<HTMLElement, () => void>()

function reset(element: HTMLElement) {
  element.style.setProperty('--pointer-x', '50%')
  element.style.setProperty('--pointer-y', '50%')
  element.style.removeProperty('--pointer-active')
}

const pointerSheen: Directive<HTMLElement> = {
  mounted(element) {
    element.dataset.pointerSheen = ''
    reset(element)

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) return

    let frame = 0
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const bounds = element.getBoundingClientRect()
        const x = Math.min(Math.max(((event.clientX - bounds.left) / bounds.width) * 100, 0), 100)
        const y = Math.min(Math.max(((event.clientY - bounds.top) / bounds.height) * 100, 0), 100)
        element.style.setProperty('--pointer-x', `${x.toFixed(1)}%`)
        element.style.setProperty('--pointer-y', `${y.toFixed(1)}%`)
        element.style.setProperty('--pointer-active', '1')
      })
    }
    const leave = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => reset(element))
    }

    element.addEventListener('pointermove', move, { passive: true })
    element.addEventListener('pointerleave', leave)
    element.addEventListener('pointercancel', leave)
    cleanups.set(element, () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', leave)
      element.removeEventListener('pointercancel', leave)
      reset(element)
    })
  },
  unmounted(element) {
    cleanups.get(element)?.()
    cleanups.delete(element)
    delete element.dataset.pointerSheen
  }
}

export default pointerSheen
