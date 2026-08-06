import { useEffect, useState } from 'react'
import { navItems } from '../data/content'
import ThemeOrbit from './ThemeOrbit.jsx'

export default function SiteHeader({ page, theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <header className={`site-nav ${menuOpen ? 'menu-open' : ''}`}>
        <a className="wordmark" href="index.html">Yance<span>.</span></a>

        <button
          className="menu-trigger"
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? '关闭导航' : '打开导航'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <i></i><i></i><i></i>
        </button>

        <nav className={`nav-rail ${menuOpen ? 'open' : ''}`} aria-label="主导航">
          {navItems.map((item, i) => (
            <a
              key={item.key}
              href={item.href}
              className={page === item.key ? 'active' : ''}
              aria-current={page === item.key ? 'page' : undefined}
              style={{ '--di': i }}
              onClick={() => setMenuOpen(false)}
            >
              <small className="nav-num">0{i + 1}</small>
              <span className="nav-text">
                <span className="nav-label">{item.label}</span>
                <small className="nav-en">{item.en}</small>
              </span>
              <small className="nav-desc">{item.desc}</small>
            </a>
          ))}
        </nav>

        <ThemeOrbit theme={theme} onToggleTheme={onToggleTheme} />

        <div className="nav-status"><b></b><span>ONLINE / 2026</span></div>
      </header>

      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false) }}
        >
          <nav className="mobile-menu" aria-label="移动端导航">
            {navItems.map((item, i) => (
              <a
                key={item.key}
                href={item.href}
                className={page === item.key ? 'active' : ''}
                style={{ '--di': i }}
                onClick={() => setMenuOpen(false)}
              >
                <small className="mm-num">0{i + 1}</small>
                <span className="mm-label">{item.label}</span>
                <small className="mm-en">{item.en}</small>
                <span className="mm-desc">{item.desc}</span>
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
