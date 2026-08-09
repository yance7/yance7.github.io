import type { Directive, DirectiveBinding } from 'vue'

type MagneticValue = number | { strength?: number }

const cleanups = new WeakMap<HTMLElement, () => void>()

function getStrength(binding: DirectiveBinding<MagneticValue>) {
  const value = typeof binding.value === 'number' ? binding.value : binding.value?.strength
  return Math.max(0, Math.min(12, value ?? 5))
}

const magnetic: Directive<HTMLElement, MagneticValue> = {
  mounted(el, binding) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const strength = getStrength(binding)
    let frame = 0

    const reset = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.translate = '0 0'
        el.style.willChange = ''
      })
    }

    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2)
        const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2)
        el.style.willChange = 'translate'
        el.style.translate = `${(x * strength).toFixed(1)}px ${(y * strength).toFixed(1)}px`
      })
    }

    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerleave', reset)
    el.addEventListener('pointercancel', reset)

    cleanups.set(el, () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', reset)
      el.removeEventListener('pointercancel', reset)
      el.style.translate = ''
      el.style.willChange = ''
    })
  },
  unmounted(el) {
    cleanups.get(el)?.()
    cleanups.delete(el)
  }
}

export default magnetic
