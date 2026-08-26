import { clampScrollProgress } from './scrollProgress'

export interface CompassSectionCandidate {
  id: string
  index: number
  top: number
  isIntersecting: boolean
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

export function formatCompassIndex(index: number, total: number) {
  const safeTotal = Math.max(0, Math.floor(finiteOr(total, 0)))
  if (safeTotal === 0) return '00 / 00'

  const safeIndex = Math.min(Math.max(0, Math.floor(finiteOr(index, 0))), safeTotal - 1)
  return `${String(safeIndex + 1).padStart(2, '0')} / ${String(safeTotal).padStart(2, '0')}`
}

export function chooseActiveSection(
  candidates: readonly CompassSectionCandidate[],
  anchorY: number,
  fallbackId: string
) {
  const visible = candidates.filter((candidate) => candidate.isIntersecting)
  if (!visible.length) return fallbackId

  const anchor = finiteOr(anchorY, 0)
  return visible.reduce((best, candidate) => {
    const bestDistance = Math.abs(finiteOr(best.top, anchor) - anchor)
    const candidateDistance = Math.abs(finiteOr(candidate.top, anchor) - anchor)
    if (candidateDistance < bestDistance) return candidate
    if (candidateDistance === bestDistance && candidate.index < best.index) return candidate
    return best
  }).id
}
