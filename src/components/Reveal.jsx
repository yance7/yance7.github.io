import { useEffect, useRef } from 'react'

export default function Reveal({
  as: Tag = 'div',
  delay = 0,
  variant = 'fade-up',
  className = '',
  innerRef = null,
  children,
  ...rest
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('revealed')
      return
    }
    if (delay) el.style.transitionDelay = `${delay}ms`
    el.dataset.revealVariant = variant
    el.classList.add('reveal')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          obs.unobserve(entry.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay, variant])

  function setRef(el) {
    ref.current = el
    if (typeof innerRef === 'function') innerRef(el)
    else if (innerRef) innerRef.current = el
  }

  return (
    <Tag ref={setRef} className={className} {...rest}>
      {children}
    </Tag>
  )
}
