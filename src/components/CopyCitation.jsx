import { useEffect, useRef, useState } from 'react'

export default function CopyCitation({ citation }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(citation)
      } else {
        const ta = document.createElement('textarea')
        ta.value = citation
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch { /* 复制失败时静默 */ }
  }

  return (
    <button
      className="tl-link copy-citation"
      type="button"
      aria-label={copied ? '已复制引用' : '复制引用'}
      onClick={copy}
    >
      {copied ? '已复制 ✓' : '复制引用'}
    </button>
  )
}
