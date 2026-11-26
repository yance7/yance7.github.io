/**
 * Compute normalized, monotonically non-decreasing animation progress in [0, 1]
 * anchored on a consistent frame clock timestamp.
 */
export function computeMetricProgress(
  startTime: number,
  frameTime: number,
  durationMs: number,
  previousProgress = 0
): number {
  const safePrevious = Number.isFinite(previousProgress)
    ? Math.min(1, Math.max(0, previousProgress))
    : 0
  if (!Number.isFinite(frameTime) || !Number.isFinite(startTime) || durationMs <= 0) return 1
  const elapsed = Math.max(0, frameTime - startTime)
  const clamped = Math.min(1, Math.max(0, elapsed / durationMs))
  return Math.max(safePrevious, clamped)
}

/**
 * Format an interpolated metric value clamped within [0, target] (or [target, 0])
 * while preserving the decimal precision, suffix, and sign stability.
 */
export function formatAnimatedMetric(
  value: number,
  target: number,
  decimals: number,
  suffix: string
): string {
  const min = Math.min(0, target)
  const max = Math.max(0, target)
  const bounded = Math.min(max, Math.max(min, value))
  const normalized = Object.is(bounded, -0) || bounded === 0 ? 0 : bounded
  return `${normalized.toFixed(decimals)}${suffix}`
}
