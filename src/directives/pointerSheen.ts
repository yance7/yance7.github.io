import type { Directive } from 'vue'

interface PointerSheenOptions {
  tilt?: number
}

const cleanups = new WeakMap<HTMLElement, () => void>()

function reset(element: HTMLElement) {
  element.style.setProperty('--pointer-x', '50%')
  element.style.setProperty('--pointer-y', '50%')
  element.style.removeProperty('--pointer-active')
  element.style.removeProperty('--rx')
  element.style.removeProperty('--ry')
}

const pointerSheen: Directive<HTMLElement, PointerSheenOptions | undefined> = {
  mounted(element, binding) {
    element.dataset.pointerSheen = ''
    reset(element)

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) return

    const tilt = Math.min(Math.max(binding.value?.tilt ?? 0, 0), 6)
    let frame = 0
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Keep the layout read and CSS writes in one frame so pointer bursts cannot force repeated layout.
        const bounds = element.getBoundingClientRect()
        const x = Math.min(Math.max(((event.clientX - bounds.left) / bounds.width) * 100, 0), 100)
        const y = Math.min(Math.max(((event.clientY - bounds.top) / bounds.height) * 100, 0), 100)
        element.style.setProperty('--pointer-x', `${x.toFixed(1)}%`)
        element.style.setProperty('--pointer-y', `${y.toFixed(1)}%`)
        element.style.setProperty('--pointer-active', '1')
        if (tilt > 0) {
          const horizontal = x / 100 - .5
          const vertical = y / 100 - .5
          element.style.setProperty('--rx', `${(-vertical * tilt).toFixed(2)}deg`)
          element.style.setProperty('--ry', `${(horizontal * tilt).toFixed(2)}deg`)
        }
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
