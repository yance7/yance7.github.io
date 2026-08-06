import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const glow = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover)').matches) return

    let raf = 0
    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (glow.current) {
          glow.current.style.setProperty('--cg-x', `${e.clientX}px`)
          glow.current.style.setProperty('--cg-y', `${e.clientY}px`)
        }
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <div ref={glow} className="cursor-glow" aria-hidden="true"></div>
}
