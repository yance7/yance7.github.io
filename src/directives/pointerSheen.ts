import type { Directive } from 'vue'
import { getPointerSheenPosition, type PointerSheenBounds } from '../utils/pointerSheen'
import { observePointerMotion } from '../utils/pointerMotion'

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
    const properties = ['--pointer-x', '--pointer-y', '--pointer-active', '--rx', '--ry']
    const original = properties.map((property) => ({
      property,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property)
    }))
    const tilt = Math.min(Math.max(binding.value?.tilt ?? 0, 0), 6)
    const tiltExclude = binding.value?.tiltExclude
    let frame = 0
    let bounds: PointerSheenBounds | null = null
    const leave = () => {
      cancelAnimationFrame(frame)
      frame = 0
      bounds = null
      reset(element)
    }
    const motion = observePointerMotion(leave)
    const invalidateBounds = () => { bounds = null }
    const refreshBounds = () => { bounds = element.getBoundingClientRect() }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !motion.allowed() || element.closest(':disabled, [aria-disabled="true"], [inert]')) return leave()
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!motion.allowed()) return leave()
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
    const enter = () => refreshBounds()

    element.addEventListener('pointerenter', enter, { passive: true })
    element.addEventListener('pointermove', move, { passive: true })
    element.addEventListener('pointerleave', leave)
    element.addEventListener('pointercancel', leave)
    window.addEventListener('resize', leave, { passive: true })
    window.addEventListener('scroll', invalidateBounds, { passive: true, capture: true })
    window.addEventListener('blur', leave)
    window.addEventListener('pagehide', leave)
    document.addEventListener('keydown', leave, true)
    cleanups.set(element, () => {
      cancelAnimationFrame(frame)
      motion.stop()
      element.removeEventListener('pointerenter', enter)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', leave)
      element.removeEventListener('pointercancel', leave)
      window.removeEventListener('resize', leave)
      window.removeEventListener('scroll', invalidateBounds, true)
      window.removeEventListener('blur', leave)
      window.removeEventListener('pagehide', leave)
      document.removeEventListener('keydown', leave, true)
      bounds = null
      for (const { property, value, priority } of original) {
        if (value) element.style.setProperty(property, value, priority)
        else element.style.removeProperty(property)
      }
    })
  },
  unmounted(element) {
    cleanups.get(element)?.()
    cleanups.delete(element)
    delete element.dataset.pointerSheen
  }
}

export default pointerSheen
