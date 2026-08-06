import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal.jsx'

function parseValue(value) {
  const match = String(value).match(/^(-?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return null
  return {
    num: parseFloat(match[1]),
    suffix: match[2],
    decimals: (match[1].split('.')[1] || '').length
  }
}

export default function MetricStrip({ metrics, large = false }) {
  const [displays, setDisplays] = useState(() => metrics.map((m) => String(m.value)))
  const cardRefs = useRef([])
  const raf = useRef(0)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    function animate(i) {
      const parsed = parseValue(metrics[i].value)
      if (!parsed) return
      const start = performance.now()
      const duration = 900
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplays((prev) => {
          const next = [...prev]
          next[i] = (parsed.num * eased).toFixed(parsed.decimals) + parsed.suffix
          return next
        })
        if (t < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    }

    const observers = metrics.map((m, i) => {
      const el = cardRefs.current[i]
      if (!el) return null
      const obs = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          animate(i)
          obs.disconnect()
        }
      }, { threshold: 0.3 })
      obs.observe(el)
      return obs
    }).filter(Boolean)

    return () => {
      cancelAnimationFrame(raf.current)
      observers.forEach((obs) => obs.disconnect())
    }
  }, [metrics])

  return (
    <div className={`metric-strip ${large ? 'large' : ''}`}>
      {metrics.map((m, i) => (
        <Reveal
          key={m.label}
          className="metric-card"
          innerRef={(el) => { cardRefs.current[i] = el }}
        >
          <b>{displays[i] ?? m.value}</b>
          <span>{m.label}</span>
          {m.note && <small>{m.note}</small>}
        </Reveal>
      ))}
    </div>
  )
}
