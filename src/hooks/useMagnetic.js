import { useEffect } from 'react'

export function useMagnetic(ref, strength = 5) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover)').matches) return

    let raf = 0
    const move = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
        const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
        el.style.translate = `${(x * strength).toFixed(1)}px ${(y * strength).toFixed(1)}px`
      })
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      el.style.translate = '0px 0px'
    }
    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerleave', leave)

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.style.translate = ''
    }
  }, [ref, strength])
}
