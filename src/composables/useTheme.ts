import { getCurrentInstance, inject, ref, type InjectionKey, type Ref } from 'vue'
import { THEME_COLORS } from '../themeColors'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Ref<Theme>
  applyTheme: (value: Theme) => void
  toggleTheme: () => void
  initTheme: () => void
}

export const themeStateKey: InjectionKey<ThemeState> = Symbol('theme-state')

export function createThemeState(initial: Theme = 'light'): ThemeState {
  const theme = ref<Theme>(initial)
  let systemMedia: MediaQueryList | null = null
  let systemListener: ((event: MediaQueryListEvent) => void) | null = null
  let themeApplyTimer: number | null = null
  let themeTransitionFrame: number | null = null

  function systemTheme(): Theme {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  function setTheme(value: Theme) {
    theme.value = value
    applyThemeDocument(value)
  }

  function applyThemeDocument(value: Theme) {
    document.documentElement.dataset.theme = value

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', value === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light)
  }

  function deferThemeTransitionRestore() {
    if (themeTransitionFrame !== null) window.cancelAnimationFrame(themeTransitionFrame)
    themeTransitionFrame = window.requestAnimationFrame(() => {
      themeTransitionFrame = window.requestAnimationFrame(() => {
        themeTransitionFrame = null
        delete document.documentElement.dataset.themeChanging
      })
    })
  }

  function applyTheme(value: Theme) {
    document.documentElement.dataset.themeSource = 'user'
    try {
      localStorage.setItem('yance-theme', value)
    } catch { /* 隐私模式下静默失败 */ }

    theme.value = value
    if (themeApplyTimer !== null) window.clearTimeout(themeApplyTimer)
    document.documentElement.dataset.themeChanging = 'true'
    themeApplyTimer = window.setTimeout(() => {
      themeApplyTimer = null
      applyThemeDocument(value)
      deferThemeTransitionRestore()
    }, 0)
  }

  function toggleTheme() {
    applyTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function initTheme() {
    let saved: string | null = null
    try { saved = localStorage.getItem('yance-theme') } catch { /* ignore */ }
    // When storage is unavailable, keep the theme already chosen on this page
    // (boot script or an early toggle) instead of snapping back to the system theme.
    const documentTheme = document.documentElement.dataset.theme
    const preselected: Theme | null = documentTheme === 'dark' || documentTheme === 'light' ? documentTheme : null
    const userSelected = document.documentElement.dataset.themeSource === 'user'
    const savedTheme: Theme | null = saved === 'dark' || saved === 'light' ? saved : null
    const value: Theme = userSelected
      ? (preselected ?? systemTheme())
      : (savedTheme ?? systemTheme())
    setTheme(value)

    if (!systemMedia) systemMedia = window.matchMedia('(prefers-color-scheme: dark)')
    if (!userSelected && !savedTheme && !systemListener) {
      systemListener = (event) => {
        // A theme the reader picked on this page always wins over later system changes.
        if (document.documentElement.dataset.themeSource === 'user') return
        let currentSaved: string | null = null
        try { currentSaved = localStorage.getItem('yance-theme') } catch { /* ignore */ }
        if (currentSaved !== 'light' && currentSaved !== 'dark') {
          setTheme(event.matches ? 'dark' : 'light')
        }
      }
      if (systemMedia.addEventListener) systemMedia.addEventListener('change', systemListener)
      else systemMedia.addListener(systemListener)
    }
  }

  return { theme, applyTheme, toggleTheme, initTheme }
}

const fallbackThemeState = createThemeState()

export function useTheme() {
  return getCurrentInstance() ? inject(themeStateKey, fallbackThemeState) : fallbackThemeState
}
