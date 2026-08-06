import { useEffect, useState } from 'react'

export default function SectionDots({ sections }) {
  const [active, setActive] = useState(sections[0]?.id || '')

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id)
      })
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 })
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [sections])

  function go(id) {
    const el = document.getElementById(id)
    if (!el) return
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    el.scrollIntoView({ behavior, block: 'start' })
  }

  return (
    <nav className="section-dots" aria-label="页面章节导航">
      {sections.map((s) => (
        <a
          key={s.id}
          className={`section-dot ${active === s.id ? 'active' : ''}`}
          href={`#${s.id}`}
          aria-label={s.label}
          onClick={(e) => { e.preventDefault(); go(s.id) }}
        >
          <i></i>
          <span className="section-dot-label">{s.label}</span>
        </a>
      ))}
    </nav>
  )
}
