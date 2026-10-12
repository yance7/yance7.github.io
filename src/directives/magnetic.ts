import type { Directive, DirectiveBinding } from 'vue'
import { observePointerMotion } from '../utils/pointerMotion'

type MagneticValue = number | { strength?: number }

const cleanups = new WeakMap<HTMLElement, () => void>()

function getStrength(binding: DirectiveBinding<MagneticValue>) {
  const value = typeof binding.value === 'number' ? binding.value : binding.value?.strength
  return Math.max(0, Math.min(4, value ?? 3))
}

const magnetic: Directive<HTMLElement, MagneticValue> = {
  mounted(el, binding) {
    const visual = el.querySelector<HTMLElement>('[data-magnetic-visual]')
    if (!visual) return
    const original = { translate: visual.style.translate, willChange: visual.style.willChange }
    const strength = getStrength(binding)
    let frame = 0

    const reset = () => {
      cancelAnimationFrame(frame)
      frame = 0
      visual.style.translate = original.translate
      visual.style.willChange = original.willChange
    }
    const motion = observePointerMotion(reset)
    const disabled = () => Boolean(el.closest(':disabled, [aria-disabled="true"], [inert]'))

    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !motion.allowed() || disabled()) return reset()
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!motion.allowed() || disabled()) return reset()
        // The visual moves inside a stable semantic root and hit area.
        const rect = el.getBoundingClientRect()
        const x = (event.clientX - rect.left - rect.width / 2) / Math.max(1, rect.width / 2)
        const y = (event.clientY - rect.top - rect.height / 2) / Math.max(1, rect.height / 2)
        const limit = Math.max(1, Math.hypot(x, y))
        visual.style.willChange = 'translate'
        visual.style.translate = `${(x / limit * strength).toFixed(2)}px ${(y / limit * strength).toFixed(2)}px`
      })
    }

    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerleave', reset)
    el.addEventListener('pointercancel', reset)
    const observer = new MutationObserver(() => { if (disabled()) reset() })
    observer.observe(el, { attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'inert'] })
    window.addEventListener('resize', reset, { passive: true })
    window.addEventListener('scroll', reset, { passive: true, capture: true })
    window.addEventListener('blur', reset)
    window.addEventListener('pagehide', reset)
    document.addEventListener('keydown', reset, true)

    cleanups.set(el, () => {
      reset()
      motion.stop()
      observer.disconnect()
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', reset)
      el.removeEventListener('pointercancel', reset)
      window.removeEventListener('resize', reset)
      window.removeEventListener('scroll', reset, true)
      window.removeEventListener('blur', reset)
      window.removeEventListener('pagehide', reset)
      document.removeEventListener('keydown', reset, true)
    })
  },
  unmounted(el) {
    cleanups.get(el)?.()
    cleanups.delete(el)
  }
}

export default magnetic
