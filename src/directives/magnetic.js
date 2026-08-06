/* v-magnetic：按钮向光标轻微吸附，移开回弹（仅桌面悬停设备，尊重 reduced-motion） */
export default {
  mounted(el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover)').matches) return

    const strength = 5
    let raf = 0
    const move = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
        const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
        el.style.translate = `${(x * strength).toFixed(1)}px ${(y * strength).toFixed(1)}px`
      })
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      el.style.translate = '0px 0px'
    }
    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerleave', leave)
    el._magneticCleanup = () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.style.translate = ''
    }
  },
  unmounted(el) {
    if (el._magneticCleanup) el._magneticCleanup()
  }
}
