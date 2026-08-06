/* v-spotlight：卡片内光标跟随光晕（仅桌面悬停设备，尊重 reduced-motion） */
export default {
  mounted(el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover)').matches) return

    const halo = document.createElement('span')
    halo.className = 'spotlight-halo'
    halo.setAttribute('aria-hidden', 'true')
    el.appendChild(halo)
    const scan = document.createElement('span')
    scan.className = 'spotlight-scan'
    scan.setAttribute('aria-hidden', 'true')
    el.appendChild(scan)
    el.classList.add('spotlight')

    let raf = 0
    const move = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
        el.style.setProperty('--my', `${e.clientY - rect.top}px`)
      })
    }

    el.addEventListener('pointermove', move, { passive: true })
    el._spotlightCleanup = () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      halo.remove()
      scan.remove()
      el.classList.remove('spotlight')
    }
  },
  unmounted(el) {
    if (el._spotlightCleanup) el._spotlightCleanup()
  }
}
