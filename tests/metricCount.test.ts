import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeMetricProgress, formatAnimatedMetric } from '../src/utils/metricCount'

describe('metric count stability', () => {
  it('clamps progress into [0, 1] and stays monotonically non-decreasing across jittered frames', () => {
    let progress = computeMetricProgress(1000, 980, 950, 0)
    expect(progress).toBe(0)

    progress = computeMetricProgress(1000, 1475, 950, progress)
    expect(progress).toBeCloseTo(0.5, 6)

    // A retrograde timestamp never rewinds the count.
    progress = computeMetricProgress(1000, 1200, 950, progress)
    expect(progress).toBeCloseTo(0.5, 6)

    progress = computeMetricProgress(1000, 2500, 950, progress)
    expect(progress).toBe(1)
  })

  it('preserves formatted decimals, + suffixes, and non-negative bounds', () => {
    expect(formatAnimatedMetric(-30, 1560, 0, '')).toBe('0')
    expect(formatAnimatedMetric(-0, 4, 1, '')).toBe('0.0')
    expect(formatAnimatedMetric(3.96, 4, 1, '')).toBe('4.0')
    expect(formatAnimatedMetric(1800, 1560, 0, '')).toBe('1560')
    expect(formatAnimatedMetric(19.2, 14, 0, '+')).toBe('14+')
  })

  it('keeps the static entry fallback timer active even after entry import starts', () => {
    const bootstrap = readFileSync(resolve(process.cwd(), 'public/ssg-bootstrap.js'), 'utf8')
    const strip = readFileSync(resolve(process.cwd(), 'src/components/MetricStrip.vue'), 'utf8')

    expect(bootstrap).toContain('takeoverCompleted')
    expect(bootstrap).toMatch(/const startEntry\s*=\s*\(\)\s*=>\s*\{[\s\S]*?import\(entryUrl\.href\)/u)
    expect(bootstrap).not.toMatch(/const startEntry[\s\S]*?clearTimeout\(fallbackTimer\)/u)
    expect(strip).toContain("document.body.dataset.rendered === 'ssg'")
    expect(strip).toContain('staticEntryFallback')
  })
})
