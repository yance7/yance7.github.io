import { ref } from 'vue'

const THEME_KEY = 'yance-theme'
const theme = ref('light')

function applyTheme(value, rippleEl) {
  theme.value = value
  document.documentElement.dataset.theme = value

  try {
    localStorage.setItem(THEME_KEY, value)
  } catch (e) { /* 隐私模式下静默失败 */ }

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', value === 'dark' ? '#0A0D12' : '#F3F0E8')

  /* 主题切换环境光扩散动画 */
  if (rippleEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    ripple.style.left = cx + 'px'
    ripple.style.top = cy + 'px'
    ripple.style.width = ripple.style.height = (maxDim * 2.4) + 'px'
    document.body.appendChild(ripple)
    requestAnimationFrame(() => ripple.classList.add('active'))
    setTimeout(() => ripple.remove(), 1100)
  }
}

function toggleTheme(rippleEl) {
  applyTheme(theme.value === 'light' ? 'dark' : 'light', rippleEl)
}

function initTheme() {
  let saved = 'light'
  try { saved = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light' } catch (e) { /* ignore */ }
  theme.value = saved
  document.documentElement.dataset.theme = saved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', saved === 'dark' ? '#0A0D12' : '#F3F0E8')
}

export function useTheme() {
  return { theme, applyTheme, toggleTheme, initTheme }
}
