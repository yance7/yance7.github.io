import { ref } from 'vue'
import { THEME_COLORS } from '../themeColors'

type Theme = 'light' | 'dark'

const THEME_KEY = 'yance-theme'
const theme = ref<Theme>('light')
let systemMedia: MediaQueryList | null = null
let systemListenerAttached = false

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function setTheme(value: Theme) {
  theme.value = value
  document.documentElement.dataset.theme = value

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', value === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light)
}

function applyTheme(value: Theme) {
  try {
    localStorage.setItem(THEME_KEY, value)
  } catch { /* 隐私模式下静默失败 */ }

  setTheme(value)

}

function toggleTheme() {
  applyTheme(theme.value === 'light' ? 'dark' : 'light')
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
