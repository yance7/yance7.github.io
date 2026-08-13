export function clampScrollProgress(value: number) {
  return Math.min(Math.max(value, 0), 1)
}
