import TerminalStatus from './TerminalStatus.jsx'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="foot-brand">
        <span className="foot-mark">© 2026 YANCE.</span>
        <span className="foot-tag">RESEARCHER / BUILDER / MUSIC LISTENER</span>
      </div>
      <TerminalStatus />
      <div className="foot-links">
        <a href="https://github.com/yance7" target="_blank" rel="noopener">GITHUB ↗</a>
        <a href="mailto:yance777@outlook.com">CONTACT ↗</a>
      </div>
    </footer>
  )
}
