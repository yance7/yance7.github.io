import { ref } from 'vue'
import { THEME_COLORS } from '../themeColors'

type Theme = 'light' | 'dark'

const THEME_KEY = 'yance-theme'
const theme = ref<Theme>('light')
let systemMedia: MediaQueryList | null = null
let systemListenerAttached = false
let activeRipple: HTMLElement | null = null

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function setTheme(value: Theme) {
  theme.value = value
  document.documentElement.dataset.theme = value

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', value === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light)
}

function applyTheme(value: Theme, rippleEl: HTMLElement | null = null) {
  setTheme(value)

  try {
    localStorage.setItem(THEME_KEY, value)
  } catch { /* 隐私模式下静默失败 */ }

  if (
    rippleEl &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !window.matchMedia('(pointer: coarse)').matches
  ) {
    activeRipple?.remove()
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
    activeRipple = ripple
    requestAnimationFrame(() => ripple.classList.add('active'))
    window.setTimeout(() => {
      ripple.remove()
      if (activeRipple === ripple) activeRipple = null
    }, 800)
  }
}

function toggleTheme(rippleEl: HTMLElement | null = null) {
  applyTheme(theme.value === 'light' ? 'dark' : 'light', rippleEl)
}

function initTheme() {
  let saved: string | null = null
  try { saved = localStorage.getItem(THEME_KEY) } catch { /* ignore */ }
  const value: Theme = saved === 'dark' || saved === 'light' ? saved : systemTheme()
  setTheme(value)

  if (!systemMedia) systemMedia = window.matchMedia('(prefers-color-scheme: dark)')
  if (!saved && !systemListenerAttached) {
    const onSystemThemeChange = (event: MediaQueryListEvent) => {
      let currentSaved: string | null = null
      try { currentSaved = localStorage.getItem(THEME_KEY) } catch { /* ignore */ }
      if (currentSaved !== 'light' && currentSaved !== 'dark') {
        setTheme(event.matches ? 'dark' : 'light')
      }
    }
    if (systemMedia.addEventListener) systemMedia.addEventListener('change', onSystemThemeChange)
    else systemMedia.addListener(onSystemThemeChange)
    systemListenerAttached = true
  }
}

export function useTheme() {
  return { theme, applyTheme, toggleTheme, initTheme }
}
