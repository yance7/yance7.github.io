import { ref } from 'vue'

const THEME_KEY = 'yance-theme'
const theme = ref('light')

function applyTheme(value) {
  theme.value = value
  document.documentElement.dataset.theme = value
  try {
    localStorage.setItem(THEME_KEY, value)
  } catch (e) { /* 隐私模式下静默失败 */ }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', value === 'dark' ? '#0A0D12' : '#F3F0E8')
}

function toggleTheme() {
  applyTheme(theme.value === 'light' ? 'dark' : 'light')
}

function initTheme() {
  let saved = 'light'
  try { saved = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light' } catch (e) { /* ignore */ }
  applyTheme(saved)
}

export function useTheme() {
  return { theme, applyTheme, toggleTheme, initTheme }
}
