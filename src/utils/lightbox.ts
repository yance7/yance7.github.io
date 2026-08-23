export function clampLightboxIndex(index: number, total: number) {
  const max = Math.max(total - 1, 0)
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.trunc(index), 0), max)
}
