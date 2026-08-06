import { useEffect } from 'react'

export function useSpotlight(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover)').matches) return

    const halo = document.createElement('span')
    halo.className = 'spotlight-halo'
    halo.setAttribute('aria-hidden', 'true')
    el.appendChild(halo)
    el.classList.add('spotlight')

    let raf = 0
    const move = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
        el.style.setProperty('--my', `${e.clientY - rect.top}px`)
      })
    }
    el.addEventListener('pointermove', move, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      halo.remove()
      el.classList.remove('spotlight')
    }
  }, [ref])
}
