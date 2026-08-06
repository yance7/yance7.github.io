import { useState, useCallback } from 'react'

const THEME_KEY = 'yance-theme'

function applyRipple(rippleEl) {
  if (!rippleEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = rippleEl.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const maxDim = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(window.innerWidth - cx, cy),
    Math.hypot(cx, window.innerHeight - cy),
    Math.hypot(window.innerWidth - cx, window.innerHeight - cy)
  )
  const ripple = document.createElement('div')
  ripple.className = 'theme-ripple'
  ripple.style.left = `${cx}px`
  ripple.style.top = `${cy}px`
  ripple.style.width = `${maxDim * 2.4}px`
  ripple.style.height = `${maxDim * 2.4}px`
  document.body.appendChild(ripple)
  requestAnimationFrame(() => ripple.classList.add('active'))
  setTimeout(() => ripple.remove(), 1100)
}

function syncDocument(value) {
  document.documentElement.dataset.theme = value
  try {
    localStorage.setItem(THEME_KEY, value)
  } catch { /* 隐私模式下静默失败 */ }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', value === 'dark' ? '#0A0D12' : '#F3F0E8')
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  const toggleTheme = useCallback((rippleEl) => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      syncDocument(next)
      applyRipple(rippleEl)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
