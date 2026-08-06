import { useEffect, useRef, useState } from 'react'

const TEXT = '$ whoami → Yance · 高中生 · 研究者 · 产品制造者'

function formatTime() {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date())
  const get = (type) => parts.find((p) => p.type === type)?.value || '00'
  return `BEIJING ${get('hour')}:${get('minute')}:${get('second')}`
}

export default function TerminalStatus() {
  const [typed, setTyped] = useState('')
  const [time, setTime] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    setTime(formatTime())
    const clock = setInterval(() => setTime(formatTime()), 1000)

    let typeTimer = 0
    let started = false
    const startType = () => {
      if (started) return
      started = true
      let i = 0
      typeTimer = setInterval(() => {
        i += 1
        setTyped(TEXT.slice(0, i))
        if (i >= TEXT.length) clearInterval(typeTimer)
      }, 38)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(TEXT)
    } else if ('IntersectionObserver' in window && rootRef.current) {
      const obs = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startType()
          obs.disconnect()
        }
      }, { threshold: 0.4 })
      obs.observe(rootRef.current)
    } else {
      startType()
    }

    return () => {
      clearInterval(clock)
      clearInterval(typeTimer)
    }
  }, [])

  return (
    <div ref={rootRef} className="terminal-status" aria-label="系统状态">
      <span className="term-line">{typed}<b className="term-caret" aria-hidden="true"></b></span>
      <span className="term-time">{time}</span>
    </div>
  )
}
