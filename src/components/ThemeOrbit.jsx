import { useRef } from 'react'

export default function ThemeOrbit({ theme, onToggleTheme }) {
  const btn = useRef(null)
  return (
    <button
      ref={btn}
      className={`theme-orbit ${theme}`}
      type="button"
      aria-label={theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'}
      aria-pressed={theme === 'dark'}
      title="切换主题"
      onClick={() => onToggleTheme(btn.current)}
    >
      <span className="orbit-track" aria-hidden="true">
        <span className={`orbit-knob ${theme === 'dark' ? 'dark' : ''}`}></span>
        <span className="orbit-opt sun">☼</span>
        <span className="orbit-opt moon">☾</span>
      </span>
      <span className="orbit-label">{theme === 'light' ? '亮色' : '暗色'}</span>
    </button>
  )
}
