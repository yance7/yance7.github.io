import type { Directive } from 'vue'
import { getPointerSheenPosition, type PointerSheenBounds } from '../utils/pointerSheen'

interface PointerSheenOptions {
  tilt?: number
  tiltExclude?: string
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
    const tiltExclude = binding.value?.tiltExclude
    let frame = 0
    let bounds: PointerSheenBounds | null = null
    const invalidateBounds = () => { bounds = null }
    const refreshBounds = () => { bounds = element.getBoundingClientRect() }
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!bounds) refreshBounds()
        const { x, y } = getPointerSheenPosition(bounds!, event.clientX, event.clientY)
        element.style.setProperty('--pointer-x', `${x.toFixed(1)}%`)
        element.style.setProperty('--pointer-y', `${y.toFixed(1)}%`)
        element.style.setProperty('--pointer-active', '1')
        const tiltExcluded = tiltExclude
          && event.target instanceof Element
          && event.target.closest(tiltExclude)
        if (tilt > 0 && !tiltExcluded) {
          const horizontal = x / 100 - .5
          const vertical = y / 100 - .5
          element.style.setProperty('--rx', `${(-vertical * tilt).toFixed(2)}deg`)
          element.style.setProperty('--ry', `${(horizontal * tilt).toFixed(2)}deg`)
        } else {
          element.style.removeProperty('--rx')
          element.style.removeProperty('--ry')
        }
      })
    }
    const leave = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => reset(element))
    }
    const enter = () => refreshBounds()

    element.addEventListener('pointerenter', enter, { passive: true })
    element.addEventListener('pointermove', move, { passive: true })
    element.addEventListener('pointerleave', leave)
    element.addEventListener('pointercancel', leave)
    window.addEventListener('resize', invalidateBounds, { passive: true })
    window.addEventListener('scroll', invalidateBounds, { passive: true })
    cleanups.set(element, () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('pointerenter', enter)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', leave)
      element.removeEventListener('pointercancel', leave)
      window.removeEventListener('resize', invalidateBounds)
      window.removeEventListener('scroll', invalidateBounds)
      bounds = null
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
