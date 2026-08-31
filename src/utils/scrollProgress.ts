export function clampScrollProgress(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

export function getScrollProgress(scrollTop: number, scrollHeight: number, viewportHeight: number) {
  const safeScrollHeight = Math.max(0, finiteOr(scrollHeight, 0))
  const safeViewportHeight = Math.max(0, finiteOr(viewportHeight, 0))
  const scrollRange = safeScrollHeight - safeViewportHeight
  if (scrollRange <= 0) return 0

  return clampScrollProgress(finiteOr(scrollTop, 0) / scrollRange)
}
